/**
 * Voximplant + Ultravox WebSocket API connector demo
 * Scenario: answer an incoming call and bridge it to Ultravox.
 */

require(Modules.Ultravox);
const SYSTEM_PROMPT = `You are Voxi, a helpful voice assistant for phone callers. 
Keep responses short and telephony-friendly (usually 1-2 sentences).`;

// -------------------- Ultravox WebSocket API settings --------------------
const AGENT_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: "ultravox-v0.7",
    voice: "Mark",
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    try {
        const providerApiKey = VoxEngine.getSecretValue("ULTRAVOX_API_KEY");
        if (!providerApiKey) throw new Error("Set ULTRAVOX_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({ hd_audio: true, stereo: true }); // Optional: record the call

        // Create client and wire media
        voiceAIClient = await Ultravox.createWebSocketAPIClient(
            {
                endpoint: Ultravox.HTTPEndpoint.CREATE_CALL,
                authorizations: {"X-API-Key": providerApiKey},
                body: AGENT_CONFIG,
                onWebSocketClose: (event) => {
                    Logger.write("===ULTRAVOX_WEBSOCKET_CLOSED===");
                    if (event) Logger.write(JSON.stringify(event));
                    VoxEngine.terminate();
                },
            },
        );
        VoxEngine.sendMediaBetween(call, voiceAIClient);

        // ---------------------- Event handlers -----------------------
        // Barge-in: keep conversation responsive and capture transcript
        voiceAIClient.addEventListener(Ultravox.WebSocketAPIEvents.Transcript, (event) => {
            const payload = event?.data?.payload || event?.data || {};
            const role = payload.role;
            const text = payload.text || payload.delta;

            if (role && text) Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
        });

        voiceAIClient.addEventListener(Ultravox.WebSocketAPIEvents.PlaybackClearBuffer, (event) => {
            Logger.write("===PLAYBACK_CLEAR_BUFFER===");
            voiceAIClient.clearMediaBuffer();
        });

        // Consolidated "log-only" handlers - key Ultravox/VoxEngine debugging events
        [
            Ultravox.WebSocketAPIEvents.ConnectorInformation,
            Ultravox.WebSocketAPIEvents.HTTPResponse,
            Ultravox.WebSocketAPIEvents.State,
            Ultravox.WebSocketAPIEvents.Debug,
            Ultravox.WebSocketAPIEvents.WebSocketError,
            Ultravox.WebSocketAPIEvents.Unknown,
            Ultravox.Events.WebSocketMediaStarted,
            Ultravox.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                Logger.write(JSON.stringify(event));
            });
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(JSON.stringify(error));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
