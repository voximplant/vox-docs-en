/**
 * Voximplant + Deepgram Voice Agent connector demo
 * Scenario: answer an incoming call and handle Deepgram function calling.
 */

require(Modules.Deepgram);
const SYSTEM_PROMPT = `
You are a helpful English-speaking voice assistant for phone callers.
Keep your turns short and telephony-friendly (usually 1–2 sentences).

If the caller asks about the weather, call the "get_weather" function.
`;

// -------------------- Deepgram Voice Agent settings --------------------
const SETTINGS_OPTIONS = {
    tags: ["voximplant", "deepgram", "voice_agent_connector", "function_calling_demo"],
    agent: {
        language: "en",
        greeting: "Hi! I'm Voxi. How can I help today?",
        listen: {
            provider: {
                type: "deepgram",
                model: "flux-general-en",
            },
        },
        think: {
            provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
            },
            prompt: SYSTEM_PROMPT,
            functions: [
                {
                    name: "get_weather",
                    description: "Get current weather for a location (demo stub)",
                    parameters: {
                        type: "object",
                        properties: {
                            location: {
                                type: "string",
                                description: "City name, for example: San Francisco",
                            },
                        },
                        required: ["location"],
                    },
                    // Mark as client-side so VoxEngine receives FunctionCallRequest and can respond.
                    client_side: true,
                },
            ],
        },
        speak: {
            provider: {
                type: "deepgram",
                model: "aura-2-cordelia-en",
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    try {
        call.answer();
        // call.record({hd_audio: true, stereo: true}); // optional: call recording

        // Create client and wire media
        voiceAIClient = await Deepgram.createVoiceAgentClient({
            apiKey: VoxEngine.getSecretValue('DEEPGRAM_API_KEY'),
            settingsOptions: SETTINGS_OPTIONS,
        });
        VoxEngine.sendMediaBetween(call, voiceAIClient);

        // ---------------------- Event handlers -----------------------
        // Barge-in: keep conversation responsive
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.UserStartedSpeaking, () => {
            Logger.write("===BARGE-IN: Deepgram.VoiceAgentEvents.UserStartedSpeaking===");
            voiceAIClient.clearMediaBuffer();
        });

        // Function calling: handle tool requests and send back responses
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.FunctionCallRequest, (event) => {
            const {functions} = event?.data?.payload || {};
            if (!Array.isArray(functions) || functions.length === 0) return;

            functions.forEach((fn) => {
                const {id, name, arguments: rawArguments} = fn || {};
                if (!id || !name) return;

                if (name !== "get_weather") {
                    voiceAIClient.sendFunctionCallResponse({
                        type: "FunctionCallResponse",
                        id,
                        name,
                        content: JSON.stringify({error: `Unhandled function: ${name}`}),
                    });
                    return;
                }

                let args = {};
                try {
                    args = rawArguments ? JSON.parse(rawArguments) : {};
                } catch (error) {
                    Logger.write(`===FUNCTION_ARGS_PARSE_ERROR=== ${rawArguments}`);
                    Logger.write(error);
                }

                const location = args.location || "Unknown";

                // Demo response (no external API call)
                const result = {
                    location,
                    temperature_f: 72,
                    condition: "sunny",
                };

                voiceAIClient.sendFunctionCallResponse({
                    type: "FunctionCallResponse",
                    id,
                    name,
                    content: JSON.stringify(result),
                });
            });
        });

    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        VoxEngine.terminate();
    }
});
