/**
 * Voximplant + OpenAI Realtime API + ElevenLabs TTS demo
 * Scenario: OpenAI handles STT/LLM, ElevenLabs handles TTS (half-cascade).
 */

require(Modules.OpenAI);
require(Modules.ElevenLabs);

const OPENAI_MODEL = "gpt-realtime-2.1";

const SYSTEM_PROMPT = `
You are Voxi, a helpful phone assistant.
Keep responses short and telephony-friendly.
Always reply in English.
`;

const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = "eleven_turbo_v2_5";

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

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
            call.sendMediaTo(voiceAIClient);  // bridge media between the call and OpenAI

            // create the TTS player and pass the config parameters
            ttsPlayer = ElevenLabs.createRealtimeTTSPlayer(" ", {
                // headers: [{name: "xi-api-key", value: VoxEngine.getSecretValue('ELEVENLABS_API_KEY')}], // optional
                pathParameters: {voice_id: ELEVENLABS_VOICE_ID},
                queryParameters: {
                    model_id: ELEVENLABS_MODEL_ID,
                },
            });
            ttsPlayer.sendMediaTo(call); // bridge media between the TTS player and the call

            voiceAIClient.responseCreate({instructions: "Hello! How can I help today?"});
        });

        voiceAIClient.addEventListener(OpenAI.RealtimeAPIEvents.ResponseOutputTextDone, (event) => {
            const payload = event?.data?.payload || event?.data || {};
            const text = payload.text || payload.delta;
            if (!text || !ttsPlayer) return;
            Logger.write(`===AGENT_TEXT=== ${text}`);
            ttsPlayer.append(text, true);
        });

        // Barge-in: clear both OpenAI and ElevenLabs buffers
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
