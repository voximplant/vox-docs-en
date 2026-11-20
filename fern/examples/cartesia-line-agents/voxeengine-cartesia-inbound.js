/**
 * Voximplant + Cartesia Line Agents connector demo
 * Scenario: answer an incoming call and bridge it to Cartesia.
 */

require(Modules.Cartesia);
require(Modules.ApplicationStorage);

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination handlers
    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        call.answer();
        // Optional: record & transcribe the call. Note:`require(Modules.ASR)` needed for TranscriptionProvider enum
        // call.record({hd_audio: true, stereo: true, transcribe: true, provider: TranscriptionProvider.GOOGLE });

        // Create client and connect to Cartesia Agents
        voiceAIClient = await Cartesia.createAgentsClient({
            apiKey: VoxEngine.getSecretValue('CARTESIA_API_KEY'),
            cartesiaVersion: "2025-04-16",
            agentId: (await ApplicationStorage.get("CARTESIA_AGENT_ID")).value,
            onWebSocketClose: (event) => {
                Logger.write("===Cartesia.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                VoxEngine.terminate();
            },
        });

        // Start the client and pass optional metadata
        voiceAIClient.start({
            metadata: {channel: "voice", provider: "voximplant", mode: "inbound"},
        });

        // Send the call media to the Agent
        VoxEngine.sendMediaBetween(call, voiceAIClient);

        // Consolidated log only handlers for debugging
        [
            Cartesia.AgentsEvents.ACK,
            Cartesia.AgentsEvents.Clear,
            Cartesia.AgentsEvents.ConnectorInformation,
            Cartesia.AgentsEvents.DTMF,
            Cartesia.AgentsEvents.Unknown,
            Cartesia.AgentsEvents.WebSocketError,
            Cartesia.Events.WebSocketMediaStarted,
            Cartesia.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===>${JSON.stringify(event.data) || ""}`);
            });
        });
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
