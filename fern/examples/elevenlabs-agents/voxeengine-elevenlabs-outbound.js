/**
 * Voximplant + ElevenLabs Agents connector demo
 * Scenario: place an outbound PSTN call and bridge it to ElevenLabs Agents.
 */

require(Modules.ElevenLabs);

const MAX_CALL_MS = 2 * 60 * 1000;  // Maximum call duration of 2 minutes
// Optional. Leave empty to use the default ElevenLabs Agents endpoint.
const ELEVENLABS_BASE_URL = "";

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let call;
    let voiceAIClient;
    let hangupTimer;

    try {
        // This can be provided when manually running a routing rule in the Control Panel,
        // or via Management API using the `script_custom_data` parameter.
        // example: {"destination": "+15551234567", "callerId": "+15557654321"}
        const {destination, callerId} = JSON.parse(VoxEngine.customData());

        call = VoxEngine.callPSTN(destination, callerId);
        // Alternative outbound paths (uncomment to use):
        // call = VoxEngine.callUser({username: destination, callerid: callerId});
        // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
        // call = VoxEngine.callWhatsappUser({number: destination, callerid: callerId});

        call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());
        call.addEventListener(CallEvents.Disconnected, () => {
            if (hangupTimer) clearTimeout(hangupTimer);
            VoxEngine.terminate();
        });

        call.addEventListener(CallEvents.Connected, async () => {
            hangupTimer = setTimeout(() => {
                Logger.write("===HANGUP_TIMER===");
                call.hangup();
            }, MAX_CALL_MS);

            // Create client and connect to ElevenLabs Agents
            const agentsClientParameters = {
                xiApiKey: VoxEngine.getSecretValue("ELEVENLABS_API_KEY"),
                agentId: VoxEngine.getSecretValue("ELEVENLABS_AGENT_ID"),
                onWebSocketClose: (event) => {
                    Logger.write("===ElevenLabs.WebSocket.Close===");
                    if (event) Logger.write(JSON.stringify(event));
                    VoxEngine.terminate();
                },
            };
            if (ELEVENLABS_BASE_URL) {
                agentsClientParameters.baseUrl = ELEVENLABS_BASE_URL;
            }
            voiceAIClient = await ElevenLabs.createAgentsClient(agentsClientParameters);

            // Bridge media between the call and ElevenLabs Agents
            VoxEngine.sendMediaBetween(call, voiceAIClient);

            // ---------------------- Event handlers -----------------------
            // Barge-in: keep conversation responsive
            voiceAIClient.addEventListener(ElevenLabs.AgentsEvents.Interruption, () => {
                Logger.write("===BARGE-IN: ElevenLabs.AgentsEvents.Interruption===");
                voiceAIClient.clearMediaBuffer();
            });

            voiceAIClient.addEventListener(ElevenLabs.AgentsEvents.UserTranscript, (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const text = payload.text || payload.transcript || payload.user_transcript;
                if (text) {
                    Logger.write(`===USER=== ${text}`);
                } else {
                    Logger.write("===USER_TRANSCRIPT===");
                    Logger.write(JSON.stringify(payload));
                }
            });

            voiceAIClient.addEventListener(ElevenLabs.AgentsEvents.AgentResponse, (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const text = payload.text || payload.response || payload.agent_response;
                if (text) {
                    Logger.write(`===AGENT=== ${text}`);
                } else {
                    Logger.write("===AGENT_RESPONSE===");
                    Logger.write(JSON.stringify(payload));
                }
            });

            // Consolidated "log-only" handlers - key ElevenLabs/VoxEngine debugging events
            [
                ElevenLabs.AgentsEvents.ConversationInitiationMetadata,
                ElevenLabs.AgentsEvents.AgentResponseCorrection,
                ElevenLabs.AgentsEvents.ContextualUpdate,
                ElevenLabs.AgentsEvents.AgentToolResponse,
                ElevenLabs.AgentsEvents.VadScore,
                ElevenLabs.AgentsEvents.Ping,
                ElevenLabs.AgentsEvents.HTTPResponse,
                ElevenLabs.AgentsEvents.WebSocketError,
                ElevenLabs.AgentsEvents.ConnectorInformation,
                ElevenLabs.AgentsEvents.Unknown,
                ElevenLabs.Events.WebSocketMediaStarted,
                ElevenLabs.Events.WebSocketMediaEnded,
            ].forEach((eventName) => {
                voiceAIClient.addEventListener(eventName, (event) => {
                    Logger.write(`===${event.name}===`);
                    if (event?.data) Logger.write(JSON.stringify(event.data));
                });
            });
        });
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
