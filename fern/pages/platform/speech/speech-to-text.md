# Speech-to-text

You can recognize live speech during an active call or conference. In addition to standard speech-to-text, Voximplant supports realtime speech-to-text for streaming transcription while the caller is still speaking.

## Contents

- [Standard speech-to-text](#standard-speech-to-text)
  - [Speech-to-text usage](#speech-to-text-usage)
  - [Transcribing a call](#transcribing-a-call)
  - [Google beta STT features](#google-beta-stt-features)
  - [Passing parameters directly to the provider](#passing-parameters-directly-to-the-provider)
  - [Emotion and gender recognition](#emotion-and-gender-recognition)
  - [Receiving intermediate results](#receiving-intermediate-results)
- [Realtime speech-to-text](#realtime-speech-to-text)
  - [xAI](#xai)
- [See also](#see-also)

---

## Standard speech-to-text

Voximplant offers two modes of speech-to-text: Phrase hint and Freeform. **Phrase hint** mode recognizes user input from a predefined list of phrases, making it suitable for IVRs and voice-interactive dialogs. **Freeform** mode recognizes all user input and transcribes it into text, which is ideal for transcribing conversations.

You can use various speech-to-text engines such as Google, Amazon, Microsoft, Yandex, or T-bank. You can find the [profile names here]().

<Info title="Please note">
The **Phrase hint** mode is supported by the Google profile only. Google does not limit results strictly to the specified list, but words on the list have a higher likelihood of being recognized.
</Info>

### Speech-to-text usage

To set up speech-to-text in your scenario:

1. Import the ASR module into your scenario:

```javascript
require(Modules.ASR);
```

2. Use the [VoxEngine.createASR]() method to create an **STT object**.
3. Subscribe to **STT object** events such as [ASREvents.Result]().
4. Send media from a **call object** to the **STT object** via the [sendMediaTo]() method.
5. Receive the transcription results via events.

To use **Phrase hint** mode, specify the `phraseHints` parameter after the speech-to-text profile:

```javascript title="STT with hints"
require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;
  call.answer();
  call.say('Choose your color', { voice: VoiceList.Amazon.en_US_Joanna });
  call.addEventListener(CallEvents.PlaybackFinished, () => {
    call.sendMediaTo(asr);
  });

  const asr = VoxEngine.createASR({
    profile: ASRProfileList.Google.en_US,
    phraseHints: ['Yellow', 'Green', 'Red', 'Blue', 'White', 'Black']
  });

  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });

  asr.addEventListener(ASREvents.Result, (e) => {
    if (e.confidence > 0) {
      call.say(
        `You have chosen ${e.text} color, confidence is ${e.confidence}`,
        VoiceList.Amazon.en_US_Joanna
      );
    } else {
      call.say('Could not recognize your answer', VoiceList.Amazon.en_US_Joanna);
    }

    call.addEventListener(CallEvents.PlaybackFinished, () => VoxEngine.terminate());
  });
});
```

<Warning title="Please note">
The **Phrase hint** mode is supported by the Google profile only.
</Warning>

If you use **Freeform** mode, the [Result]() event is triggered every time speech is recognized. Because there is always a delay between capturing audio and recognizing it, plan user interactions accordingly:

```javascript title="STT without hints"
require(Modules.ASR);

let full_result = '';
let ts = null;
// ...
call.say('Please start saying something', { voice: VoiceList.Amazon.en_US_Joanna });
call.addEventListener(CallEvents.PlaybackFinished, () => {
  call.sendMediaTo(asr);
});
// ...
const asr = VoxEngine.createASR({ profile: ASRProfileList.Google.en_US });
asr.addEventListener(ASREvents.Result, (e) => {
  // Recognition results arrive here
  full_result += e.text + ' ';
  // If CaptureStarted is not triggered in 5 seconds, stop recognition
  ts = setTimeout(() => asr.stop(), 5000);
});
asr.addEventListener(ASREvents.SpeechCaptured, () => {
  // After speech has been captured - do not stop sending media to ASR
  // call.stopMediaTo(asr);
});
asr.addEventListener(ASREvents.CaptureStarted, () => {
  // Clear timeout if CaptureStarted has been triggered
  clearTimeout(ts);
});
// ...
```

### Transcribing a call

Use the [record]() method to transcribe a call or conference into a text file. Set the `transcribe` parameter to `true` and the `language` parameter to one of the supported languages:

```javascript title="Transcribe a call"
require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const outgoing = VoxEngine.callPSTN('+15559000800', e.call.callerid());
  VoxEngine.easyProcess(e.call, outgoing);
  e.call.record({
    transcribe: true,
    language: ASRLanguage.ENGLISH_US,
    provider: TranscriptionProvider.GOOGLE
  });
});
```

<Info title="Please note">
You can find the complete [list of supported transcription providers]() and the [list of available languages]() in the API reference.
</Info>

Unlike audio and video recordings, transcription results are not available immediately after a call ends. Retrieve them using the [GetCallHistory]() method of the HTTP API with the `with_records=true` parameter.

The response JSON contains a [records]() array with a [transcription_url]() field that points to the transcription as plain text:

```bash title="GetCallHistory request"
curl "https://api.voximplant.com/platform_api/GetCallHistory/?api_key=API_KEY&account_id=1&from_date=2019-08-01%2000%3A00%3A00&to_date=2019-08-07%2000%3A00%3A00&with_records=true"
```
```text title="GetCallHistory return"
Left 00:00:03 - 00:00:05 : Hello, this is a transcription test.
Right 00:00:15 - 00:00:23 : Hello.. The test is. Successful. Bye.
```

Each line in the transcription file is prefixed with "Left" to indicate an audio stream originating from a call endpoint and directed to the Voximplant cloud. Conversely, "Right" denotes an audio stream originating from the Voximplant cloud directed to a call endpoint. This naming convention follows the same logic used for left and right audio channels in stereo recording.

You can customize the "Left" and "Right" channel names using the [labels]() parameter. The [dict]() parameter allows you to supply an array of domain-specific words to improve accuracy during recognition.

### Google beta STT features

Since Google provides access to their [Speech API]() v1p1beta1 features, Voximplant supports them as well.

Currently, Voximplant speech-to-text supports the following beta features:

* `enableSeparateRecognitionPerChannel`
* `alternativeLanguageCodes`
* `enableWordTimeOffsets`
* `enableWordConfidence`
* `enableAutomaticPunctuation`
* `diarizationConfig`
* `metadata`

To use these features, set the `beta` parameter to `true` when creating an STT instance. Refer to the [API reference]() to learn about the parameters:

```javascript title="STT instance with v1p1beta1"
const myasr = VoxEngine.createASR({
  profile: ASRProfileList.Google.en_US,
  model: ASRModelList.Google.default_enhanced,
  beta: true,
  singleUtterance: false,

  enableSeparateRecognitionPerChannel: true,
  alternativeLanguageCodes: ['en_Gb'],
  enableWordTimeOffsets: true,
  enableWordConfidence: true,
  enableAutomaticPunctuation: true,
  diarizationConfig: {
    enableSpeakerDiarization: true
  },
  metadata: {
    microphoneDistance: 'NEARFIELD'
  }
});
```

With Google beta features enabled, the [ASREvents.Result]() event includes the **resultEndTime**, **channelTag**, and **languageCode** properties, visible in the session logs:

```javascript title="STT result"
2020-08-12 08:16:55 Sent event to JS onPhoneEvent with params[{
  id = fidawBgKTWujC7UbO2RqNB9Jsbx36k8DmPoXGzxu7wM;
  name = ASR.Result;
  requestId = ;
  response = {
    alternatives = [{
      confidence = 0.954676688;
      transcript = Hello internet, how are you ? ;
      words = [{
        confidence = 0.954676688;
        endTime = 1 s;
        speakerTag = 1;
        startTime = 0.100 s;
        word = Hello;
      }; {
        confidence = 0.954676688;
        endTime = 1.700 s;
        speakerTag = 1;
        startTime = 1 s;
        word = internet, ;
      }; {
        confidence = 0.954676688;
        endTime = 2.600 s;
        speakerTag = 1;
        startTime = 1.700 s;
        word = how;
      }; {
        confidence = 0.954676688;
        endTime = 2.700 s;
        speakerTag = 1;
        startTime = 2.600 s;
        word = are;
      }; {
        confidence = 0.954676688;
        endTime = 3 s;
        speakerTag = 1;
        startTime = 2.700 s;
        word = you ? ;
      };];
    };];isFinal = true;
    languageCode = en-us;
    resultEndTime = 4.450 s;
  };
  source = KdlKuFjhRUCr4F4Js7sTBU8Ysw1bmEMUib79EzYuKd0;
};]
```

### Passing parameters directly to the provider

There are two ways to pass speech-to-text parameters to your provider:

1. Configure parameters using [ASRParameters]() on the Voximplant side. The platform converts them to the provider’s format and sends them to your provider.
2. Provide parameters directly to the provider in the [request]() parameter.

<Warning title="About the formats">
Ensure that you specify parameters in the exact format your provider accepts. Formats vary across providers; refer to your provider’s API reference for details.
</Warning>

To pass parameters directly, select the provider in the [profile]() parameter of [createASR]() and supply the [request]() parameter in the provider's format:

```javascript title="Request parameter for Google STT"
require(Modules.ASR);

let call;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  call.answer();

  call.addEventListener(CallEvents.Connected, () => {
    const googlePlayer = VoxEngine.createTTSPlayer('', {
      voice: VoiceList.Google.en_GB_Wavenet_B,
      request: {
        input: {
          text: 'What is your favorite color?'
        },
        audioConfig: {
          volumeGainDb: 6.0,
          pitch: -5.0,
          speakingRate: 1.2
        }
      }
    });
    googlePlayer.sendMediaTo(call);

    const googleAsr = VoxEngine.createASR({
      profile: ASRProfileList.Google.en_US,
      request: {
        config: {
          profanity_filter: true,
          speech_contexts: {
            phrases: ['white', 'black', 'green', 'red', 'blue', 'yellow']
          },
          enable_word_confidence: true
        },
        single_utterance: true,
        interim_results: true
      }
    });

    call.sendMediaTo(googleAsr);

    googleAsr.addEventListener(ASREvents.SpeechCaptured, () => {
      call.stopMediaTo(googleAsr);
    });

    googleAsr.addEventListener(ASREvents.Result, (e) => {
      if (e.confidence > 0.5) {
        const googlePlayer = VoxEngine.createTTSPlayer('', {
          voice: VoiceList.Google.en_GB_Wavenet_B,
          request: {
            input: {
              text: `Your favorite color is ${e.text}, confidence is ${e.confidence}.`
            },
            audioConfig: {
              volumeGainDb: 6.0,
              pitch: -5.0,
              speakingRate: 1.2
            }
          }
        });
        googlePlayer.sendMediaTo(call);
      } else {
        const googlePlayer = VoxEngine.createTTSPlayer('', {
          voice: VoiceList.Google.en_GB_Wavenet_B,
          request: {
            input: {
              text: 'Sorry! Could not recognize your answer'
            },
            audioConfig: {
              volumeGainDb: 6.0,
              pitch: -5.0,
              speakingRate: 1.2
            }
          }
        });
        googlePlayer.sendMediaTo(call);
      }
    });
    setTimeout(VoxEngine.terminate, 10000);
    call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  });
});
```

Here are examples of the request parameter for common providers:

```javascript title="Request parameter examples"
// This is not a full scenario
// This is a list of examples for different providers

// SaluteSpeech provider
request: {
  hypotheses_count: 1,
  enable_profanity_filter: true,
  enable_multi_utterance: true,
  enable_partial_results: true,
  no_speech_timeout: {seconds: 3},
  max_speech_timeout: {seconds: 10},
  hints: {
    words: ["black", "white", "blue", "green", "red", "yellow"],
  },
},

// T-bank provider
request: {
  config: {
    profanity_filter: true,
    speech_contexts: {
      phrases: [
        {
          text: "white",
          score: 2.0,
        },
        {
          text: "black",
          score: 2.0,
        },
        {
          text: "red",
          score: 3.0,
        },
        {
          text: "blue",
          score: 1.0,
        },
        {
          text: "green",
          score: 1.5,
        },
      ],
    },
  },
},

// Yandex provider
request: {
  specification: {
    profanity_filter: false,
    partial_results: false,
    raw_results: false,
  },
},
```

### Emotion and gender recognition

Some voice recognition providers offer additional analysis, such as emotion or gender recognition. Support depends on the provider and their specific implementation; consult your provider's API documentation for details.

For example, [T-bank STT]() supports gender identification, and [SaluteSpeech STT]() supports emotion recognition.

To request this information, send the parameters in the [request]() field as described in [Passing parameters directly to the provider](#passing-parameters-directly-to-the-provider).

To request emotion recognition from SaluteSpeech, pass `emotions_result` in the [request]() parameter. SaluteSpeech returns the emotion breakdown along with the speech-to-text result:

```javascript title="Request emotion recognition from SaluteSpeech"
require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;
  call.answer();
  const asr = VoxEngine.createASR({
    profile: ASRProfileList.SaluteSpeech.ru_RU,
    request: {
      enable_multi_utterance: true,
      no_speech_timeout: { seconds: 3 },
      max_speech_timeout: { seconds: 10 },
      emotions_result: ['positive', 'neutral', 'negative']
    }
  });
  call.sendMediaTo(asr);
  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });
  asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
});
```
```json
{
  // other parameters
  "response": {
    "emotionsResult": {
      "negative": 0.003373496,
      "neutral": 0.996082962,
      "positive": 0.000543531496
    }
  },
  "text": "check one two three"
}
```

Similarly, to request gender recognition from T-bank, pass `enable_gender_identification` in the [request]() parameter. T-bank returns gender identification probabilities alongside the speech-to-text results:

```javascript title="Request gender recognition from T-bank"
require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;
  call.answer();
  const asr = VoxEngine.createASR({
    profile: ASRProfileList.TBank.ru_RU,
    request: {
      interim_results_config: {
        enable_interim_results: true,
      },
      single_utterance: true,
      config: {
        enable_gender_identification: true,
      },
    },
  });
  call.sendMediaTo(asr);
  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });
  asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
});
```
```json
{
  // other parameters
  "response": {
    "results": [
      {
        "recognitionResult": {
          "genderIdentificationResult": {
            "femaleProba": 0.831116796,
            "maleProba": 0.168883175
          }
        }
      }
    ]
  },
  "text": "check one two three"
}
```

### Receiving intermediate results

Many STT providers support intermediate speech-to-text results to speed up interaction handling.

When this feature is enabled, recognized text is sent to the scenario via events while the caller is still speaking, allowing you to process partial transcripts in real time.

<Info title="Supported providers">
Refer to the [API reference]() to learn which providers support this feature. The list of supported providers may change over time.
</Info>

To enable this feature, set the [interimResults]() parameter in `ASRParameters` to `true`, then listen for the [ASREvents.InterimResult]() event to receive the intermediate text:

```javascript title="InterimResults parameter example"
require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;
  call.answer();
  const asr = VoxEngine.createASR({
    profile: ASRProfileList.TBank.ru_RU,
    maxAlternatives: 3,
    profanityFilter: true,
    singleUtterance: true,
    interimResults: true
  });
  call.sendMediaTo(asr);
  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });
  asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
  asr.addEventListener(ASREvents.InterimResult, (e) => {
    Logger.write(JSON.stringify(e));
  });
});
```

---

## Realtime speech-to-text

In addition to standard [speech-to-text](), where recognition runs on buffered or recorded audio, some providers support **realtime** speech-to-text: transcription updates while the caller is still speaking.

This streaming mode is beneficial for live captioning, voice assistants, and LLM pipelines that require partial transcripts with minimal latency.

### xAI

The xAI Speech-to-Text API supports realtime recognition over WebSockets. See the xAI documentation for provider details:

- [Speech to Text]()
- [Voice API reference]()

To use xAI realtime speech-to-text in your application:

1. Import the ASR module into your [scenario]() via `require(Modules.ASR)` (see [Speech-to-text usage](#speech-to-text-usage)).
2. Create an STT object with [VoxEngine.createASR]() and set [profile]() to an [ASRProfileList.XAI]() entry (for example, `ASRProfileList.XAI.en`, another language profile, or `ASRProfileList.XAI.auto` to omit `language` from the provider query).
3. Optionally set [model]() (for example, `ASRModelList.XAI.grok_voice_transcribe_2_0`; defaults to **grok-voice-transcribe-2.0**).
4. Send call audio to the STT object with [Call.sendMediaTo]().
5. Subscribe to [ASREvents]() (such as [Result]() and [InterimResult]()) and implement your logic. To receive partial transcripts, enable [interimResults]() as described in [Receiving intermediate results](#receiving-intermediate-results).

<Info title="API authentication">
Custom `api_key` values are not supported. The platform authenticates to xAI using the Voximplant integration key.
</Info>

#### Multichannel audio

For stereo or other multi-track input, set [multichannel]() to **true** and [channels]() to the number of interleaved channels (from **2** to **8**) when calling [createASR](). You can set these fields in [ASRParameters]() or pass the equivalent options in the provider [request]() object.

When multichannel recognition is enabled, each [ASREvents.Result]() event includes a **channelTag** indicating the channel index for that transcript. Use **channelTag** in your scenario to route or display text per channel.

Here is a complete scenario without a [request]() parameter:

```javascript title="xAI realtime STT scenario example"
/*
 * Description:
 * xAI ASR profile recognition on an answered call.
 */

require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;

  call.answer();

  const asr = VoxEngine.createASR({
    profile: ASRProfileList.XAI.en,
    model: ASRModelList.XAI.grok_voice_transcribe_2_0,
    interimResults: true,
    // endpointing: 400,
    // diarize: false,
    // fillerWords: false,
    // multichannel: false,
    // channels: 2,
    // keyterm: ['Voximplant', 'xAI'],
    // smartTurn: 0.7,
    // smartTurnTimeout: 3000,
    // vadThreshold: 0.08,
    // statistics: true,
    // traceConfig: true,
  });

  call.sendMediaTo(asr);

  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });
  asr.addEventListener(ASREvents.ASRError, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
  asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
});

```

To pass xAI-specific options in the provider’s native format, use the [request]() parameter on [createASR]():

```javascript title="Request parameter usage"
/*
 * Description:
 * xAI ASR with provider request object.
 */

require(Modules.ASR);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let call = e.call;

  call.answer();

  const asr = VoxEngine.createASR({
    profile: ASRProfileList.XAI.en,
    model: ASRModelList.XAI.grok_voice_transcribe_2_0,
    request: {
      interim_results: true,
      endpointing: 400,
      smart_turn: 0.7,
      smart_turn_timeout: 3000,
      keyterm: ['Voximplant', 'xAI'],
    },
    // statistics: true, // looks like private
    // traceConfig: true, // looks like private
  });

  call.sendMediaTo(asr);

  asr.addEventListener(ASREvents.SpeechCaptured, () => {
    call.stopMediaTo(asr);
  });
  asr.addEventListener(ASREvents.ASRError, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
  asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write(JSON.stringify(e));
    VoxEngine.terminate();
  });
});

```

---

## See also

- [External speech processing providers]()
- [Realtime text-to-speech]()