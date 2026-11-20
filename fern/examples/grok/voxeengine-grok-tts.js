/**
 * xAI streaming TTS demo, adapted from Chad Hart's Grok TTS example (PR #56).
 * Six utterances, expressive speech tags, and a timer-simulated interruption.
 */
require(Modules.XAI);

const TTS_TEXT = [
    "Hello! [pause] Welcome to Grok text to speech with Voximplant.",
    "This example streams several utterances on the same connection.",
    "<emphasis>Speech tags</emphasis> can shape how a phrase is delivered.",
    "<whisper>This short aside uses a different delivery style.</whisper>",
    "You can use a built-in voice, or the ID of a custom voice from your xAI account.",
    "The demo also shows how to clear queued speech and replace it with a new utterance. Goodbye!",
];

VoxEngine.addEventListener(AppEvents.CallAlerting, ({call}) => {
    let player;
    let nextUtterance = 0;
    let finished = false;
    let interruptTimer;
    const terminate = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        clearTimeout(interruptTimer);
        player?.stop();
        VoxEngine.terminate();
    };
    const timeout = setTimeout(() => {
        Logger.write("xAI TTS demo timed out");
        terminate();
    }, 60000);

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);
    call.addEventListener(CallEvents.Connected, () => {
        try {
            // Optional: omit the secret to use Voximplant's provider credentials.
            const apiKey = VoxEngine.getSecretValue("XAI_API_KEY");
            player = XAI.createRealtimeTTSPlayer({
                connectionParameters: {
                    voice: "eve",
                    language: "en",
                    optimize_streaming_latency: 1,
                },
                ...(apiKey ? {apiKey} : {}),
            });

            const streamText = (text) => {
                // Keep whitespace in every delta; xAI concatenates the chunks.
                for (const delta of text.match(/\S+\s*/g) || []) {
                    player.send({type: "text.delta", delta});
                }
                player.send({type: "text.done"});
            };
            player.addEventListener(PlayerEvents.Error, (event) => {
                Logger.write("xAI TTS error: " + JSON.stringify(event));
                terminate();
            });
            player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, (event) => {
                if (finished) return;
                Logger.write("xAI TTS utterance finished; TTFB (ms): " + event.timeToFirstByte);
                if (nextUtterance < TTS_TEXT.length) {
                    streamText(TTS_TEXT[nextUtterance++]);
                } else {
                    terminate();
                }
            });
            [
                PlayerEvents.Created,
                PlayerEvents.PlaybackReady,
                PlayerEvents.Started,
                PlayerEvents.Stopped,
                PlayerEvents.PlaybackFinished,
                PlayerEvents.PlaybackMarkerReached,
                PlayerEvents.PlaybackBuffering,
            ].forEach((eventName) => {
                player.addEventListener(eventName, (event) => {
                    Logger.write("===xAI TTS " + eventName + "=== " + JSON.stringify(event));
                });
            });
            player.sendMediaTo(call);
            streamText(TTS_TEXT[nextUtterance++]);

            // Simulate an application interruption; the player has no speech detector.
            interruptTimer = setTimeout(() => {
                if (finished) return;
                Logger.write("===SIMULATED BARGE-IN===");
                player.clearBuffer(); // also sends text.clear to xAI
                streamText("The queued speech was interrupted. [pause] Here is the replacement utterance.");
            }, 23000);
        } catch (error) {
            Logger.write("xAI TTS setup failed: " + error);
            terminate();
        }
    });
    call.answer();
});
