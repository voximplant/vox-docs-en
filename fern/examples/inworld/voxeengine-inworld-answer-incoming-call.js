/**
 * Voximplant + Inworld Realtime API demo
 * Scenario: answer an incoming call and bridge it to Inworld Realtime.
 */

require(Modules.Inworld);

const SYSTEM_PROMPT = `
You are Voxi, a Voximplant developer advocate on a live phone call.
Voximplant is pronounced VOX-im-plant.
Keep answers short, natural, and useful for a marketing demo.
Default to one short sentence under 12 words.

If the caller asks "Tell me about Voximplant and Inworld" or any similar broad
question, answer directly: Voximplant brings Inworld Realtime agents to real
communication channels, while Inworld provides expressive realtime voice,
conversation-aware delivery, TTS2, persona control, and voice direction.

Demo goal:
- Explain how Voximplant brings Inworld Realtime voice agents to real communications channels.
- Highlight Inworld expressive realtime speech, TTS2-style delivery, conversation awareness, voice direction, and persona control.
- Highlight Voximplant calling, SIP, WhatsApp Business Calling, browser calls, native app calls, and VoxEngine orchestration.
- Mention that teams can use Inworld without building a custom media gateway.
- Mention production telephony features when relevant: transfers, DTMF, barge-in, no-audio detection, debugging, and monitoring.

Voice style:
- Sound like an expressive product expert, not a flat IVR.
- Adapt your tone to the caller's question.
- Use short, human turns. Default to one short spoken sentence.
- Use small spoken disfluencies sparingly: "uh", "hmm", "well", "right", "okay".
- Use at most one TTS-2 non-verbal tag per turn, and often none: [laugh], [breathe], [sigh], [clear throat].
- Use at most one [speak ...] steering tag per turn. If used, it must be first.
- If the caller asks about emotion, persona, pacing, or voice control, demonstrate it briefly with a [speak ...] tag or a natural non-verbal cue.
- If the caller asks what this demo is, say this is Voximplant connected to Inworld Realtime on a live phone call.

If the caller asks about a product detail you are not sure of, say you would check the latest docs instead of guessing.
`;

