require(Modules.QwenCloud);

const QWEN_MODEL = "qwen-audio-3.1-realtime-plus";
const SYSTEM_PROMPT = `
  You are Voxi, a concise phone agent for Voximplant callers.
  Voximplant is pronounced VOX-im-plant.
  Reply in English. Keep answers brief and helpful.
  If you do not know, say so and offer to connect them to a human.
`;

const SESSION_PARAMETERS = {
    session: {
        modalities: ["text", "audio"],
        voice: "beth_v3.1",
        instructions: SYSTEM_PROMPT,
        input_audio_transcription: {language: "en"},
        output_audio: {language: "en"},
        turn_detection: {type: "server_vad"},
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    const terminate = (event) => {
        if (event) Logger.write(JSON.stringify(event));
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    call.answer();
    // call.record({hd_audio: true, stereo: true});

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
                        text: "The call just connected. Greet the caller in one short sentence.",
                    }],
                },
            });
            voiceAIClient.responseCreate({});
        });

        voiceAIClient.addEventListener(QwenCloud.VoiceAgentAPIEvents.InputAudioBufferSpeechStarted, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.clearMediaBuffer();
        });

        [
            QwenCloud.Events.WebSocketMediaStarted,
            QwenCloud.Events.WebSocketMediaEnded,
            QwenCloud.VoiceAgentAPIEvents.ConnectorInformation,
            QwenCloud.VoiceAgentAPIEvents.ResponseCreated,
            QwenCloud.VoiceAgentAPIEvents.ResponseOutputItemAdded,
            QwenCloud.VoiceAgentAPIEvents.ResponseOutputItemDone,
            QwenCloud.VoiceAgentAPIEvents.ResponseAudioTranscriptDelta,
            QwenCloud.VoiceAgentAPIEvents.ResponseAudioTranscriptDone,
            QwenCloud.VoiceAgentAPIEvents.ResponseAudioDone,
            QwenCloud.VoiceAgentAPIEvents.ResponseDone,
            QwenCloud.VoiceAgentAPIEvents.InputAudioBufferSpeechStopped,
            QwenCloud.VoiceAgentAPIEvents.InputAudioBufferCommitted,
            QwenCloud.VoiceAgentAPIEvents.ConversationItemCreated,
            QwenCloud.VoiceAgentAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            QwenCloud.VoiceAgentAPIEvents.Error,
            QwenCloud.VoiceAgentAPIEvents.WebSocketError,
            QwenCloud.VoiceAgentAPIEvents.Unknown,
        ].forEach((evtName) => {
            voiceAIClient.addEventListener(evtName, (e) => {
                Logger.write(`===${e.name}===>${JSON.stringify(e)}`);
            });
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(JSON.stringify(error));
        VoxEngine.terminate();
    }
});
