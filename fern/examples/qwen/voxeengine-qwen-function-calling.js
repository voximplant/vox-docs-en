require(Modules.QwenCloud);

const QWEN_MODEL = "qwen-audio-3.1-realtime-plus";
const WEATHER_TOOL = "get_weather";
const HANGUP_TOOL = "hangup_call";
const SYSTEM_PROMPT = `
  You are Voxi, a concise phone agent for Voximplant callers.
  Voximplant is pronounced VOX-im-plant.
  Reply in English. Keep answers to one or two short sentences.

  If the caller asks about the weather, call get_weather. Do not guess.
  If the caller says goodbye, call hangup_call.
  After a tool result arrives, speak the result. For hangup_call, say a brief goodbye.
`;

const SESSION_PARAMETERS = {
    session: {
        modalities: ["text", "audio"],
        voice: "beth_v3.1",
        instructions: SYSTEM_PROMPT,
        input_audio_transcription: {language: "en"},
        output_audio: {language: "en"},
        turn_detection: {type: "server_vad"},
        tools: [
            {
                type: "function",
                function: {
                    name: WEATHER_TOOL,
                    description: "Get the current weather for a city.",
                    parameters: {
                        type: "object",
                        properties: {
                            city: {type: "string", description: "City name."},
                        },
                        required: ["city"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: HANGUP_TOOL,
                    description: "Hang up the current call.",
                },
            },
        ],
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let hangupCall = false;

    const terminate = (event) => {
        if (event) Logger.write(JSON.stringify(event));
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    call.answer();

    try {
        const providerApiKey = VoxEngine.getSecretValue("QWEN_API_KEY");
        if (!providerApiKey) throw new Error("Set QWEN_API_KEY in Voximplant Secrets");

        voiceAIClient = await QwenCloud.createVoiceAgentAPIClient({
            apiKey: providerApiKey,
            model: QWEN_MODEL,
            onWebSocketClose: terminate,
        });

        voiceAIClient.addEventListener(QwenCloud.VoiceAgentAPIEvents.SessionCreated, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.sessionUpdate(SESSION_PARAMETERS);
        });

        voiceAIClient.addEventListener(QwenCloud.VoiceAgentAPIEvents.SessionUpdated, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.conversationItemCreate({
                item: {
                    type: "message",
                    role: "user",
                    content: [{
                        type: "input_text",
                        text: "The call just connected. Say only: Hi, this is Voxi. I can check the weather.",
                    }],
                },
            });
            voiceAIClient.responseCreate({});
        });

        voiceAIClient.addEventListener(QwenCloud.VoiceAgentAPIEvents.InputAudioBufferSpeechStarted, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.clearMediaBuffer();
        });

        voiceAIClient.addEventListener(QwenCloud.VoiceAgentAPIEvents.ResponseFunctionCallArgumentsDone, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);

            const {name, call_id: callId, arguments: rawArgs} = event?.data?.payload || {};
            if (name !== WEATHER_TOOL && name !== HANGUP_TOOL) {
                Logger.write(`===Ignoring unhandled function call: ${name}===`);
                return;
            }

            let args = {};
            if (typeof rawArgs === "string" && rawArgs.trim()) {
                try {
                    args = JSON.parse(rawArgs);
                } catch (error) {
                    Logger.write("===TOOL_ARGS_PARSE_ERROR===");
                    Logger.write(rawArgs);
                    Logger.write(error);
                }
            }

            let output;
            if (name === WEATHER_TOOL) {
                const city = args.city || "San Francisco";
                output = {city, temperature_c: 18, condition: "sunny"};
            } else {
                hangupCall = true;
                output = {result: "Say a brief goodbye, then the call will end."};
            }

            voiceAIClient.conversationItemCreate({
                item: {
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(output),
                },
            });
            voiceAIClient.responseCreate({});
        });

        [
            QwenCloud.Events.WebSocketMediaStarted,
            QwenCloud.VoiceAgentAPIEvents.ResponseCreated,
            QwenCloud.VoiceAgentAPIEvents.ResponseOutputItemAdded,
            QwenCloud.VoiceAgentAPIEvents.ResponseOutputItemDone,
            QwenCloud.VoiceAgentAPIEvents.ResponseDone,
            QwenCloud.VoiceAgentAPIEvents.ResponseAudioTranscriptDone,
            QwenCloud.VoiceAgentAPIEvents.ConversationItemCreated,
            QwenCloud.VoiceAgentAPIEvents.Error,
            QwenCloud.VoiceAgentAPIEvents.WebSocketError,
            QwenCloud.VoiceAgentAPIEvents.Unknown,
        ].forEach((evtName) => {
            voiceAIClient.addEventListener(evtName, (e) => {
                Logger.write(`===${e.name}===>${JSON.stringify(e)}`);
            });
        });

        voiceAIClient.addEventListener(QwenCloud.Events.WebSocketMediaEnded, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            if (hangupCall) terminate();
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(JSON.stringify(error));
        VoxEngine.terminate();
    }
});
