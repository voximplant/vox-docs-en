require(Modules.Inworld);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({call}) => {
    call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, () => VoxEngine.terminate());

    call.addEventListener(CallEvents.Connected, () => {
        const contextId = "tts-metrics";
        const player = Inworld.createRealtimeTTSPlayer({
            // optional: use your own Inworld account via Voximplant Secrets
            // apiKey: VoxEngine.getSecretValue("INWORLD_API_KEY"),
            createContextParameters: {
                create: {modelId: "inworld-tts-1.5-max", voiceId: "Dennis"},
                contextId,
            },
        });

        player.addEventListener(PlayerEvents.Error, (event) => {
            Logger.write("===TTS_ERROR=== " + JSON.stringify(event));
            VoxEngine.terminate();
        });
        player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, (event) => {
            // the event arrives after playback; the metric measures request-to-first-byte time
            Logger.write("===TTS_TTFB_MS=== " + event.timeToFirstByte);
            call.hangup();
        });

        player.sendMediaTo(call);
        player.send({
            send_text: {
                text: "Hello! This example measures how quickly speech synthesis returns audio.",
                flush_context: {},
            },
            contextId,
        });

        // bound the demo session if synthesis does not complete
        setTimeout(() => VoxEngine.terminate(), 30000);
    });

    call.answer();
});
