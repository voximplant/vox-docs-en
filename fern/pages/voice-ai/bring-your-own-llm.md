# Bring your own LLM

Voximplant allows you to connect your own text-based large language model (LLM) to build voice AI applications. This approach gives you complete control over your model provider, prompt engineering, and orchestration logic, while Voximplant manages the real-time voice and telephony layer.

In this architecture, your LLM is responsible for reasoning, context management, and generating text responses. Voximplant handles the surrounding real-time audio pipeline: transcribing caller speech into text, accurately detecting when the user starts and finishes speaking, and streaming the generated response back as natural speech.

---

## What Voximplant provides

### Speech-to-text (STT) across multiple providers

Voximplant provides [automatic speech-to-text]() through a wide selection of industry-leading speech recognition engines. You can select the provider that best aligns with your target languages, latency budgets, accuracy requirements, and pricing models.

This flexibility allows you to optimize recognition for noisy environments, support niche dialects, or maintain consistency with your existing cloud infrastructure.

### VAD and turn detection

Natural conversations require more than speech recognition—your application must understand *when* a user is speaking and determine when they have completed their thought.

Voximplant integrates [Silero VAD and Pipecat Turn Detection]():

* **Silero VAD**: Distinguishes human speech from ambient background noise and silence in the incoming audio stream.
* **Pipecat Turn Detection**: Differentiates between brief mid-sentence pauses and the true completion of an utterance.

Working in tandem, these modules minimize accidental interruptions and eliminate awkward delays, delivering a responsive, human-like conversational flow.

### Text-to-speech (TTS) streaming

Once your LLM generates a text response, Voximplant can [convert that text into speech]() using high-quality neural TTS providers supporting dozens of languages, accents, and speaking styles.

As with STT, you can swap TTS providers dynamically to find the ideal balance of voice naturalness, emotional tone, streaming latency, and cost for your specific use case.

---

## Usage example

