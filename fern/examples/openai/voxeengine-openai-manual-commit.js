/** Transcribe an incoming call with manual audio commits and local turn detection. */
require(Modules.Silero);
require(Modules.Pipecat);
require(Modules.OpenAI);

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let client;
    let vad;
    let turnDetector;
    let terminated = false;

    const terminate = () => {
        if (terminated) return;
        terminated = true;
        try {
            vad?.close();
            turnDetector?.close();
            client?.close();
        } finally {
            VoxEngine.terminate();
        }
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        const apiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");
        if (!apiKey) throw new Error("Set OPENAI_API_KEY in Voximplant Secrets");

        call.answer(null, {disableDtxForAudio: true});

        vad = await Silero.createVAD({
            threshold: 0.5,
            minSilenceDurationMs: 300,
            speechPadMs: 10,
        });
        turnDetector = await Pipecat.createTurnDetector({threshold: 0.5});
        client = await OpenAI.createRealtimeAPIClient({
            apiKey,
            model: "gpt-realtime-whisper",
            type: OpenAI.RealtimeAPIClientType.TRANSCRIPTION,
            onWebSocketClose: terminate,
        });

        client.addEventListener(OpenAI.RealtimeAPIEvents.SessionCreated, () => {
            Logger.write("OpenAI transcription session created");
            client.sessionUpdate({
                session: {
                    type: "transcription",
                    audio: {
                        input: {
                            transcription: {model: "gpt-realtime-whisper", language: "en"},
                            turn_detection: null,
                        },
                    },
                },
            });
        });

        client.addEventListener(OpenAI.RealtimeAPIEvents.SessionUpdated, () => {
            Logger.write("OpenAI transcription session updated; streaming call audio");
            call.sendMediaTo(vad);
            call.sendMediaTo(turnDetector);
            call.sendMediaTo(client);
        });

        vad.addEventListener(Silero.VADEvents.Result, (event) => {
            if (event.speechEndAt) turnDetector.predict();
        });

        turnDetector.addEventListener(Pipecat.TurnEvents.Result, (event) => {
            Logger.write(`Turn detection: ${JSON.stringify(event)}`);
            if (event.endOfTurn) client.inputAudioBufferCommit();
        });

        client.addEventListener(
            OpenAI.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionDelta,
            (event) => Logger.write(`Transcript delta: ${JSON.stringify(event)}`),
        );
        client.addEventListener(
            OpenAI.RealtimeAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            (event) => Logger.write(`Transcript complete: ${JSON.stringify(event)}`),
        );
        client.addEventListener(OpenAI.RealtimeAPIEvents.Error, (event) => {
            Logger.write(`OpenAI error: ${JSON.stringify(event)}`);
        });
    } catch (error) {
        Logger.write(`Manual transcription failed: ${error}`);
        terminate();
    }
});
