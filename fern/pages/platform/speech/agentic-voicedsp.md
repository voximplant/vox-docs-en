# Agentic VoiceDSP module

Agentic VoiceDSP combines [Silero VAD]() (voice activity detection), [Pipecat turn detection](), and [Hush noise suppression]() into a single VoxEngine module for voice AI applications.

While you can import and wire these modules individually in your scenario, Agentic VoiceDSP provides an all-in-one unified pipeline.

This module is designed for [building your own LLM applications](), but it is equally useful across any real-time speech processing workflow.

## Contents

- [How it works](#how-it-works)
  - [Smart Turn flow](#smart-turn-flow)
  - [Stop-strategy precedence](#stop-strategy-precedence)
  - [STT transcript gating](#stt-transcript-gating)
  - [User turn stop watchdog](#user-turn-stop-watchdog)
  - [User idle](#user-idle)
  - [Noise suppression (Hush)](#noise-suppression-hush)
- [Usage](#usage)

---

## How it works

Agentic VoiceDSP combines [Silero VAD](), [Pipecat turn detection](), and optional [Hush noise suppression]() directly on the Voximplant platform. When you route call audio to `Agentic.VoiceDSP`, the module processes the stream and emits high-level user-turn events for your scenario.

| Component | Scenario configuration |
| :--- | :--- |
| **VAD** | `vadParameters` ([Agentic.VADParameters]()) |
| **Turn detector** | `turnDetectorParameters` ([Agentic.TurnDetectorParameters]()) |
| **Noise suppression** | `noiseSuppressionParameters` ([Agentic.NoiseSuppressionParameters]()) — *optional; disabled unless provided* |

The turn lifecycle follows [Pipecat UserTurnProcessor]() and [TurnAnalyzerUserTurnStopStrategy]().

### Smart Turn flow

1. VAD detects a pause → the turn detector executes an evaluation (`Predict`).
2. If the model returns **end of turn** → `TurnInferenceTriggered` fires, followed by `TurnStopped` (after transcript gating completes when STT is configured).
3. If the model returns **incomplete**, silence must continue for `stopSecs` seconds → `TurnStopTimeout` (`reason: stop_secs`) fires, followed by `TurnStopped`.

If the user resumes speaking before the `Predict` response arrives, that in-flight response is invalidated and discarded. This prevents a stale `endOfTurn` verdict from firing a false `TurnInferenceTriggered` event or merging the subsequent utterance into the current turn.

### Stop-strategy precedence

When multiple stop strategies are configured, they are ranked so that a single turn always finalizes with exactly **one** strategy, ensuring that `TurnInferenceTriggered.strategy === TurnStopped.strategy`:

1. `controller_timeout` (watchdog force-stop) — Always takes priority; it finalizes an uncompleted turn even when awaiting a transcript, reusing the pending strategy label (or the configured fallback if none is pending).
2. `turn_detector` (the ML verdict, plus its `stop_secs` fallback emitted with `strategy: 'turn_detector'`) — Authoritative decision maker.
3. `speech_timeout` — Fallback mechanism.

A `speech_timeout` fallback **never** preempts or relabels the ML `turn_detector` while it is active for the current segment (when a `Predict` verdict is pending, a `turn_detector` finalization is pending, or the `stop_secs` fallback is armed after an `endOfTurn: false` verdict). When `turn_detector` and `speech_timeout` are configured together, the detector owns every finalization path, and `speech_timeout` only fires if `turn_detector` is omitted.

If `turn_detector` is omitted from `stopStrategies` (useful for testing or STT-only stop logic):

* VoiceDSP does not send `Predict` requests.
* ML turn-detector results are not used for stop decisions.
* Events never report `strategy: 'turn_detector'`. The watchdog still force-stops with `TurnStopTimeout` (`reason: controller_timeout`), labeled with the configured fallback (`speech_timeout`).

### STT transcript gating

When an **STT** instance is passed to `Agentic.createVoiceDSP`:

* Transcription-based start strategies (`transcription`, `min_words`) can emit `TurnStarted`.
* `TurnStopped` waits for a **final** transcript whenever possible.
* If the turn analyzer completes before STT finishes, `TurnInferenceTriggered` fires first so the scenario can start LLM inference early.
* An STT grace timer (`asrGraceTimeout`, default **0.3** s) starts at `TurnInferenceTriggered`. Until it expires, subsequent STT interim or final results update the snapshot used by `TurnStopped`. A final transcript finalizes the turn immediately. Keep the default shorter than typical STT final latency so `TurnStopped` does not block waiting for an STT final transcript; start LLM processing on `TurnInferenceTriggered`. When the timer expires, `TurnStopped` uses the latest snapshot (including interim text).
* After `TurnStopped`, late STT interim/final results for the closed utterance are ignored until a new speech segment (VAD speech start) or new turn starts, preventing ghost `TurnStarted` events or text bleeding into subsequent turns.

<Info title="Required for transcription and min_words">
Pass the same ASR instance to which you send call media:
`Agentic.createVoiceDSP({ asr, startStrategies: [Agentic.VoiceDSPStrategies.createMinWordsStart({ minWords: 3 })] })`. Without `asr`, these start strategies will never fire. VoiceDSP accepts any STT-like object implementing the required event listeners.
</Info>

### User turn stop watchdog

`userTurnStopTimeout` (default **5.0** s, mirroring Pipecat `user_turn_stop_timeout`) forces turn finalization when a turn remains active without a stop strategy firing. It emits `TurnStopTimeout` with `reason: controller_timeout`, followed by `TurnStopped`. The inference and stop events reuse the pending strategy label (or the configured fallback if none is pending)—never `turn_detector` unless that strategy is explicitly configured.

### User idle

Mirrors Pipecat's `UserIdleController` (independent of Smart Turn `stopSecs`):

* Set `userTurnIdleTimeout` in seconds (**0** disables the timer).
* Call `signalAssistantTurnEnded()` when TTS/LLM playback finishes to clear the assistant-speaking state and start the idle timer if the user is not in an active turn.
* Call `signalAssistantTurnStarted()` when the assistant starts speaking to mark the assistant as speaking and cancel the idle timer.
* `TurnStarted.interrupted` is `true` only when the user turn begins while the assistant is speaking (requires invoking the signal methods above). It is not a copy of the strategy's `enableInterruptions` property.
* When the assistant is speaking and a start strategy has `enableInterruptions: false`, `TurnStarted` is suppressed.
* User speech or a `TurnStarted` event cancels the idle timer.

### Noise suppression (Hush)

Pass `noiseSuppressionParameters` to [Agentic.createVoiceDSP]() to enable **Hush** noise suppression directly within VoiceDSP (same parameter structure as standalone [Hush.NoiseSuppression]()).

* **Opt-in only**: Omit `noiseSuppressionParameters` to leave noise suppression disabled.
* Parameter structure matches [Hush.NoiseSuppressionParameters]() (`attenLimDb`).
* Do not call `require(Modules.Hush)` for this path—Hush runs as an integrated component of VoiceDSP server-side processing rather than as an independent media unit. Standalone Hush remains available when you require an explicit duplex noise suppression unit.
* Scenarios send call media exclusively to `Agentic.VoiceDSP`; denoised audio is processed internally before reaching VAD and turn detection.

---

## Usage

To use Agentic VoiceDSP in your scenario:

1. Create an `Agentic.VoiceDSP` instance via `Agentic.createVoiceDSP()` and configure your parameters.
2. Route audio from the call to `Agentic.VoiceDSP` using `call.sendMediaTo()`.
3. Optionally pass an `ASR` instance when using transcription-based start strategies (`transcription`, `min_words`).
4. Configure `turnDetectorParameters.stopSecs` (default **3.0**).
5. Optionally configure `asrGraceTimeout`, `userTurnStopTimeout`, and `userTurnIdleTimeout`.
6. Connect `signalAssistantTurnStarted()` and `signalAssistantTurnEnded()` to your TTS/LLM playback lifecycle.
7. Configure **start strategies** and **stop strategies** using [Agentic.VoiceDSPStrategies]() factories.
8. Subscribe to `Agentic.VoiceDSPEvents` to implement your application business logic.

<Info title="Internal pipeline signals">
Underlying Silero VAD and Pipecat turn-detector signals are managed internally by the VoiceDSP implementation and are not exposed directly to scenarios.
</Info>

```javascript title="Agentic VoiceDSP example"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/agentic.voice-dsp.base-scenario.js
```