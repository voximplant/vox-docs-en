/**
 * Voximplant + Gemini Live API connector demo
 * Scenario: answer an incoming call and bridge it to Gemini Live API.
 */

require(Modules.Gemini);
const SYSTEM_PROMPT = `You are Voxi, a helpful voice assistant for phone callers. 
Keep responses short and telephony-friendly (usually 1-2 sentences).`;

// -------------------- Gemini Live API settings --------------------
const CONNECT_CONFIG = {
    responseModalities: ["AUDIO"],
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {voiceName: "Aoede"},
        },
    },
    systemInstruction: {
        parts: [{text: SYSTEM_PROMPT}],
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    try {
        const providerApiKey = VoxEngine.getSecretValue("GEMINI_API_KEY");
        if (!providerApiKey) throw new Error("Set GEMINI_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({ hd_audio: true, stereo: true });   // Optional: record the call

        // Create client and connect to Gemini Live API
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

        // ---------------------- Event handlers -----------------------
        // Wait for Gemini setup, then bridge audio and trigger the greeting
        voiceAIClient.addEventListener(Gemini.LiveAPIEvents.SetupComplete, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.sendRealtimeInput({
                text: "Say hello and ask how you can help.",
            });
        });

        // Capture transcripts + handle barge-in
        voiceAIClient.addEventListener(Gemini.LiveAPIEvents.ServerContent, (event) => {
            const payload = event?.data?.payload || {};
            if (payload.inputTranscription?.text) {
                Logger.write(`===USER=== ${payload.inputTranscription.text}`);
            }
            if (payload.outputTranscription?.text) {
                Logger.write(`===AGENT=== ${payload.outputTranscription.text}`);
            }
            if (payload.interrupted) {
                Logger.write("===BARGE-IN=== Gemini.LiveAPIEvents.ServerContent");
                voiceAIClient.clearMediaBuffer();
            }
        });

        // Log all Gemini events for illustration/debugging
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
        VoxEngine.terminate();    }
});