<Aside>
```javascript title="OpenAI Responses API example"
require(Modules.OpenAI); // AI responses
require(Modules.Inworld); // Real-time TTS
require(Modules.ASR); // Speech-to-text
require(Modules.Silero); // Voice Activity Detection (VAD)
require(Modules.Pipecat); // Turn-taking detection

/** CONFIG */
const CONFIG = {
  tts: { modelId: 'inworld-tts-1.5-max', voiceId: 'Alex' }, // TTS model and voice settings
  vad: { threshold: 0.5, minSilenceDurationMs: 300, speechPadMs: 10 }, // VAD thresholds and timings
  turn: { threshold: 0.5 }, // End-of-turn probability threshold
  ai: { model: 'gpt-4o' } // AI model for responses
};

let SERVICES = {
  ai: null, // AI client
  tts: null, // TTS player
  vad: null, // Voice Activity Detection instance
  turn: null, // Turn detector instance
  asr: null, // Automatic Speech Recognition instance
  call: null // Current call object
};

let STATE = {
  asrText: '', // Holds the latest recognized speech text
  sentenceBuffer: '', // Buffer for streaming TTS text
  turnConfirmed: false
};

/** CALL ENTRY (INCOMING) */
VoxEngine.addEventListener(AppEvents.CallAlerting, async ({ call }) => {
  SERVICES.call = call;
  call.answer(); // Answer the incoming call

  // Cleanup resources when call ends or fails
  call.addEventListener(CallEvents.Disconnected, cleanup);
  call.addEventListener(CallEvents.Failed, cleanup);

  // Initialize services
  SERVICES.vad = await Silero.createVAD(CONFIG.vad); // VAD instance
  SERVICES.turn = await Pipecat.createTurnDetector(CONFIG.turn); // Turn detection
  SERVICES.asr = VoxEngine.createASR({ profile: ASRProfileList.Google.en_US }); // ASR instance

  // Pipe call audio to ASR, VAD, and turn detector
  call.sendMediaTo(SERVICES.asr);
  call.sendMediaTo(SERVICES.vad);
  call.sendMediaTo(SERVICES.turn);

  // Initialize AI client
  SERVICES.ai = await OpenAI.createResponsesAPIClient({
    apiKey: VoxEngine.getSecretValue('openai_api_key'),
    storeContext: false
  });

  setupEvents(); // Set up event handlers for all services

  // Initial greeting message to AI
  sendAI('Hello!');
});

/** CLEANUP */
function cleanup() {
  // Close all active services and terminate the call session
  if (SERVICES.ai) SERVICES.ai.close();
  if (SERVICES.vad) SERVICES.vad.close();
  if (SERVICES.turn) SERVICES.turn.close();
  VoxEngine.terminate();
}

/** EVENTS */
function setupEvents() {
  // SIMPLE BARGE-IN: detect when user speaks
  SERVICES.vad.addEventListener(Silero.VADEvents.Result, (e) => {
    Logger.write('===Silero.VADEvents.Result===');
    Logger.write(JSON.stringify(e));

    // Stop TTS if user starts speaking
    if (e.speechStartAt) {
      stopTTS();
    }

    // When speech ends, check for turn-taking
    if (e.speechEndAt) {
      SERVICES.turn.predict();
    }
  });

  // Handle end-of-turn detection
  SERVICES.turn.addEventListener(Pipecat.TurnEvents.Result, (e) => {
    Logger.write('===Pipecat.TurnEvents.Result===');
    Logger.write(JSON.stringify(e));
    if (e.endOfTurn && e.probability > CONFIG.turn.threshold) {
      STATE.turnConfirmed = true; // Mark that a turn has occurred

      // If ASR already captured text, send it to AI immediately
      if (STATE.asrText) {
        sendAI(STATE.asrText);
        STATE.asrText = '';
        STATE.turnConfirmed = false;
      }
    }
  });

  // Handle speech-to-text results
  SERVICES.asr.addEventListener(ASREvents.Result, (e) => {
    Logger.write('===ASREvents.Result===');
    Logger.write(JSON.stringify(e));
    if (e.text) {
      STATE.asrText = e.text;

      // If turn already confirmed, send ASR text to AI
      if (STATE.turnConfirmed) {
        sendAI(STATE.asrText);
        STATE.asrText = '';
        STATE.turnConfirmed = false;
      }
    }
  });

  // Stream partial AI responses
  SERVICES.ai.addEventListener(OpenAI.ResponsesAPIEvents.ResponseTextDelta, (e) => {
    Logger.write('===OpenAI.ResponsesAPIEvents.ResponseTextDelta===');
    Logger.write(JSON.stringify(e));
    const delta = e?.data?.payload?.delta;

    if (delta) {
      processDelta(delta); // Add to TTS buffer
    }
  });

  // Full AI response received
  SERVICES.ai.addEventListener(OpenAI.ResponsesAPIEvents.ResponseTextDone, (e) => {
    Logger.write('===OpenAI.ResponsesAPIEvents.ResponseTextDone===');
    Logger.write(JSON.stringify(e));
    const text = e?.data?.payload?.text;
    flushTTS(text); // Send final text to TTS
  });
}

/** AI */
function sendAI(text) {
  // Send user input or system prompt to AI
  SERVICES.ai.createResponses({
    model: CONFIG.ai.model,
    input: text
  });
}

/** STREAM → TTS */
function processDelta(delta) {
  STATE.sentenceBuffer += delta; // Append partial AI text

  // Speak when a sentence ends or buffer gets long
  if (/[.!?\n]/.test(delta) || STATE.sentenceBuffer.length > 40) {
    speak(STATE.sentenceBuffer.trim());
    STATE.sentenceBuffer = '';
  }
}

function flushTTS(finalText) {
  if (!finalText) return;
  //clear stream buffer
  STATE.sentenceBuffer = '';
  speak(finalText.trim());
}

/** TTS */
function speak(text) {
  if (!text) return;

  // Initialize TTS player if not already done
  if (!SERVICES.tts) {
    SERVICES.tts = Inworld.createRealtimeTTSPlayer({
      createContextParameters: { create: CONFIG.tts }
    });

    SERVICES.tts.sendMediaTo(SERVICES.call); // Send TTS audio to call
  }

  // Send text to TTS engine
  SERVICES.tts.send({
    send_text: {
      text: text,
      flush_context: {}
    }
  });
}

/** SIMPLE INTERRUPT */
function stopTTS() {
  // Stop any ongoing TTS playback
  if (SERVICES.tts) {
    SERVICES.tts.stop();
    SERVICES.tts = null;
  }
}
```
</Aside>

The example below demonstrates how to integrate an external text-based LLM using the [OpenAI Responses API client](). 

You can connect any OpenAI-compatible API endpoint—including self-hosted open-source models (such as vLLM or Ollama) or third-party inference providers—by setting the [baseUrl]() parameter in [OpenAI.ChatCompletionsAPIClientParameters]():