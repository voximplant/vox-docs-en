/**
 * Voximplant + OpenAI Realtime API connector demo
 * Scenario: answer an incoming call and handle OpenAI Realtime 2.1 function calls.
 */

require(Modules.OpenAI);

const SYSTEM_PROMPT = `
You are Voxi, a helpful phone assistant.
Keep responses short and telephony-friendly.
If the caller asks for weather, call get_weather.
If the caller wants to end the call, say a brief goodbye and call hang_up.
If the caller asks for a warm transfer, call warm_transfer with destination_number.
`;

const WEATHER_TOOL = "get_weather";
const HANGUP_TOOL = "hang_up";
const WARM_TRANSFER_TOOL = "warm_transfer";

const DEFAULT_TRANSFER_NUMBER = "+18889277255";
const DEFAULT_TRANSFER_DELAY_MS = 3000;
const DEFAULT_TRANSFER_GREETING =
    "Hi, this is Voxi. I'm warm transferring a caller. Please hold for a brief note, then I'll connect you.";

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        model: "gpt-realtime-2.1",
        instructions: SYSTEM_PROMPT,
        reasoning: {effort: "low"},
        output_modalities: ["audio"],
        audio: {
            input: {
                turn_detection: {type: "semantic_vad", interrupt_response: true},
            },
            output: {
                voice: "alloy",
            },
        },
        tools: [
            {
                type: "function",
                name: WEATHER_TOOL,
                description: "Get the weather for a given location",
                parameters: {
                    type: "object",
                    properties: {
                        location: {type: "string"},
                    },
                    required: ["location"],
                },
            },
            {
                type: "function",
                name: HANGUP_TOOL,
                description: "Hang up the call",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
            {
                type: "function",
                name: WARM_TRANSFER_TOOL,
                description: "Warm transfer the caller to a phone number",
                parameters: {
                    type: "object",
                    properties: {
                        destination_number: {type: "string"},
                        message: {type: "string"},
                        delay_ms: {type: "integer"},
                    },
                    required: [],
                },
            },
        ],
        tool_choice: "auto",
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let transferCall;
    let transferInProgress = false;
    let pendingHangup = false;

    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        const providerApiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");
        if (!providerApiKey) throw new Error("Set OPENAI_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: providerApiKey,
            model: "gpt-realtime-2.1",
            onWebSocketClose: (event) => {
                Logger.write("===OpenAI.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                VoxEngine.terminate();
            },
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionCreated, () => {
            voiceAIClient.sessionUpdate(SESSION_CONFIG);
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);    // media connected
            voiceAIClient.conversationItemCreate({              // request a greeting
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: "The phone call just connected. "
                                + 'Say exactly: "Hello! How can I help today?"',
                        },
                    ],
                },
            });
            voiceAIClient.responseCreate({});       // ask for the response now
        });

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted,
            () => {
                Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
                voiceAIClient.clearMediaBuffer();
            },
        );

        // Handle function calls
        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ResponseFunctionCallArgumentsDone,
            async (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const toolName = payload.name || payload.tool_name;
                const toolCallId = payload.call_id || payload.callId;
                const rawArgs = payload.arguments;

                if (!toolName || !toolCallId) {
                    Logger.write("===TOOL_CALL_MISSING_FIELDS===");
                    Logger.write(JSON.stringify(payload));
                    return;
                }

                let args = {};
                if (typeof rawArgs === "string") {
                    try {
                        args = JSON.parse(rawArgs);
                    } catch (error) {
                        Logger.write("===TOOL_ARGS_PARSE_ERROR===");
                        Logger.write(rawArgs);
                        Logger.write(JSON.stringify(error));
                    }
                } else if (rawArgs && typeof rawArgs === "object") {
                    args = rawArgs;
                }

                Logger.write("===TOOL_CALL_RECEIVED===");
                Logger.write(JSON.stringify({toolName, args}));

                if (toolName === WEATHER_TOOL) {
                    const location = args.location || "Unknown";
                    const result = {
                        location,
                        temperature_f: 72,
                        condition: "sunny",
                    };
                    voiceAIClient.conversationItemCreate({
                        item: {
                            type: "function_call_output",
                            call_id: toolCallId,
                            output: JSON.stringify(result),
                        },
                    });
                    voiceAIClient.responseCreate({});
                    return;
                }

                if (toolName === HANGUP_TOOL) {
                    pendingHangup = true;
                    voiceAIClient.conversationItemCreate({
                        item: {
                            type: "function_call_output",
                            call_id: toolCallId,
                            output: JSON.stringify({status: "hangup_scheduled"}),
                        },
                    });
                    voiceAIClient.responseCreate({});
                    return;
                }

                if (toolName === WARM_TRANSFER_TOOL) {
                    if (transferInProgress) {
                        voiceAIClient.conversationItemCreate({
                            item: {
                                type: "function_call_output",
                                call_id: toolCallId,
                                output: JSON.stringify({status: "transfer_already_in_progress"}),
                            },
                        });
                        voiceAIClient.responseCreate({});
                        return;
                    }

                    transferInProgress = true;

                    const destination =
                        args.destination_number ||
                        args.destination ||
                        args.phone_number ||
                        args.number ||
                        DEFAULT_TRANSFER_NUMBER;
                    const delayMs = Number.isFinite(args.delay_ms)
                        ? args.delay_ms
                        : DEFAULT_TRANSFER_DELAY_MS;
                    const message = args.message || DEFAULT_TRANSFER_GREETING;

                    try {
                        transferCall = VoxEngine.callPSTN(destination, call.callerid());
                        // transferCall = VoxEngine.callUser({username: destination, callerid: call.callerid()});
                        // transferCall = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, call.callerid());
                        // transferCall = VoxEngine.callWhatsappUser({number: destination, callerid: call.callerid()});

                        transferCall.addEventListener(CallEvents.Connected, () => {
                            Logger.write(`===WARM_TRANSFER_CONNECTED=== ${destination}`);
                            transferCall.say(message);

                            setTimeout(() => {
                                try {
                                    voiceAIClient.clearMediaBuffer();
                                    call.stopMediaTo(voiceAIClient);
                                    voiceAIClient.stopMediaTo(call);
                                    VoxEngine.sendMediaBetween(call, transferCall);
                                    voiceAIClient.close();
                                    Logger.write("===WARM_TRANSFER_BRIDGED===");
                                } catch (bridgeError) {
                                    Logger.write("===WARM_TRANSFER_BRIDGE_ERROR===");
                                    Logger.write(bridgeError);
                                }
                            }, delayMs);
                        });

                        transferCall.addEventListener(CallEvents.Failed, (event) => {
                            Logger.write("===WARM_TRANSFER_FAILED===");
                            Logger.write(JSON.stringify(event));
                            transferInProgress = false;
                        });

                        voiceAIClient.conversationItemCreate({
                            item: {
                                type: "function_call_output",
                                call_id: toolCallId,
                                output: JSON.stringify({
                                    status: "transfer_started",
                                    destination,
                                    delay_ms: delayMs,
                                }),
                            },
                        });
                        voiceAIClient.responseCreate({});
                    } catch (transferError) {
                        Logger.write("===WARM_TRANSFER_ERROR===");
                        Logger.write(transferError);
                        transferInProgress = false;
                        voiceAIClient.conversationItemCreate({
                            item: {
                                type: "function_call_output",
                                call_id: toolCallId,
                                output: JSON.stringify({error: "warm_transfer_failed"}),
                            },
                        });
                        voiceAIClient.responseCreate({});
                    }
                    return;
                }

                voiceAIClient.conversationItemCreate({
                    item: {
                        type: "function_call_output",
                        call_id: toolCallId,
                        output: JSON.stringify({error: `Unhandled tool: ${toolName}`}),
                    },
                });
                voiceAIClient.responseCreate({});
            },
        );

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.ResponseOutputAudioDone, () => {
            if (!pendingHangup) return;
            Logger.write("===HANGUP_AFTER_AGENT_AUDIO===");
            pendingHangup = false;
            call.hangup();
        });

        voiceAIClient.addEventListener(OpenAI.Events.WebSocketMediaEnded, () => {
            if (!pendingHangup) return;
            Logger.write("===HANGUP_AFTER_MEDIA_ENDED===");
            pendingHangup = false;
            call.hangup();
        });

        // Consolidated "log-only" handlers
        [
            OpenAI.RealtimeAPIEvents.ResponseCreated,
            OpenAI.RealtimeAPIEvents.ResponseDone,
            OpenAI.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
            OpenAI.RealtimeAPIEvents.ResponseFunctionCallArgumentsDelta,
            OpenAI.RealtimeAPIEvents.ConnectorInformation,
            OpenAI.RealtimeAPIEvents.HTTPResponse,
            OpenAI.RealtimeAPIEvents.WebSocketError,
            OpenAI.RealtimeAPIEvents.Unknown,
            OpenAI.Events.WebSocketMediaStarted,
            OpenAI.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                if (event?.data) Logger.write(JSON.stringify(event.data));
            });
        });
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(JSON.stringify(error));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
