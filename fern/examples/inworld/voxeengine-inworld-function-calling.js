/**
 * Voximplant + Inworld Realtime API demo
 * Scenario: answer an incoming call and handle Inworld function calls.
 *
 * Configure this in the Voximplant application:
 * - Secret `INWORLD_API_KEY` (Voximplant Secrets)
 */

require(Modules.Inworld);

const WEATHER_TOOL = "get_weather";
const HANGUP_TOOL = "hang_up";

const SYSTEM_PROMPT = `
You are Voxi, a Voximplant developer advocate on a live phone call.
Voximplant is pronounced VOX-im-plant.
Keep answers short and natural.

If the caller asks about weather, call get_weather.
If the caller wants to end the call, call hang_up without speaking first.
After the hang_up tool result is returned, say a brief goodbye.
When you call a tool, do not speak before the tool result is available.

Voice style:
- Sound like an expressive product expert, not a flat IVR.
- Use short, human turns.
- Use at most one TTS-2 non-verbal tag per turn, and often none: [laugh], [breathe], [sigh], [clear throat].
- Use at most one [speak ...] steering tag per turn. If used, it must be first.
`;

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        model: "claude-sonnet-4-6",
        instructions: SYSTEM_PROMPT,
        output_modalities: ["audio", "text"],
        audio: {
            input: {
                transcription: {
                    model: "inworld/inworld-stt-1",
                    prompt: "Important terms: Voximplant, VoxEngine, Inworld, weather, San Francisco.",
                },
                turn_detection: {
                    type: "semantic_vad",
                    eagerness: "high",
                    create_response: true,
                    interrupt_response: true,
                },
            },
            output: {
                voice: "Ashley",
                model: "inworld-tts-2",
            },
        },
        providerData: {
            tts: {
                delivery_mode: "BALANCED",
            },
        },
        tools: [
            {
                type: "function",
                name: WEATHER_TOOL,
                description: "Get current weather for a location.",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "City name, for example San Francisco.",
                        },
                    },
                    required: ["location"],
                },
            },
            {
                type: "function",
                name: HANGUP_TOOL,
                description: "Hang up the current call.",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
        ],
        tool_choice: "auto",
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let pendingHangup = false;
    const functionCallsByItemId = {};

    // Helper to clean-up the call when done
    const terminate = (event) => {
        if (event) Logger.write(JSON.stringify(event));
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    // Termination handlers.
    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        call.answer();

        voiceAIClient = await Inworld.createRealtimeAPIClient({
            apiKey:  VoxEngine.getSecretValue("INWORLD_API_KEY"),
            sessionKey: `inworld-tools-${Date.now()}`,
            onWebSocketClose: terminate,
        });

        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionCreated, () => {
            Logger.write("===Inworld.SessionCreated===");
            voiceAIClient.sessionUpdate(SESSION_CONFIG);
        });

        // Once the session is configured, bridge call media and trigger the greeting.
        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionUpdated, () => {
            Logger.write("===Inworld.SessionUpdated===");
            // Bridge media between the call and Inworld Realtime.
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.conversationItemCreate({
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: "The phone call just connected. Say only: Hi, this is Voxi. I can check the weather.",
                        },
                    ],
                },
            });
            voiceAIClient.responseCreate({
                response: {
                    output_modalities: ["audio", "text"],
                },
            });
        });

        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: Inworld.InputAudioBufferSpeechStarted===");
            voiceAIClient.outputAudioBufferClear({});
        });

        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.ResponseOutputItemAdded, (event) => {
            const payload = event?.data?.payload || event?.data || {};
            const item = payload.item;
            if (item?.type !== "function_call") return;

            functionCallsByItemId[item.id] = {
                name: item.name,
                call_id: item.call_id,
            };
        });

        voiceAIClient.addEventListener(
            Inworld.RealtimeAPIEvents.ResponseFunctionCallArgumentsDone,
            (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const {item_id: itemId, arguments: rawArgs} = payload;
                const functionCall = functionCallsByItemId[itemId];
                const toolName = functionCall?.name;
                const toolCallId = functionCall?.call_id;

                if (!toolName || !toolCallId) {
                    Logger.write("===TOOL_CALL_MISSING_FIELDS===");
                    Logger.write(JSON.stringify({payload, functionCall}));
                    return;
                }

                let args = {};
                if (typeof rawArgs === "string") {
                    if (rawArgs.trim()) {
                        try {
                            args = JSON.parse(rawArgs);
                        } catch (error) {
                            Logger.write("===TOOL_ARGS_PARSE_ERROR===");
                            Logger.write(rawArgs);
                            Logger.write(error);
                        }
                    }
                } else if (rawArgs && typeof rawArgs === "object") {
                    args = rawArgs;
                }

                Logger.write("===TOOL_CALL_RECEIVED===");
                Logger.write(JSON.stringify({toolName, args}));

                if (toolName === WEATHER_TOOL) {
                    const location = args.location || "San Francisco";
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
                    Logger.write("===TOOL_RESPONSE_SENT===");
                    Logger.write(JSON.stringify(result));
                    voiceAIClient.responseCreate({
                        response: {
                            output_modalities: ["audio", "text"],
                        },
                    });
                    return;
                }

                if (toolName === HANGUP_TOOL) {
                    pendingHangup = true;
                    const result = {
                        status: "ready_to_end_call",
                        instruction: "Say a brief goodbye now.",
                    };
                    voiceAIClient.conversationItemCreate({
                        item: {
                            type: "function_call_output",
                            call_id: toolCallId,
                            output: JSON.stringify(result),
                        },
                    });
                    Logger.write("===TOOL_RESPONSE_SENT===");
                    Logger.write(JSON.stringify(result));
                    voiceAIClient.responseCreate({
                        response: {
                            output_modalities: ["audio", "text"],
                        },
                    });
                    return;
                }

                const result = {error: `Unhandled tool: ${toolName}`};
                voiceAIClient.conversationItemCreate({
                    item: {
                        type: "function_call_output",
                        call_id: toolCallId,
                        output: JSON.stringify(result),
                    },
                });
                Logger.write("===TOOL_RESPONSE_SENT===");
                Logger.write(JSON.stringify(result));
                voiceAIClient.responseCreate({
                    response: {
                        output_modalities: ["audio", "text"],
                    },
                });
            },
        );

        // Let VoxEngine finish playing the goodbye audio before hanging up.
        voiceAIClient.addEventListener(Inworld.Events.WebSocketMediaEnded, () => {
            if (!pendingHangup) return;
            Logger.write("===HANGUP_AFTER_MEDIA_ENDED===");
            pendingHangup = false;
            call.hangup();
        });

        // Consolidated log-only handlers for lifecycle, audio, and error debugging.
        [
            Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionDelta,
            Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            Inworld.RealtimeAPIEvents.ResponseCreated,
            Inworld.RealtimeAPIEvents.ResponseDone,
            Inworld.RealtimeAPIEvents.ResponseFunctionCallArgumentsDelta,
            Inworld.RealtimeAPIEvents.ResponseOutputAudioDone,
            Inworld.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
            Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStopped,
            Inworld.RealtimeAPIEvents.InputAudioBufferCommitted,
            Inworld.RealtimeAPIEvents.InputAudioBufferCleared,
            Inworld.RealtimeAPIEvents.OutputAudioBufferStarted,
            Inworld.RealtimeAPIEvents.OutputAudioBufferStopped,
            Inworld.RealtimeAPIEvents.OutputAudioBufferCleared,
            Inworld.RealtimeAPIEvents.ConnectorInformation,
            Inworld.RealtimeAPIEvents.HTTPResponse,
            Inworld.RealtimeAPIEvents.Error,
            Inworld.RealtimeAPIEvents.WebSocketError,
            Inworld.RealtimeAPIEvents.Unknown,
            Inworld.Events.WebSocketMediaStarted,
            Inworld.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                if (event?.data) Logger.write(JSON.stringify(event.data));
            });
        });

    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        terminate(error instanceof Error ? {message: error.message, stack: error.stack} : {error: String(error)});
    }
});
