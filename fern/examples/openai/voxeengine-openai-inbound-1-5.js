/**
 * Voximplant + OpenAI Realtime API connector demo
 * Scenario: answer an incoming call and bridge it to OpenAI Realtime 1.5.
 */

require(Modules.OpenAI);

const SYSTEM_PROMPT = `
You are Voxi, a helpful voice assistant for phone callers.
Keep responses short and telephony-friendly (usually 1-2 sentences).
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

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: VoxEngine.getSecretValue("OPENAI_API_KEY"),
            model: "gpt-realtime-1.5",
            onWebSocketClose: (event) => {
                Logger.write("===OpenAI.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                VoxEngine.terminate();
            },
        });

        //---------------------- Event handlers -----------------------
        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionCreated, () => {
            voiceAIClient.sessionUpdate(SESSION_CONFIG);
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.responseCreate({instructions: "Hello! How can I help today?"});
        });

        // Barge-in: clear buffered audio when the caller starts speaking
        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
            voiceAIClient.clearMediaBuffer();
        });

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            (event) => {
                const {transcript} = event.data.payload;
                if (transcript) Logger.write(`===USER=== ${transcript}`);
            },
        );

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ResponseOutputAudioTranscriptDelta,
            (event) => {
                const {delta} = event.data.payload;
                if (delta) Logger.write(`===AGENT_DELTA=== ${delta}`);
            },
        );

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
            (event) => {
                const {transcript} = event.data.payload;
                if (transcript) Logger.write(`===AGENT=== ${transcript}`);
            },
        );

        // Consolidated "log-only" handlers - key OpenAI/VoxEngine debugging events
        [
            OpenAI.RealtimeAPIEvents.ResponseCreated,
            OpenAI.RealtimeAPIEvents.ResponseDone,
            OpenAI.RealtimeAPIEvents.ResponseOutputAudioDone,
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
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
