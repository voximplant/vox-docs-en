/**
 * Voximplant + OpenAI Realtime API + Cartesia TTS demo
 * Scenario: OpenAI handles STT/LLM, Cartesia handles TTS (half-cascade).
 */

require(Modules.OpenAI);
require(Modules.Cartesia);

const OPENAI_MODEL = "gpt-realtime-2.1";

const SYSTEM_PROMPT = `
You are Voxi, a helpful phone assistant.
Keep responses short and telephony-friendly.
Reply in English.
`;

const CARTESIA_MODEL_ID = "sonic-2";
const CARTESIA_VOICE_ID = "a0e99841-438c-4a64-b679-ae501e7d6091";

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        model: OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        output_modalities: ["text"],
        audio: {
            input: {
                turn_detection: {type: "server_vad", interrupt_response: true},
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    let ttsPlayer;

    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    try {
        const providerApiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");
        if (!providerApiKey) throw new Error("Set OPENAI_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call


        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: providerApiKey,
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
            call.sendMediaTo(voiceAIClient);
            voiceAIClient.responseCreate({instructions: "Hello! How can I help today?"});
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.ResponseOutputTextDone, (event) => {
            const payload = event?.data?.payload || event?.data || {};
            const text = payload.text || payload.delta;
            if (!text) return;
            Logger.write(`===AGENT_TEXT=== ${text}`);

            // Cartesia TTS requires input on initialization, so we lazily create the player here as needed
            if (!ttsPlayer) {
                const contextId = `openai-cartesia-${Date.now()}`;
                const cartesiaOptions = {
                    // apikey: VoxEngine.getSecretValue('CARTESIA_API_KEY'), // optional
                    generationRequestParameters: {
                        model_id: CARTESIA_MODEL_ID,
                        transcript: text,
                        language: "en",
                        voice: {mode: "id", id: CARTESIA_VOICE_ID},
                        context_id: contextId,
                        continue: false,
                    },
                };

                ttsPlayer = Cartesia.createRealtimeTTSPlayer(text, cartesiaOptions);
                ttsPlayer.sendMediaTo(call);
                return;
            }

            const contextId = `openai-cartesia-${Date.now()}`;
            ttsPlayer.generationRequest({
                model_id: CARTESIA_MODEL_ID,
                transcript: text,
                language: "en",
                voice: {mode: "id", id: CARTESIA_VOICE_ID},
                context_id: contextId,
                continue: false,
            });
        });

        // Barge-in: clear both OpenAI and Cartesia buffers
        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
            voiceAIClient.clearMediaBuffer();
            ttsPlayer?.clearBuffer();
        });

        // ---------------------- Log all other events for debugging -----------------------
        [
            OpenAI.RealtimeAPIEvents.ResponseCreated,
            OpenAI.RealtimeAPIEvents.ResponseDone,
            OpenAI.RealtimeAPIEvents.ResponseOutputTextDelta,
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
        Logger.write(JSON.stringify(error));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
