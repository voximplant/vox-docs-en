/**
 * Voximplant + ElevenLabs Agents connector demo
 * Scenario: answer an incoming call and bridge it to ElevenLabs Agents.
 */

require(Modules.ElevenLabs);

// Optional. Leave empty to use the default ElevenLabs Agents endpoint.
const ELEVENLABS_BASE_URL = "";

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination handlers
    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        const providerApiKey = VoxEngine.getSecretValue("ELEVENLABS_API_KEY");
        if (!providerApiKey) throw new Error("Set ELEVENLABS_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        // Create client and connect to ElevenLabs Agents
        const agentsClientParameters = {
            xiApiKey: providerApiKey,
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
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(JSON.stringify(error));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
