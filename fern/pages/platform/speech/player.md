# Media player

Learn how to play synthesized speech and pre-recorded audio files during an active call or conference in VoxEngine.

## Contents

- [Single media player](#single-media-player)
- [Sequence player](#sequence-player)

---

## Single media player

VoxEngine provides the [Player module]() for playing audio files and synthesized text-to-speech prompts.

To play audio during an incoming call, first [answer a call](). You can also broadcast audio before answering using [startEarlyMedia]() to play a greeting or early voicemail prompt.

* **Text-to-speech**: Use the [createTTSPlayer()]() method to generate a player instance from text. It accepts the same configuration options as [call.say()](). Refer to the [text-to-speech article]() for parameter details.
* **Audio files via URL**: Use the [createURLPlayer]() method to play pre-recorded audio files over HTTP/HTTPS. It accepts the media file URL and optional [URLPlayerParameters]().

After creating a TTS or URL player instance, stream its audio to the call using [sendMediaTo]():

```javascript title="Player usage sample"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/player.usage-sample.js
```

You can also use URL players to stream audio from third-party speech providers, such as [OpenAI TTS]().

<Warning title="Media player limit">
The maximum number of active media player instances per JavaScript session is 10.
</Warning>

---

## Sequence player

Using standalone [TTS players]() or [URL players]() is sufficient when playing one or two standalone tracks.

However, if you want to play multiple tracks sequentially—such as a text-to-speech greeting followed by a pre-recorded audio file—you must manually chain player events, listening for `PlaybackFinished` before creating and starting the next player:

```javascript title="Chaining multiple players manually"
// Create first player
const firstPlayer = VoxEngine.createTTSPlayer('Hello from the first player!');

// Send media from the first player to the call
firstPlayer.sendMediaTo(call);

// Listen for playback completion on the first player
firstPlayer.addEventListener(PlayerEvents.PlaybackFinished, () => {
  // Create second player
  const secondPlayer = VoxEngine.createURLPlayer({
    url: 'https://your_domain_address.com/your_media.mp3'
  });
  // Send media from the second player to the call
  secondPlayer.sendMediaTo(call);
});
```

When you need to play several tracks in sequence, managing nested event handlers becomes cumbersome. The [SequencePlayer]() solves this by accepting an array of "segments" (audio URLs or TTS strings with individual voice settings) and automatically handling sequential playback and event transitions:

```javascript title="Sequence player approach"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/player.sequence-player-approach.js
```

For detailed configuration options and event lifecycle details, refer to the [SequencePlayer reference]().