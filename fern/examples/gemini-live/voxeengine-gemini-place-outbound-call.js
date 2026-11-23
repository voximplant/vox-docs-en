/**
 * Voximplant + Gemini Live API connector demo
 * Scenario: place an outgoing PSTN call and bridge it to Gemini Live API.
 */

require(Modules.Gemini);
const SYSTEM_PROMPT = `
You are Voxi, a helpful voice assistant for phone callers.
Keep responses short and telephony-friendly (usually 1-2 sentences).
`;

// -------------------- Gemini Live API settings --------------------
const CONNECT_CONFIG = {
    responseModalities: ["AUDIO"],
    systemInstruction: {
        parts: [{text: SYSTEM_PROMPT}],
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
};

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let voiceAIClient;
    let call;

    try {
        // This can be provided when manually running a routing rule in the Control Panel,
        // or via Management API using the `script_custom_data` parameter.
        // example: {"destination": "+15551234567","callerId": "+15557654321"}
        const {destination, callerId} = JSON.parse(VoxEngine.customData());

        // Place the outgoing call
        call = VoxEngine.callPSTN(destination, callerId);
        // Alternative outgoing paths (uncomment to use):
        // call = VoxEngine.callUser({username: destination, callerid: callerId});
        // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
        // call = VoxEngine.callWhatsappUser({number: destination, callerid: callerId});

        // Termination functions - add cleanup and logging as needed
        call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
        call.addEventListener(CallEvents.Failed, VoxEngine.terminate);

        call.addEventListener(CallEvents.Connected, async () => {
            // call.record({ hd_audio: true, stereo: true });  // Optional: record the call

            voiceAIClient = await Gemini.createLiveAPIClient({
                apiKey: VoxEngine.getSecretValue('GEMINI_API_KEY'),
                model: "gemini-3.8-live",
                backend: Gemini.Backend.GEMINI_API,
                connectConfig: CONNECT_CONFIG,
                onWebSocketClose: () => {
                    Logger.write(`===Gemini.WebSocket.Close===`);
                    VoxEngine.terminate();
                },
            });

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
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(error);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
