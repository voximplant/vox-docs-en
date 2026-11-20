/**
 * Voximplant + OpenAI Realtime API connector demo
 * Scenario: place an outbound PSTN call and bridge it to OpenAI Realtime 1.5.
 */

require(Modules.OpenAI);

const OPENAI_MODEL = "gpt-realtime-1.5";

const SYSTEM_PROMPT = `
You are Voxi, a concise phone assistant for outbound calls.
Keep responses short and helpful.
`;

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        instructions: SYSTEM_PROMPT,
        voice: "alloy",
        output_modalities: ["audio"],
        turn_detection: {type: "server_vad", interrupt_response: true},
    },
};

const MAX_CALL_MS = 2 * 60 * 1000;

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let call;
    let voiceAIClient;
    let hangupTimer;

    try {
        // Custom data example: {"destination":"+15551234567","callerId":"+15557654321"}
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

            voiceAIClient = await OpenAI.createRealtimeAPIClient({
                apiKey: VoxEngine.getSecretValue("OPENAI_API_KEY"),
                model: OPENAI_MODEL,
                onWebSocketClose: (event) => {
                    Logger.write("===OpenAI.WebSocket.Close===");
                    if (event) Logger.write(JSON.stringify(event));
                    VoxEngine.terminate();
                },
            });

            voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionCreated, () => {
                voiceAIClient.sessionUpdate(SESSION_CONFIG);
            });

            voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
                VoxEngine.sendMediaBetween(call, voiceAIClient);
                voiceAIClient.responseCreate({instructions: "Hello! This is Voxi. How can I help today?"});
            });

            voiceAIClient.addEventListener(
                OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted,
                () => {
                    Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
                    voiceAIClient.clearMediaBuffer();
                },
            );

            // Consolidated "log-only" handlers
            [
                OpenAI.RealtimeAPIEvents.ResponseCreated,
                OpenAI.RealtimeAPIEvents.ResponseDone,
                OpenAI.RealtimeAPIEvents.ResponseOutputAudioDone,
                OpenAI.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
                OpenAI.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
                OpenAI.RealtimeAPIEvents.ConnectorInformation,
                OpenAI.RealtimeAPIEvents.HTTPResponse,
                OpenAI.RealtimeAPIEvents.WebSocketError,
                OpenAI.RealtimeAPIEvents.Unknown,
                OpenAI.Events.WebSocketMediaStarted,
                OpenAI.Events.WebSocketMediaEnded,
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
