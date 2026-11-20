/**
 * Voximplant + Gemini Live API connector demo
 * Scenario: real-time speech-to-speech translation (English -> Spanish).
 */

require(Modules.Gemini);
require(Modules.ApplicationStorage);

const SYSTEM_INSTRUCTIONS = `
You are a REAL-TIME INTERPRETER.

Task:
- Translate everything you hear from English to Spanish.

Rules:
- Output ONLY the Spanish translation (no English, no explanations, no extra commentary).
- Preserve meaning, tone, names, numbers, and proper nouns.
- Keep latency low: translate phrase-by-phrase as soon as you have enough context.
- Do NOT greet or introduce yourself. Speak ONLY when the caller speaks.
`;

const GEMINI_MODEL = "gemini-3.8-live";

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let calleeCall;
    let terminated = false;

    const terminate = () => {
        if (terminated) return;
        terminated = true;
        calleeCall?.hangup();
        call?.hangup();
        VoxEngine.terminate();
    };

    call.answer();
    call.record({hd_audio: true, stereo: true});
    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    const geminiApiKey = VoxEngine.getSecretValue('GEMINI_API_KEY');

    const calleeDestination = (await ApplicationStorage.get("CALLEE_DESTINATION")).value;
    calleeCall = VoxEngine.callPSTN(calleeDestination, (await ApplicationStorage.get("PSTN_CALLER_ID")).value);
    // Or call via an app user, SIP, or WhatsApp by uncommenting one of the lines below and commenting out the line above.
    // calleeCall = VoxEngine.callUser(calleeDestination);
    // calleeCall = VoxEngine.callSIP(`sip:${calleeDestination}@your-sip-domain`, (await ApplicationStorage.get("PSTN_CALLER_ID")).value);
    // calleeCall = VoxEngine.callWhatsappUser({number: calleeDestination, callerid: (await ApplicationStorage.get("PSTN_CALLER_ID")).value)});
    calleeCall.addEventListener(CallEvents.Disconnected, terminate);
    calleeCall.addEventListener(CallEvents.Failed, terminate);

    calleeCall.addEventListener(CallEvents.Connected, async () => {
        calleeCall.record({hd_audio: true, stereo: true});

        // Optional prompts to make the demo obvious on recordings.
        call.say("Connected. Speak in English. The other party will hear Spanish.");
        calleeCall.say("Connected. You will hear Spanish translation in real time.");

        const GEMINI_CONNECT_CONFIG = {
            responseModalities: ["AUDIO"],
            realtimeInputConfig: {
                automaticActivityDetection: {
                    disabled: false,
                    prefixPaddingMs: 20,
                    silenceDurationMs: 200,
                },
            },
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {voiceName: "Achird"},
                },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
                parts: [{text: SYSTEM_INSTRUCTIONS}],
            },
        };

        try {
            voiceAIClient = await Gemini.createLiveAPIClient({
                apiKey: geminiApiKey,
                model: GEMINI_MODEL,
                backend: Gemini.Backend.GEMINI_API,
                connectConfig: GEMINI_CONNECT_CONFIG,
                onWebSocketClose: (event) => {
                    Logger.write("===Gemini.WebSocket.Close===");
                    if (event) Logger.write(JSON.stringify(event));
                    terminate();
                },
            });

            // Caller (English) -> Gemini -> Callee (Spanish)
            call.sendMediaTo(voiceAIClient);
            voiceAIClient.sendMediaTo(calleeCall);

            voiceAIClient.addEventListener(Gemini.LiveAPIEvents.SetupComplete, (event) => {
                Logger.write("===Gemini.LiveAPIEvents.SetupComplete===");
                if (event?.data) Logger.write(JSON.stringify(event.data));
                voiceAIClient.sendRealtimeInput({
                    text: "Start real-time English to Spanish interpretation now. Do not greet. Only translate the caller's speech for the other party.",
                });
            });

            voiceAIClient.addEventListener(Gemini.LiveAPIEvents.ServerContent, (event) => {
                const payload = event?.data?.payload || {};
                if (payload.inputTranscription?.text) {
                    Logger.write(`===EN=== ${payload.inputTranscription.text}`);
                }
                if (payload.outputTranscription?.text) {
                    Logger.write(`===ES=== ${payload.outputTranscription.text}`);
                }
                if (payload.interrupted !== undefined) {
                    Logger.write("===BARGE-IN=== Gemini.LiveAPIEvents.ServerContent");
                    voiceAIClient.clearMediaBuffer();
                }
            });

            [
                Gemini.LiveAPIEvents.SetupComplete,
                Gemini.LiveAPIEvents.ServerContent,
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
            Logger.write(error);
            terminate();
        }
    });
});
