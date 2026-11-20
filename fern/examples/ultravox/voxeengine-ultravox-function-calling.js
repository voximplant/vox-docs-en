/**
 * Voximplant + Ultravox WebSocket API connector demo
 * Scenario: answer an incoming call and handle client tool invocations.
 */

require(Modules.Ultravox);
const SYSTEM_PROMPT = `You are a helpful phone assistant for Voximplant callers.
If you need external data, call the get_weather tool.
If the caller wants to end the call, call the hangup_call tool.`;

// -------------------- Ultravox WebSocket API settings --------------------
const AGENT_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: "ultravox-v0.7",
    voice: "Mark",
};
const WEATHER_TOOL_NAME = "get_weather";    // Needs to be defined in the Ultravox portal
const HANGUP_TOOL_NAME = "hangUp";          // Built-in Ultravox tool

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let hangupAfterResponse = false;
    let hangupTimer;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    try {
        call.answer();
        // call.record({ hd_audio: true, stereo: true }); // Optional: record the call

        // Create client and wire media
        voiceAIClient = await Ultravox.createWebSocketAPIClient(
            {
                endpoint: Ultravox.HTTPEndpoint.CREATE_CALL,
                authorizations: {"X-API-Key": VoxEngine.getSecretValue('ULTRAVOX_API_KEY')},
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
        // Function calling: handle tool requests and send back responses
        voiceAIClient.addEventListener(
            Ultravox.WebSocketAPIEvents.ClientToolInvocation,
            (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const {toolName, invocationId, parameters} = payload;

                if (!toolName || !invocationId) return;

                if (toolName !== WEATHER_TOOL_NAME && toolName !== HANGUP_TOOL_NAME) {
                    voiceAIClient.clientToolResult({
                        type: "client_tool_result",
                        invocationId,
                        errorType: "tool_not_found",
                        errorMessage: `Unhandled tool: ${toolName}`,
                    });
                    return;
                }

                if (toolName === WEATHER_TOOL_NAME) {
                    const location = parameters?.location || "Unknown";
                    const result = JSON.stringify({
                        location,
                        temperature_f: 72,
                        condition: "sunny",
                    });

                    voiceAIClient.clientToolResult({
                        type: "client_tool_result",
                        invocationId,
                        responseType: "tool-response",
                        agentReaction: "speaks",
                        result,
                    });
                    return;
                }

                if (toolName === HANGUP_TOOL_NAME) {
                    hangupAfterResponse = true;
                    voiceAIClient.clientToolResult({
                        type: "client_tool_result",
                        invocationId,
                        responseType: "tool-response",
                        agentReaction: "speaks",
                        result: JSON.stringify({ result: "Hanging up now. Goodbye!" }),
                    });
                }
            },
        );

        // Barge-in: keep conversation responsive and capture transcript
        voiceAIClient.addEventListener(
            Ultravox.WebSocketAPIEvents.Transcript,
            (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const role = payload.role;
                const text = payload.text || payload.delta;

                if (role && text) Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
                if (role === "user") voiceAIClient.clearMediaBuffer();
                if (hangupAfterResponse && role === "assistant" && payload.text) {
                    if (hangupTimer) clearTimeout(hangupTimer);
                    hangupTimer = setTimeout(() => call.hangup(), 1200);
                }
            },
        );

        voiceAIClient.addEventListener(
            Ultravox.WebSocketAPIEvents.PlaybackClearBuffer,
            () => voiceAIClient.clearMediaBuffer(),
        );

        // If the media stream ends after a goodbye response, hang up the call.
        voiceAIClient.addEventListener(Ultravox.Events.WebSocketMediaEnded, () => {
            if (hangupAfterResponse) call.hangup();
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
        Logger.write(error);
        VoxEngine.terminate();
    }
});
