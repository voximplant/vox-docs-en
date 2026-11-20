/**
 * Voximplant + Ultravox WebSocket API connector demo
 * Scenario: place an outbound call and bridge it to Ultravox after answer.
 */

require(Modules.Ultravox);
const SYSTEM_PROMPT = `You are a helpful phone assistant for Voximplant callers.
Keep responses short and telephony-friendly (1–2 sentences).`;

// -------------------- Ultravox WebSocket API settings --------------------
const MODEL = "ultravox-v0.7";
const VOICE_NAME = "Mark";
const DEFAULT_CALL_DURATION_MS = 40000;

function parseCustomData() {
    const raw = VoxEngine.customData();
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (error) {
        Logger.write("===CUSTOM_DATA_PARSE_FAILED===");
        Logger.write(error);
        return {};
    }
}

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let voiceAIClient;

    const {
        destination,
        callerId,
        callDurationMs = DEFAULT_CALL_DURATION_MS,
    } = parseCustomData();

    if (!destination || !callerId) {
        Logger.write("===MISSING_CUSTOM_DATA===");
        Logger.write(JSON.stringify({destination, callerId}));
        VoxEngine.terminate();
        return;
    }

    const apiKey = VoxEngine.getSecretValue("ULTRAVOX_API_KEY");
    if (!apiKey) {
        Logger.write("Set ULTRAVOX_API_KEY in Voximplant Secrets");
        VoxEngine.terminate();
        return;
    }

    // Place the outbound call (primary path: PSTN)
    let call = VoxEngine.callPSTN(destination, callerId);

    // Alternative outbound paths (uncomment to use):
    // call = VoxEngine.callUser({ username: "callee", callerid: callerId });
    // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
    // call = VoxEngine.callWhatsappUser({ number: destination, callerid: callerId });

    let hangupTimer;

    // Termination functions - add cleanup and logging as needed
    const terminate = () => {
        if (hangupTimer) clearTimeout(hangupTimer);
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    call.addEventListener(CallEvents.Connected, async () => {
        hangupTimer = setTimeout(() => call.hangup(), Number(callDurationMs));

        const authorizations = {
            "X-API-Key": apiKey,
        };

        // Create client and wire media after the callee answers
        const webSocketAPIClientParameters = {
            endpoint: Ultravox.HTTPEndpoint.CREATE_CALL,
            authorizations,
            body: {
                systemPrompt: SYSTEM_PROMPT,
                model: MODEL,
                voice: VOICE_NAME,
            },
            onWebSocketClose: (event) => {
                Logger.write("===ULTRAVOX_WEBSOCKET_CLOSED===");
                if (event) Logger.write(JSON.stringify(event));
                terminate();
            },
        };

        try {
            voiceAIClient = await Ultravox.createWebSocketAPIClient(
                webSocketAPIClientParameters,
            );

            VoxEngine.sendMediaBetween(call, voiceAIClient);

            // ---------------------- Event handlers -----------------------
            // Barge-in: keep conversation responsive and capture transcript
            voiceAIClient.addEventListener(
                Ultravox.WebSocketAPIEvents.Transcript,
                (event) => {
                    const payload = event?.data?.payload || event?.data || {};
                    const role = payload.role;
                    const text = payload.text || payload.delta;

                    if (role && text) Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
                    if (role === "user") voiceAIClient.clearMediaBuffer();
                },
            );

            voiceAIClient.addEventListener(
                Ultravox.WebSocketAPIEvents.PlaybackClearBuffer,
                () => voiceAIClient.clearMediaBuffer(),
            );

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
            terminate();
        }
    });
});