const SESSION_CONFIG = {
    session: {
        type: "realtime",   // Realtime mode keeps the call audio stream connected to Inworld.
        model: "claude-sonnet-4-6",     // Note: some models require a payment method on file
        instructions: SYSTEM_PROMPT,
        output_modalities: ["audio", "text"],   // Audio is required for automatic turn-detection responses
        audio: {
            input: {
                // Inworld STT keeps the transcript inside the same realtime session.
                transcription: {
                    model: "inworld/inworld-stt-1",
                    language: "en",
                    prompt: "Important terms: Voximplant, VoxEngine, Inworld, Inworld Realtime, TTS2, SIP, WhatsApp Business Calling.",
                },
                // Semantic VAD decides when the caller's turn is complete and can auto-create the response.
                turn_detection: {
                    type: "semantic_vad",
                    eagerness: "high",
                    create_response: true,
                    interrupt_response: true,
                },
            },
            output: {
                // TTS-2 voice output. This is where the demo showcases expressive delivery.
                voice: "Ashley",
                model: "inworld-tts-2",
                speed: 1.0,
            },
        },
        providerData: {
            tts: {
                delivery_mode: "BALANCED", // Naturalness: steady call-center prosody with TTS-2 control tags.
                segmenter_strategy: "full_turn", // Naturalness: wait for the full turn before speech output.
                steering_handling: "emit_once",  // Apply [speak ...] steering once per response
            },
            stt: {
                // Helps Inworld adapt recognition to the current speaker during the session.
                voice_profile: true,
            },
            backchannel: {
                // Back-channel can produce short acknowledgements while the caller is still speaking.
                enabled: true,
                eval_interval_ms: 800,
                min_speech_ms: 800,
                min_gap_ms: 4000,
                max_per_turn: 3,
                volume_gain: 0.6,
            },
            responsiveness: {
                // Responsiveness allows brief filler behavior if generation is slower than expected.
                enabled: true,
                initial_wait_timeout_ms: 500,
                hard_deadline_ms: 1200,
                max_tokens: 8,
                min_filler_gap_ms: 5000,
                max_initial_per_turn: 1,
                enable_filler_on_first_assistant_reply: false,
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Helper to clean-up the call when done
    const terminate = (event) => {
        if (event) Logger.write(JSON.stringify(event));
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    // Termination handlers
    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        call.answer();
        // Optional: record & transcribe the call. Note: use `require(Modules.ASR)` needed for enums
        // call.record({hd_audio: true, stereo: true, transcribe: true, provider: TranscriptionProvider.GOOGLE, language: ASRLanguage.ENGLISH_US });

        // Create client and connect to Inworld Realtime.
        voiceAIClient = await Inworld.createRealtimeAPIClient({
            apiKey: VoxEngine.getSecretValue("INWORLD_API_KEY"),
            sessionKey: `inworld-realtime-demo-${Date.now()}`,
            onWebSocketClose: terminate,
        });

        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionCreated, () => {
            Logger.write("===Inworld.SessionCreated===");
            voiceAIClient.sessionUpdate(SESSION_CONFIG);
        });

        // Once the session is configured, bridge call media and trigger the greeting.
        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionUpdated, () => {
            Logger.write("===Inworld.SessionUpdated===");
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.conversationItemCreate({
                item: {
                    type: "message",
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `The phone call just connected.
                                   Greet the caller as Voxi from Voximplant and invite a question about Voximplant and Inworld.`,
                        },
                    ],
                },
            });
            voiceAIClient.responseCreate({
                response: {
                    output_modalities: ["audio", "text"],
                },
            });
        });

        // Barge-in: clear buffered output audio when the caller starts speaking.
        voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: Inworld.InputAudioBufferSpeechStarted===");
            voiceAIClient.outputAudioBufferClear({});
        });

        // Caller transcript for debugging.
        voiceAIClient.addEventListener(
            Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const transcript = payload.transcript || payload.text || payload.delta;
                if (transcript) Logger.write(`===USER==> ${transcript}`);
            },
        );

        // Final agent transcript for readable call logs.
        voiceAIClient.addEventListener(
            Inworld.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
            (event) => {
                const payload = event?.data?.payload || event?.data || {};
                const transcript = payload.transcript || payload.text;
                if (transcript) Logger.write(`===AGENT==> ${transcript}`);
            },
        );

        // Consolidated log-only handlers for lifecycle, audio, and error debugging.
        [
            Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionDelta,
            Inworld.RealtimeAPIEvents.ResponseCreated,
            Inworld.RealtimeAPIEvents.ResponseDone,
            Inworld.RealtimeAPIEvents.ResponseOutputAudioDone,
            Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStopped,
            Inworld.RealtimeAPIEvents.InputAudioBufferCommitted,
            Inworld.RealtimeAPIEvents.InputAudioBufferCleared,
            Inworld.RealtimeAPIEvents.OutputAudioBufferStarted,
            Inworld.RealtimeAPIEvents.OutputAudioBufferStopped,
            Inworld.RealtimeAPIEvents.OutputAudioBufferCleared,
            Inworld.RealtimeAPIEvents.ConnectorInformation,
            // Inworld.RealtimeAPIEvents.ResponseOutputAudioTranscriptDelta, // this is noisy
            Inworld.RealtimeAPIEvents.HTTPResponse,
            Inworld.RealtimeAPIEvents.Error,
            Inworld.RealtimeAPIEvents.WebSocketError,
            Inworld.RealtimeAPIEvents.Unknown,
            Inworld.Events.WebSocketMediaStarted,
            Inworld.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                if (event?.data) Logger.write(JSON.stringify(event.data));
            });
        });

    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        terminate(error instanceof Error ? {message: error.message, stack: error.stack} : {error: String(error)});
    }
});
