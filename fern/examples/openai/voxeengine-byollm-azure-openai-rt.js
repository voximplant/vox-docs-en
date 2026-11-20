/**
 * Voximplant + Azure OpenAI Realtime API connector demo
 * Scenario: answer an incoming call and bridge it to Azure OpenAI Realtime.
 */

require(Modules.OpenAI);

const SYSTEM_PROMPT = `
You are Voxi, a helpful voice assistant for Voximplant phone callers.
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

    function terminate(){
        voiceAIClient?.close();
        VoxEngine.terminate();
    }

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: VoxEngine.getSecretValue("AZURE_API_KEY"),          // API key from Azure
            baseUrl: VoxEngine.getSecretValue("AZURE_OPENAI_BASE_URL"), // https://{{resource}}.openai.azure.com
            model: "gpt-realtime-1.5",                                        // align with deployed model
            onWebSocketClose: (event) => {
                Logger.write("===AzureOpenAI.WebSocket.Close===");
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
            voiceAIClient.responseCreate({instructions: "Greet the caller and ask how you can help."});
        });

        // Barge-in: clear buffered audio when the caller starts speaking
        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: AzureOpenAI.InputAudioBufferSpeechStarted===");
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
        terminate();
    }
});
