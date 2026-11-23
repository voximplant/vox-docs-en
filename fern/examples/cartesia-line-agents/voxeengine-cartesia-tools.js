// Voximplant VoxEngine scenario:
// - Streams caller audio <-> Cartesia Line agent (Agents connector)
// - Supports:
//   - end_call: hang up the caller leg
//   - call_transfer: place an outgoing PSTN consult call and then bridge caller -> consult leg
//
// Configure these in the Voximplant application:
// - Secret `CARTESIA_API_KEY` (Voximplant Secrets)
// - ApplicationStorage key CARTESIA_AGENT_ID
// - ApplicationStorage key PSTN_CALLER_ID (required for callPSTN; must be a real E.164 number in your Voximplant account)

require(Modules.Cartesia);
require(Modules.ApplicationStorage);
require(Modules.ASR);

const CALL_TRANSFER_NUMBER = "+18339906144";

// Per-session control URL. Any HTTPS request to this URL triggers AppEvents.HttpRequest in this session.
// We'll pass it into Cartesia call metadata so the agent runtime can request telephony actions via HTTP.
let sessionControlUrl = null;


// Current call session state (single-call demo scenario).
let callerLeg = null;
let voiceAIClient = null;
let consultLeg = null;
let transferInProgress = false;
let transferred = false;


VoxEngine.addEventListener(AppEvents.Started, (appEvent) => {
    sessionControlUrl = appEvent.accessSecureURL;
    Logger.write(`===SESSION_CONTROL_URL_READY===>${JSON.stringify({accessSecureURL: sessionControlUrl}) || ""}`);
});


VoxEngine.addEventListener(AppEvents.HttpRequest, async (appEvent) => {
    Logger.write(`===HTTP_CONTROL_REQUEST===>${JSON.stringify({method: appEvent.method, path: appEvent.path}) || ""}`);

    // Check for and handle control commands
    const cmd = JSON.parse(appEvent?.content);
    if (cmd.action === "end_call") {
        Logger.write(`===CONTROL_END_CALL===>${JSON.stringify(cmd) || ""}`);
        callerLeg.hangup();
        voiceAIClient?.close();
        VoxEngine.terminate();
    } else if (cmd.action === "call_transfer") {
        Logger.write(`===CONTROL_CALL_TRANSFER===>${JSON.stringify(cmd) || ""}`);
        await callTransfer(cmd);
    } else {
        Logger.write(`===CONTROL_COMMAND_UNKNOWN===>${JSON.stringify(cmd) || ""}`);
    }
    return JSON.stringify({ok: true});
});


async function callTransfer(cmd) {
    if (transferInProgress || transferred) return;
    if (!callerLeg) return;

    transferInProgress = true;
    Logger.write(`===CALL_TRANSFER_REQUESTED===>${JSON.stringify(cmd || {}) || ""}`);

    // Detach the agent now for a blind transfer. Delay or conference for a warm transfer
    if (voiceAIClient) {
        VoxEngine.stopMediaBetween(callerLeg, voiceAIClient);
        voiceAIClient.close();
        voiceAIClient = null;
    }

    // Transfer the call to a new number
    const currentPstnCallerId = (await ApplicationStorage.get("PSTN_CALLER_ID")).value;
    const transferDestination = cmd.destination_number || CALL_TRANSFER_NUMBER;
    consultLeg = VoxEngine.callPSTN(transferDestination, currentPstnCallerId, {followDiversion: true});
    // consultLeg = VoxEngine.callUser({username: transferDestination, callerid: currentPstnCallerId});
    // consultLeg = VoxEngine.callSIP(`sip:${transferDestination}@your-sip-domain`, currentPstnCallerId);
    // consultLeg = VoxEngine.callWhatsappUser({number: transferDestination, callerid: currentPstnCallerId});

    consultLeg.addEventListener(CallEvents.Failed, () => {
        transferInProgress = false;
        Logger.write(`===CONSULT_CALL_FAILED===>${JSON.stringify({}) || ""}`);
        callerLeg.hangup();
    });

    consultLeg.addEventListener(CallEvents.Disconnected, (event) => {
        Logger.write(`===CONSULT_CALL_DISCONNECTED===>${JSON.stringify(event) || ""}`);
    });

    consultLeg.addEventListener(CallEvents.Connected, () => {
        Logger.write(`===CONSULT_CALL_CONNECTED===>${JSON.stringify({}) || ""}`);
        transferInProgress = false;
        transferred = true;
        VoxEngine.sendMediaBetween(callerLeg, consultLeg);
    });
}

function onWebSocketClose(event) {
    Logger.write(`===ON_WEB_SOCKET_CLOSE===>${JSON.stringify(event) || ""}`);
    // Ignore expected close during transfer
    if (transferInProgress || transferred || event.code === 1000) return;
    // otherwise end the call
    callerLeg.hangup();
    VoxEngine.terminate();
}

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    callerLeg = call;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        call.answer();
        call.record({hd_audio: true, stereo: true});   // Optional: record the call

        voiceAIClient = await Cartesia.createAgentsClient({
            apiKey: VoxEngine.getSecretValue('CARTESIA_API_KEY'),
            agentId: (await ApplicationStorage.get("CARTESIA_AGENT_ID")).value,
            cartesiaVersion: "2025-04-16",
            onWebSocketClose,
        });

        VoxEngine.sendMediaBetween(call, voiceAIClient);

        voiceAIClient.start({
            // Optional metadata passed into the Cartesia agent
            metadata: {
                mode: "tools",
                from: call.callerid(),
                to: call.number(),
                vox_session_control_url: sessionControlUrl, // Control plane from Cartesia via HTTPS callback
            },
        });

        // "log only" handlers for debugging.
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
        Logger.write(`===SOMETHING_WENT_WRONG===>${JSON.stringify(error) || String(error)}`);
        VoxEngine.terminate();
    }
});
