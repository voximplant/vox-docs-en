/**
 * Voximplant + OpenAI Realtime API + Inworld TTS demo
 * Scenario: OpenAI handles STT/LLM, Inworld handles TTS (half-cascade).
 */

require(Modules.OpenAI);
require(Modules.Inworld);

const OPENAI_MODEL = "gpt-realtime-2.1";

const SYSTEM_PROMPT = `
You are Voxi, a helpful phone assistant.
Keep responses short and telephony-friendly.
Always reply in English.
`;

const INWORLD_VOICE_ID = "Ashley";               // set your preference here
const INWORLD_MODEL_ID = "inworld-tts-1.5-mini"; // set your preference here, or leave blank to use the default model for the voice

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
        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        const openAiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");

        voiceAIClient = await OpenAI.createRealtimeAPIClient({
            apiKey: openAiKey,
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

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, async () => {
            call.sendMediaTo(voiceAIClient);        // bridge media between the call and OpenAI

            // create the TTS player and pass the config parameters
            ttsPlayer = Inworld.createRealtimeTTSPlayer({
                // apiKey: VoxEngine.getSecretValue('INWORLD_API_KEY'),  // optional,
                createContextParameters: {
                    create: {
                        voiceId: INWORLD_VOICE_ID,
                        modelId: INWORLD_MODEL_ID,
                        speakingRate: 1.1,
                        temperature: 1.3,
                    },
                },
            });
            ttsPlayer.sendMediaTo(call);        // bridge media between the TTS player and the call
            ttsPlayer.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, (event) => {
                Logger.write("===INWORLD_TTS_AUDIO_CHUNKS_FINISHED===");
                Logger.write(`timeToFirstByte=${event.timeToFirstByte}`);
            });

            voiceAIClient.responseCreate({instructions: "Hello! How can I help today?"});
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.ResponseOutputTextDone, (event) => {
            const payload = event?.data?.payload || event?.data || {};
            const text = payload.text || payload.delta;
            if (!text || !ttsPlayer) return;
            Logger.write(`===AGENT_TEXT=== ${text}`);
            ttsPlayer.send({send_text: {text}});
            ttsPlayer.send({flush_context: {}});
        });

        // Barge-in: clear both OpenAI and Inworld buffers
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
        Logger.write(error);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
