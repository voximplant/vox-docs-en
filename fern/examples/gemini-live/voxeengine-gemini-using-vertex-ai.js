/**
 * Voximplant + Gemini Live API connector demo
 * Scenario: answer an incoming call using Gemini Live API via Vertex AI.
 */

require(Modules.Gemini);
require(Modules.ApplicationStorage);

const SYSTEM_PROMPT = `You are Voxi, a helpful voice assistant for phone callers. Keep responses short and telephony-friendly (usually 1-2 sentences).`;

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
        if (typeof GEMINI_VERTEX_CREDENTIALS !== "string" || !GEMINI_VERTEX_CREDENTIALS) {
            throw new Error("Load the credentials scenario and set GOOGLE_CREDENTIALS in Voximplant Secrets");
        }
        call.answer();
        // call.record({hd_audio: true, stereo: true}); // optional: call recording

        voiceAIClient = await Gemini.createLiveAPIClient({
            credentials: GEMINI_VERTEX_CREDENTIALS,                           // stored in a different scenario
            model: "gemini-live-2.5-flash-preview-native-audio-09-17",
            backend: Gemini.Backend.VERTEX_AI,                                // Set the Vertex back-end
            project: (await ApplicationStorage.get("GCP_PROJECT_ID")).value,  // required for Vertex
            location: (await ApplicationStorage.get("GCP_REGION")).value,     // required for Vertex
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
            voiceAIClient.sendClientContent({
                turns: [{role: "user", parts: [{text: "Say hello and ask how you can help."}]}],
                turnComplete: true,
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
        VoxEngine.terminate();
    }
});
