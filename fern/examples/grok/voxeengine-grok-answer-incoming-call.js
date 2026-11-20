require(Modules.XAI);
// Pin the xAI Voice Agent model used by this example.
const GROK_MODEL = "grok-voice-latest";
const SYSTEM_PROMPT = `
  You are Voxi, a concise phone agent for Voximplant callers.
  Keep answers brief and helpful. If you do not know, say so and offer to connect them to a human.
`;

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    call.answer();
    // call.record({ hd_audio: true, stereo: true });   // Optional: record the call

    try {
        const providerApiKey = VoxEngine.getSecretValue("XAI_API_KEY");
        if (!providerApiKey) throw new Error("Set XAI_API_KEY in Voximplant Secrets");

        voiceAIClient = await XAI.createVoiceAgentAPIClient({
            xAIApiKey: providerApiKey,
            model: GROK_MODEL,
            onWebSocketClose: (event) => {
                Logger.write("===XAI.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                VoxEngine.terminate();
            },
        });

        // Set up the session once created
        voiceAIClient.addEventListener(
            XAI.VoiceAgentAPIEvents.ConversationCreated,
            () => {
                voiceAIClient.sessionUpdate({
                    session: {
                        voice: "Ara",
                        turn_detection: {type: "server_vad"},
                        instructions: SYSTEM_PROMPT,
                    },
                });
            },
        );

        // Wait for Grok setup, then bridge audio and trigger the greeting
        voiceAIClient.addEventListener(
            XAI.VoiceAgentAPIEvents.SessionUpdated,
            () => {
                VoxEngine.sendMediaBetween(call, voiceAIClient);
                voiceAIClient.responseCreate({instructions: "Hello! How can I help today?"});
            },
        );

        // Simple barge-in: clear buffered audio when caller starts speaking
        voiceAIClient.addEventListener(
            XAI.VoiceAgentAPIEvents.InputAudioBufferSpeechStarted,
            () => voiceAIClient.clearMediaBuffer(),
        );

        // -------------------- Log Other Events --------------------
        [
            CallEvents.FirstAudioPacketReceived,
            XAI.Events.WebSocketMediaStarted,
            XAI.Events.WebSocketMediaEnded,
            XAI.VoiceAgentAPIEvents.ConnectorInformation,
            XAI.VoiceAgentAPIEvents.ResponseCreated,
            XAI.VoiceAgentAPIEvents.ResponseOutputItemAdded,
            XAI.VoiceAgentAPIEvents.ResponseOutputItemDone,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioTranscriptDelta,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioTranscriptDone,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioDone,
            XAI.VoiceAgentAPIEvents.ResponseDone,
            XAI.VoiceAgentAPIEvents.InputAudioBufferSpeechStopped,
            XAI.VoiceAgentAPIEvents.InputAudioBufferCommitted,
            XAI.VoiceAgentAPIEvents.ConversationItemAdded,
            XAI.VoiceAgentAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            XAI.VoiceAgentAPIEvents.WebSocketError,
            XAI.VoiceAgentAPIEvents.Unknown,
        ].forEach((evtName) => {
            voiceAIClient.addEventListener(evtName, (e) => {
                Logger.write(`===${e.name}===>${JSON.stringify(e)}`);
            });
        });

    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(JSON.stringify(error));
        VoxEngine.terminate();
    }
});
