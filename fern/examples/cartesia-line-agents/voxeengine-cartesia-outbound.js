/**
 * Voximplant + Cartesia Line Agents connector demo
 * Scenario: place an outbound PSTN call and bridge it to Cartesia.
 */

require(Modules.Cartesia);
require(Modules.ApplicationStorage);

const MAX_CALL_MS = 2 * 60 * 1000;

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

            voiceAIClient.start({
                metadata: {channel: "voice", provider: "voximplant", mode: "outbound"},
            });

            // Bridge media between the call and Cartesia Line Agents
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
