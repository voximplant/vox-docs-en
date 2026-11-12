# Text-to-speech

You can synthesize speech and send it to your interlocutor before and during an active call or conference. In addition to standard text-to-speech, Voximplant supports realtime text-to-speech for streaming synthesis from dynamic sources such as Large Language Models (LLMs).

## Contents

- [Standard text-to-speech](#standard-text-to-speech)
  - [Text-to-speech usage](#text-to-speech-usage)
  - [Configuring the voice](#configuring-the-voice)
  - [Passing parameters directly to the provider](#passing-parameters-directly-to-the-provider)
- [Realtime text-to-speech](#realtime-text-to-speech)
  - [VoxTTS](#voxtts)
  - [Google](#google)
  - [ElevenLabs](#elevenlabs)
  - [Cartesia](#cartesia)
  - [Inworld](#inworld)
  - [xAI](#xai)

---

## Standard text-to-speech

### Text-to-speech usage

To synthesize speech during an incoming call, first [answer a call](). You can also use the [startEarlyMedia]() method to broadcast speech before answering the call to play a greeting or a voicemail prompt.

To synthesize speech, use the [VoxEngine.createTTSPlayer]() method in your scenario. Pass the text string to synthesize as the first parameter and the options as the second parameter:

```javascript title="Synthesize speech"
VoxEngine.createTTSPlayer('Hello, you have created a TTSPlayer, have fun!', {
  voice: VoiceList.Google.en_US_Standard_C
});
```

### Configuring the voice

You can choose a text-to-speech voice from the [VoiceList](). The default voice is [VoiceList.Amazon.en_US_Joanna]().

If you use a custom voice with one of the providers from the [VoiceList](), please contact support to activate this feature for your account and receive setup instructions. For example, for [VoiceList.Yandex]() you must specify the voice folder ID using the [yandexCustomModelName]() property.

You can also configure other text-to-speech options such as **pitch**, **rate**, and **volume**. To specify them, use the [CallSayParameters.ttsOptions]() parameter with the [Call.say]() method, or the [TTSPlayerParameters.ttsOptions]() parameter with the [VoxEngine.createTTSPlayer]() method:

```javascript title="Configure the voice options"
VoxEngine.createTTSPlayer('Hello from the cloud', {
  voice: VoiceList.Amazon.en_US_Joanna,
  ttsOptions: {
    pitch: 'high',
    volume: 'loud',
    rate: 'x-slow'
  }
});
```

These options accept the following values:

- **pitch** (voice pitch): Numbers followed by "Hz" from ***0.5*** Hz to ***2*** Hz, or one of: ***x-low***, ***low***, ***medium***, ***high***, ***x-high***, ***default***
- **rate** (speech speed): ***x-slow***, ***slow***, ***medium***, ***fast***, ***x-fast***, ***default***
- **volume** (speech volume): ***silent***, ***x-soft***, ***soft***, ***medium***, ***loud***, ***x-loud***, ***default***

If you want to apply these settings to the entire text, you do not need to use the `speak` tag. If you want to apply specific attributes to only a part of the text, specify the `speak` tag manually.

<Warning title="Please note">
The supported tag list depends on the speech provider. You can find these lists in the provider's official documentation. If you use an unsupported tag, the [PlaybackFinished]() event is triggered with a **400** error.
</Warning>

For example, when using [VoiceList.Amazon](), use the `prosody` tag to control the **volume**, **rate**, or **pitch** of a selected text fragment. Here is how to make a fragment sound higher in pitch:

```javascript title="Amazon's prosody tag"
VoxEngine.createTTSPlayer(
  "<speak>Do you like synthesized speech <prosody pitch='high'>with a pitch that is higher than normal?></prosody></speak>",
  { voice: VoiceList.Amazon.en_US_Joanna }
);
```

Here is another example using Amazon's `say-as` tag:

```javascript title="Amazon's say-as tag"
VoxEngine.createTTSPlayer(
  "<speak>I was born on <say-as interpret-as='date' format='mdy'>12-31-1990</say-as></speak>",
  { voice: VoiceList.Amazon.en_US_Joanna }
);
```

### Passing parameters directly to the provider

There are two ways to pass text-to-speech parameters to your provider:

1. Fill the [ttsOptions]() parameters on the Voximplant side so the platform converts them into the provider's format before sending them.
2. Pass parameters directly to the provider via the [CallSayParameters.request]() parameter for the [Call.say]() method, or via the [TTSPlayerParameters.request]() parameter for the [VoxEngine.createTTSPlayer]() method.

<Warning title="About the formats">
You must specify parameters in the specific format required by your provider. Refer to your provider's API reference for format specifications.
</Warning>

Here is a complete scenario example showing how to use the request parameter with [VoiceList.Google]():

```javascript title="Request parameter for Google TTS"
let call;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  call.answer();

  call.addEventListener(CallEvents.Connected, () => {
    const googlePlayer = VoxEngine.createTTSPlayer('', {
      voice: VoiceList.Google.en_AU_Wavenet_D,
      request: {
        // 'SynthesizeSpeechRequest' in the Google documentation
        input: {
          ssml: `<speak> Step 1, take a deep breath. 
                <break time="200ms"/> Step 2, exhale. 
                Step 3, take a deep breath again. 
                <break strength="weak"/> Step 4, exhale. </speak>`
        },
        audioConfig: {
          volumeGainDb: 6.0,
          pitch: -5.0,
          speakingRate: 1.2
        }
      }
    });
    googlePlayer.sendMediaTo(call);
    setTimeout(VoxEngine.terminate, 7000);
    call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  });
});
```

Here are examples of the request parameter for common providers:

```javascript title="Request parameter examples"
// This is not a full scenario
// This is a list of examples for different providers

// ElevenLabs provider
request: { // 'data' parameter in the ElevenLabs documentation
    text: 'I used to be an adventurer like you, then I took an arrow in the knee',
    model_id: 'eleven_multilingual_v2', // NOTE: required parameter, MUST be specified!
    voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
    },
}

// SaluteSpeech provider
request: { // 'SynthesisRequest' parameter in the SaluteSpeech documentation
    text: "Greetings! Thank you for your call.",
    content_type: "text",
}

// T-bank provider
request: { // 'SynthesizeSpeechRequest' parameter in the T-bank documentation
    input: {
        text: "Greetings! Thank you for your call.",
    }, 
},

// Yandex v3 provider
request: { // 'UtteranceSynthesisRequest' parameter in the YandexV3 documentation
    text_template: { 
      text_template: "The {animal} goes to the {place}",
      variables: [
        {
          variable_name: "animal",
          variable_value: "cat",
        },
        {
          variable_name: "place",
          variable_value: "forest",
        },
      ],
    },
    hints: [
      { voice: "john" },
      { speed: 0.8 },
    ],
}
```

<Warning title="Please note">
Different providers require different parameters. In some cases, omitting a parameter causes an error; in others, default values are applied. For example, the `model_id` parameter for [ElevenLabs]() specifies the [selected model](). If omitted, `eleven_multilingual_v2` is used by default. Check your chosen provider's documentation for detailed parameter requirements.
</Warning>

#### Third-party provider documentation

Refer to the documentation of third-party text-to-speech providers for guidance on constructing the request parameter in your scenario:

- [ElevenLabs]()
- [Google TTS request reference]()
- [SaluteSpeech TTS request reference]()
- [T-bank TTS request reference]()
- [Yandex TTS request reference]()

Alternatively, you can use the [Media player]() to integrate third-party voice providers such as [OpenAI TTS]().

---

## Realtime text-to-speech

Unlike standard text-to-speech, where you submit a complete text string upfront, realtime text-to-speech synthesizes speech in a continuous stream as text is generated. This is especially useful when streaming text in chunks from Large Language Models (LLMs) such as ChatGPT.

### VoxTTS

Voximplant offers an in-house realtime text-to-speech service called VoxTTS (*currently available in Russian only*).

To use VoxTTS in your application:

```javascript title="VoxTTS scenario example"
require(Modules.VoxTTS);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const request = {
      create: {
        modelId: VoxTTS.ModelList.VoxTTS,
        voiceId: VoxTTS.VoiceList.Anna,
      },
      contextId: 'ctx-1',
    };

    const VoxTTSRealtimeTTSPlayerParameters = {
      createContextParameters: request,
    };
    const player = VoxTTS.createRealtimeTTSPlayer(VoxTTSRealtimeTTSPlayerParameters);
    player.sendMediaTo(call);

    const sendParameters = {
      send_text: {
        text: 'Hello, what a wonderful day to be a text-to-speech model!',
        flush_context: {},
      },
      contextId: 'ctx-1',
    };
    player.send(sendParameters);

    // End realtime player session in 15 sec
    setTimeout(() => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      ); // Play mp3 file
      playerUrl.sendMediaTo(call); // end session in 5 sec
      setTimeout(VoxEngine.terminate, 5000);
    }, 15000);
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});

```

1. Require the `Modules.VoxTTS` module in your [scenario]().
2. Create a `VoxTTS.RealtimeTTSPlayer` instance using the `VoxTTS.createRealtimeTTSPlayer` method and provide your parameters.
3. Stream media between `Call` and `VoxTTS.RealtimeTTSPlayer` using `*.sendMedia` or `VoxEngine.sendMediaBetween`.
4. Listen to `VoxTTS.RealtimeTTSPlayer` events and implement your application logic.

#### Stressed syllables

You can manually specify which vowel to stress by adding an [acute accent]() to the vowel in the text:

```javascript title="Stressed syllables example"
const sendParameters = {
  'send_text': {
    'text': 'The meaning of the word recórd differs from the word récord.',
    'flush_context': {},
  },
  'contextId': 'ctx-1',
};
```

### Google

To use realtime text-to-speech from Google:

```javascript title="Google Realtime TTS"
require(Modules.Google);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const GoogleRealtimeTTSPlayerParameters = {
      language_code: 'en-US',
      voice: 'Aoede',
    };
    const player = Google.createRealtimeTTSPlayer(GoogleRealtimeTTSPlayerParameters);
    player.sendMediaTo(call);

    const sendParameters = {
      input: {
        text: 'Hello, what a wonderful day to be a text-to-speech model!',
      },
    };
    player.send(sendParameters);

    // End realtime player session in 15 sec
    setTimeout(() => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      ); // Play mp3 file
      playerUrl.sendMediaTo(call); // end session in 5 sec
      setTimeout(VoxEngine.terminate, 5000);
    }, 15000);
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});

```

1. Require the `Modules.Google` module in your [scenario]().
2. Create a `Google.RealtimeTTSPlayer` instance using the `Google.createRealtimeTTSPlayer` method and provide your parameters.
3. Stream media between `Call` and `Google.RealtimeTTSPlayer` using `*.sendMedia` or `VoxEngine.sendMediaBetween`.
4. Listen to `Google.RealtimeTTSPlayer` events and implement your application logic.

Learn more about Google Cloud Text-to-Speech V1 in the [official documentation]().

### ElevenLabs

To use ElevenLabs realtime text-to-speech, require the [Modules.ElevenLabs]() module in your [scenario]().

Use the [ElevenLabs.createRealtimeTTSPlayer]() method to create a realtime TTS player with the desired parameters. Use `*.sendMedia` or `VoxEngine.sendMediaBetween` to send media between `Call` and `ElevenLabs.RealtimeTTSPlayer`.

Listen to [ElevenLabs.RealtimeTTSPlayer]() events to implement your application logic.

```javascript title="ElevenLabs Realtime TTS"
require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const messages = ['Hi! ', 'My name is Alice! ', 'How can I help you today?'];
    const pathParameters = {
      voice_id: 'Xb7hH8MSUJpSbSDYk0k2' // Alice
    };
    const queryParameters = {
      model_id: 'eleven_flash_v2_5'
    };
    const elevenLabsRealtimeTTSPlayerParameters = {
      pathParameters,
      queryParameters,
      keepAlive: true
    };
    const player = ElevenLabs.createRealtimeTTSPlayer(
      messages[0],
      elevenLabsRealtimeTTSPlayerParameters
    );
    player.sendMediaTo(call);
    for (let i = 1; i < messages.length; i++) {
      const isLast = i === messages.length - 1;
      player.sendText({ text: messages[i], flush: isLast });
    }
    player.sendText({ text: '' });
    player.addEventListener(PlayerEvents.PlaybackFinished, () => {
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      );
      playerUrl.sendMediaTo(call);
      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

#### Custom API keys

If you have a personal API key for ElevenLabs, specify it in your scenario to personalize your setup (for example, to use custom voices). For ElevenLabs, pass the custom API key in the `headers` parameter:

```javascript title="Custom API key for ElevenLabs"
require(Modules.ElevenLabs);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const text = 'A list of starting times';
    const pathParameters = {
      voice_id: 'Xb7hH8MSUJpSbSDYk0k2'
    };
    const queryParameters = {
      model_id: 'eleven_flash_v2_5',
      enable_ssml_parsing: true,
      inactivity_timeout: 30 // this one can be changed for the test variations
    };
    const initializeConnectionParameters = {
      voice_settings: {
        speed: 0.7
      }
    };
    const player = ElevenLabs.createRealtimeTTSPlayer(text, {
      pathParameters,
      queryParameters,
      headers: [{ name: 'xi-api-key', value: VoxEngine.getSecretValue('elevenlabs_api_key') }],
      keepAlive: false,
      initializeConnectionParameters
    });
    player.sendMediaTo(call);

    setTimeout(() => {
      let sendTextParameters = {
        text: 'Finish append',
        flush: true
      };
      player.sendText(sendTextParameters);
      sendTextParameters.text = '';
      player.sendText(sendTextParameters);
    }, 25000);

    player.addEventListener(PlayerEvents.PlaybackFinished, () => {
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      );
      playerUrl.sendMediaTo(call);
      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

### Cartesia

To use Cartesia, require the [Modules.Cartesia]() module in your [scenario]().

Use the [Cartesia.createRealtimeTTSPlayer]() method to create a realtime TTS player with your desired parameters.

Listen to [Cartesia.RealtimeTTSPlayer]() events to implement your application logic.

```javascript title="Cartesia Realtime TTS"
require(Modules.Cartesia);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const text = "Hello, world! I'm generating audio";
    const request = {
      model_id: 'sonic-3',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      language: 'en',
      context_id: 'happy-monkeys-fly',
      continue: true
    };

    const cartesiaRealtimeTTSPlayerParameters = {
      generationRequestParameters: request
    };
    const player = Cartesia.createRealtimeTTSPlayer(text, cartesiaRealtimeTTSPlayerParameters);
    player.sendMediaTo(call);

    player.generationRequest({
      model_id: 'sonic-3',
      transcript: 'next phrase',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      language: 'en',
      context_id: 'happy-monkeys-fly',
      continue: true
    });

    const flushRequest = {
      model_id: 'sonic-3',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      context_id: 'happy-monkeys-fly',
      flush: true,
      continue: true
    };

    player.generationRequest(flushRequest);

    // End realtime player session on 'AudioChunksPlaybackFinished' event
    player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, () => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      );
      playerUrl.sendMediaTo(call);
      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

#### Flush request

The `flushRequest` shown in the example is optional and allows you to force immediate playback of buffered content.

Generating audio for longer phrases takes more time, which may cause silence while the audio is rendered. Phrases are generated in chunks and stored in a buffer. Calling a flush request immediately plays out all buffered content to the user, improving responsiveness.

When all generated audio chunks finish playing, the `AudioChunksPlaybackFinished` event is triggered. You can handle this event to trigger subsequent actions.

#### Custom API keys

If you have a personal API key for Cartesia, specify it in the `cartesiaRealtimeTTSPlayerParameters` object to use your custom voices and settings:

```javascript title="Custom API key for Cartesia"
require(Modules.Cartesia);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const text = "Hello, world! I'm generating audio";
    const request = {
      model_id: 'sonic-3',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      language: 'en',
      context_id: 'happy-monkeys-fly',
      continue: true
    };

    const cartesiaRealtimeTTSPlayerParameters = {
      generationRequestParameters: request
    };
    const player = Cartesia.createRealtimeTTSPlayer(text, cartesiaRealtimeTTSPlayerParameters);
    player.sendMediaTo(call);

    player.generationRequest({
      model_id: 'sonic-3',
      transcript: 'next phrase',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      language: 'en',
      context_id: 'happy-monkeys-fly',
      continue: true
    });

    const flushRequest = {
      model_id: 'sonic-3',
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      context_id: 'happy-monkeys-fly',
      flush: true,
      continue: true
    };

    player.generationRequest(flushRequest);

    // End realtime player session on 'AudioChunksPlaybackFinished' event
    player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, () => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      );
      playerUrl.sendMediaTo(call);
      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

### Inworld

To use Inworld realtime text-to-speech, require the `Modules.Inworld` module in your [scenario]().

Use the `Inworld.createRealtimeTTSPlayer` method to create a realtime TTS player and configure your parameters. Use `*.sendMedia` or `VoxEngine.sendMediaBetween` to send media between `Call` and `Inworld.RealtimeTTSPlayer`.

Listen to `Inworld.RealtimeTTSPlayer` events to implement your application logic. When all generated audio chunks finish playing, the `AudioChunksPlaybackFinished` event is triggered.

```javascript title="Inworld Realtime TTS"
require(Modules.Inworld);

let call, playerUrl;

VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  e.call.answer();
  call = e.call;
  e.call.addEventListener(CallEvents.Connected, function (callEvent) {
    const request = {
      create: {
        modelId: 'inworld-tts-1.5-max',
        voiceId: 'Dennis',
      },
      contextId: 'ctx-1',
    };

    const inworldRealtimeTTSPlayerParameters = {
      createContextParameters: request,
      // apiKey: VoxEngine.getSecretValue('inworld_api_key'),
    };
    const player = Inworld.createRealtimeTTSPlayer(inworldRealtimeTTSPlayerParameters);
    const sendTextParameters = {
      send_text: {
        text: 'Hello, what a wonderful day to be a text-to-speech model!',
        flush_context: {},
      },
      contextId: 'ctx-1',
    };
    player.send(sendTextParameters);
    player.sendMediaTo(call);

    // When TTS playback is finished
    player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, (playerEvent) => {
      playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      ); // Play mp3 file

      playerUrl.sendMediaTo(call); // end session in 10 sec

      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  e.call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});

```

<Info title="Inworld API reference">
You can find more information about this API on the Inworld [documentation website]().
</Info>

#### Custom API keys

If you have a personal API key for Inworld, specify it in the `inworldRealtimeTTSPlayerParameters` object using the Basic (Base64) key from the Inworld developer portal. Refer to the [Inworld documentation]() for more details.

```javascript title="Custom API key for Inworld"
require(Modules.Inworld);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const request = {
      create: {
        modelId: 'inworld-tts-1',
        voiceId: 'Dennis'
      }
    };

    const inworldRealtimeTTSPlayerParameters = {
      createContextParameters: request,
      apiKey: VoxEngine.getSecretValue('inworld_api_key')
    };
    const player = Inworld.createRealtimeTTSPlayer(inworldRealtimeTTSPlayerParameters);
    player.sendMediaTo(call);

    const sendTextParameters = {
      send_text: {
        text: 'Hello, what a wonderful day to be a text-to-speech model!',
        flush_context: {}
      }
    };
    player.send(sendTextParameters);

    // End realtime player session on 'AudioChunksPlaybackFinished' event
    player.addEventListener(PlayerEvents.AudioChunksPlaybackFinished, () => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      );
      playerUrl.sendMediaTo(call);
      setTimeout(VoxEngine.terminate, 10000);
    });
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

### xAI

xAI provides a realtime text-to-speech service over WebSockets. Learn more about the streaming TTS API [in their documentation]().

To use xAI realtime speech synthesis:

- Require `Modules.XAI` in your scenario.
- Create an `XAI.RealtimeTTSPlayer` instance using the `XAI.createRealtimeTTSPlayer` method and provide your parameters.
- Send media between `Call` and `XAI.RealtimeTTSPlayer` using `*.sendMedia` or `VoxEngine.sendMediaBetween`.
- Listen to `XAI.RealtimeTTSPlayer` events (via the `PlayerEvents` event list) and implement your application logic.

Connection parameters (such as `voice` and `language`) are passed in `connectionParameters` when creating the player. Voximplant maps them to xAI WebSocket query parameters and applies telephony audio settings (`codec=pcm`, `sample_rate=16000`).

Utterances are sent as native xAI WebSocket messages using `player.send()`.

```javascript title="xAI scenario example"
require(Modules.XAI);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Connected, () => {
    const player = XAI.createRealtimeTTSPlayer({
      connectionParameters: {
        voice: 'eve',
        language: 'en',
      },
    });
    player.sendMediaTo(call);

    player.send({ type: 'text.delta', delta: 'Hello! Welcome to the xAI Text to Speech API.' });
    player.send({ type: 'text.done' });

    // End realtime player session in 15 sec
    setTimeout(() => {
      player.stop();
      const playerUrl = VoxEngine.createURLPlayer(
        { url: 'https://cdn.voximplant.com/yodl.mp3' },
        { loop: true }
      ); // Play mp3 file
      playerUrl.sendMediaTo(call); // end session in 5 sec
      setTimeout(VoxEngine.terminate, 5000);
    }, 15000);
  });
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});

```