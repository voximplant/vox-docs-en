/**
 * Voximplant + Inworld Realtime API demo
 * Scenario: place an outgoing call and bridge it to Inworld Realtime.
 *
 * Configure this in the Voximplant application:
 * - Secret `INWORLD_API_KEY` (Voximplant Secrets)
 * - Routing rule custom data with `destination` and `callerId`
 */

require(Modules.Inworld);

const DEFAULT_CALL_DURATION_MS = 2 * 60 * 1000;

const SYSTEM_PROMPT = `
You are Voxi, a Voximplant developer advocate on a live outbound phone call.
Voximplant is pronounced VOX-im-plant.
Keep answers short, natural, and useful for a marketing demo.
Default to one short sentence under 12 words.

Demo goal:
- Explain how Voximplant brings Inworld Realtime voice agents to phone calls and other real communications channels.
- Highlight Inworld expressive realtime speech, TTS2-style delivery, conversation awareness, voice direction, and persona control.
- Mention that teams can use Inworld without building a custom media gateway.

Voice style:
- Sound like an expressive product expert, not a flat IVR.
- Use short, human turns.
- Use at most one TTS-2 non-verbal tag per turn, and often none: [laugh], [breathe], [sigh], [clear throat].
- Use at most one [speak ...] steering tag per turn. If used, it must be first.
`;

const SESSION_CONFIG = {
    session: {
        type: "realtime",
        model: "claude-sonnet-4-6",
        instructions: SYSTEM_PROMPT,
        output_modalities: ["audio", "text"],
        audio: {
            input: {
                transcription: {
                    model: "inworld/inworld-stt-1",
                    prompt: "Important terms: Voximplant, VoxEngine, Inworld, Inworld Realtime, TTS2, SIP, WhatsApp Business Calling.",
                },
                turn_detection: {
                    type: "semantic_vad",
                    eagerness: "high",
                    create_response: true,
                    interrupt_response: true,
                },
            },
            output: {
                voice: "Ashley",
                model: "inworld-tts-2",
            },
        },
        providerData: {
            tts: {
                delivery_mode: "BALANCED",
                segmenter_strategy: "full_turn",
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let voiceAIClient;
    let call;
    let hangupTimer;

    // Helper to clean-up the call when done
    const terminate = (event) => {
        if (hangupTimer) clearTimeout(hangupTimer);
        if (event) Logger.write(JSON.stringify(event));
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    try {
        // This can be provided when manually running a routing rule in the Control Panel,
        // or via Management API using the `script_custom_data` parameter.
        // example: {"destination":"+15551234567","callerId":"+15557654321"}
        const {destination, callerId} = JSON.parse(VoxEngine.customData());

        call = VoxEngine.callPSTN(destination, callerId);
        // Alternative outgoing paths:
        // call = VoxEngine.callUser({username: destination, callerid: callerId});
        // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
        // call = VoxEngine.callWhatsappUser({number: destination, callerid: callerId});

        // Termination handlers.
        call.addEventListener(CallEvents.Disconnected, terminate);
        call.addEventListener(CallEvents.Failed, terminate);

        call.addEventListener(CallEvents.Connected, async () => {

            // For dev: set a maximum call duration to prevent runaway calls in case of errors.
            hangupTimer = setTimeout(() => {
                Logger.write("===HANGUP_TIMER===");
                call.hangup();
            }, DEFAULT_CALL_DURATION_MS);

            // Create client and wire media after the callee answers
            voiceAIClient = await Inworld.createRealtimeAPIClient({
                apiKey: VoxEngine.getSecretValue("INWORLD_API_KEY"),
                sessionKey: `inworld-outbound-${Date.now()}`,
                onWebSocketClose: terminate,
            });

            voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionCreated, () => {
                Logger.write("===Inworld.SessionCreated===");
                voiceAIClient.sessionUpdate(SESSION_CONFIG);
            });

            // Once the session is configured, bridge call media and trigger the greeting.
            voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.SessionUpdated, () => {
                Logger.write("===Inworld.SessionUpdated===");
                // Bridge media between the call and Inworld Realtime.
                VoxEngine.sendMediaBetween(call, voiceAIClient);
                voiceAIClient.conversationItemCreate({
                    item: {
                        type: "message",
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: "The outbound call just connected. Say only: Hi, this is Voxi from Voximplant. How can I help?",
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

            voiceAIClient.addEventListener(Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
                Logger.write("===BARGE-IN: Inworld.InputAudioBufferSpeechStarted===");
                voiceAIClient.outputAudioBufferClear({});
            });

            // Consolidated log-only handlers for lifecycle, audio, and error debugging.
            [
                Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionDelta,
                Inworld.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
                Inworld.RealtimeAPIEvents.ResponseCreated,
                Inworld.RealtimeAPIEvents.ResponseDone,
                Inworld.RealtimeAPIEvents.ResponseOutputAudioDone,
                Inworld.RealtimeAPIEvents.ResponseOutputAudioTranscriptDone,
                Inworld.RealtimeAPIEvents.InputAudioBufferSpeechStopped,
                Inworld.RealtimeAPIEvents.InputAudioBufferCommitted,
                Inworld.RealtimeAPIEvents.InputAudioBufferCleared,
                Inworld.RealtimeAPIEvents.OutputAudioBufferStarted,
                Inworld.RealtimeAPIEvents.OutputAudioBufferStopped,
                Inworld.RealtimeAPIEvents.OutputAudioBufferCleared,
                Inworld.RealtimeAPIEvents.ConnectorInformation,
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
        });
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        terminate(error instanceof Error ? {message: error.message, stack: error.stack} : {error: String(error)});
    }
});
