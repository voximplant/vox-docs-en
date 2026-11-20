/**
 * Voximplant + OpenAI Realtime API connector demo
 * Scenario: answer an incoming call and bridge it to OpenAI Realtime 2.1.
 */

require(Modules.OpenAI);

const SYSTEM_PROMPT = `
You are Voxi, a helpful voice assistant for phone callers.
Keep responses short and telephony-friendly (usually 1-2 sentences).
`;

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        model: "gpt-realtime-2.1",
        instructions: SYSTEM_PROMPT,
        reasoning: {effort: "low"},
        output_modalities: ["audio"],
        audio: {
            input: {
                turn_detection: {
                    type: "semantic_vad",
                    eagerness: "auto",
                    create_response: true,
                    interrupt_response: true,
                },
            },
            output: {
                voice: "alloy",
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    const eventPayload = (event) => event?.data?.payload || event?.data || {};

    const terminate = () => {
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        const providerApiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");
        if (!providerApiKey) throw new Error("Set OPENAI_API_KEY in Voximplant Secrets");

        call.answer();

        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: providerApiKey,
            model: "gpt-realtime-2.1",
            onWebSocketClose: terminate,
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionCreated, () => {
            voiceAIClient.sessionUpdate(SESSION_CONFIG);
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);    // media connected
            voiceAIClient.conversationItemCreate({              // request a greeting
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: "The phone call just connected. "
                                + 'Say exactly: "Hello! How can I help today?"',
                        },
                    ],
                },
            });
            voiceAIClient.responseCreate({});       // ask for the response now
        });

        // Barge-in: clear buffered audio when the caller starts speaking
        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
            voiceAIClient.clearMediaBuffer();
        });

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            (event) => {
                const payload = eventPayload(event);
                const transcript = payload.transcript || payload.text || payload.delta;
                if (transcript) Logger.write(`===USER=== ${transcript}`);
            },
        );

        voiceAIClient.addEventListener(
            OpenAI.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
            (event) => {
                const payload = eventPayload(event);
                const transcript = payload.transcript || payload.text;
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
            OpenAI.RealtimeAPIEvents.Error,
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
        Logger.write(JSON.stringify(error));
        terminate();
    }
});
