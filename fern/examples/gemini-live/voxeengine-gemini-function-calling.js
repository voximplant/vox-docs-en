/**
 * Voximplant + Gemini Live API connector demo
 * Scenario: answer an incoming call and handle Gemini tool calls.
 */

require(Modules.Gemini);
const SYSTEM_INSTRUCTION = `
You are Voxi, a helpful voice assistant for phone callers.
Keep responses short and telephony-friendly (usually 1-2 sentences).
If the caller asks about the weather, call the get_weather tool.
If the caller wants to end the call, call the hangup_call tool.
`;

const CONNECT_CONFIG = {
    responseModalities: ["AUDIO"],
    systemInstruction: {
        parts: [{text: SYSTEM_INSTRUCTION}],
    },
    tools: [
        {
            functionDeclarations: [
                {
                    name: "get_weather",
                    description: "Get current weather for a location (demo stub)",
                    parametersJsonSchema: {
                        type: "object",
                        properties: {
                            location: {
                                type: "string",
                                description: "City name, for example: San Francisco",
                            },
                        },
                        required: ["location"],
                    },
                },
                {
                    name: "hangup_call",
                    description: "Hang up the current call",
                    parametersJsonSchema: {
                        type: "object",
                        properties: {},
                        required: [],
                    },
                },
            ],
        },
    ],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
    call.addEventListener(CallEvents.Failed, VoxEngine.terminate);

    try {
        const providerApiKey = VoxEngine.getSecretValue("GEMINI_API_KEY");
        if (!providerApiKey) throw new Error("Set GEMINI_API_KEY in Voximplant Secrets");

        call.answer();

        voiceAIClient = await Gemini.createLiveAPIClient({
            apiKey: providerApiKey,
            model: "gemini-3.8-live",
            backend: Gemini.Backend.GEMINI_API,
            connectConfig: CONNECT_CONFIG,
            onWebSocketClose: (event) => {
                Logger.write("===Gemini.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                VoxEngine.terminate();
            },
        });

        voiceAIClient.addEventListener(Gemini.LiveAPIEvents.SetupComplete, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.sendRealtimeInput({
                text: "Say hello and ask how you can help.",
            });
        });

        voiceAIClient.addEventListener(Gemini.LiveAPIEvents.ToolCall, (event) => {
            const functionCalls = event?.data?.payload?.functionCalls || [];
            if (!functionCalls.length) return;

            const responses = functionCalls.map((fn) => {
                const {id, name, args} = fn || {};
                if (!id || !name) return null;

                if (name === "get_weather") {
                    const location = args?.location || "Unknown";
                    return {
                        id,
                        name,
                        response: {
                            output: {
                                location,
                                temperature_f: 72,
                                condition: "sunny",
                            },
                        },
                    };
                }

                if (name === "hangup_call") {
                    // hang up after 5 seconds to allow message playback
                    setTimeout(()=>{
                        call.hangup();
                        VoxEngine.terminate();
                    }, 5_000);
                    return {
                        id,
                        name,
                        response: {
                            output: {
                                result: "Hanging up now. Goodbye!",
                            },
                        },
                    };
                }

                return {
                    id,
                    name,
                    response: {
                        error: `Unhandled tool: ${name}`,
                    },
                };
            }).filter(Boolean);

            if (responses.length) {
                voiceAIClient.sendToolResponse({
                    functionResponses: responses,
                });
            }
        });

        // handle barge-in
        voiceAIClient.addEventListener(Gemini.LiveAPIEvents.ServerContent, (event) => {
            const payload = event?.data?.payload || {};
            if (payload.interrupted) {
                Logger.write("===BARGE-IN=== Gemini.LiveAPIEvents.ServerContent");
                voiceAIClient.clearMediaBuffer();
            }
        });

        [
            Gemini.LiveAPIEvents.SetupComplete,
            Gemini.LiveAPIEvents.ServerContent,
            Gemini.LiveAPIEvents.ToolCall,
            Gemini.LiveAPIEvents.ToolCallCancellation,
            Gemini.LiveAPIEvents.ConnectorInformation,
            Gemini.LiveAPIEvents.Unknown,
            Gemini.Events.WebSocketMediaStarted,
            Gemini.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                if (event?.data) Logger.write(JSON.stringify(event.data));
            });
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(JSON.stringify(error));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
