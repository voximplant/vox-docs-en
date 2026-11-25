# Pipeline options
Compare the main Voice AI pipeline patterns supported in VoxEngine.

<Info>
For the complete documentation index, see [llms.txt](/llms.txt).
</Info>

VoxEngine supports a wide variety of Voice AI architectures and components. The right pipeline depends on your priorities—low latency, interactivity needs, voice choice, and low-level control are some factors to consider.

<CardGroup cols={3}>
  <Card title="Speech-to-speech (S2S)" href="#speech-to-speech">
    **User ↔ LLM**

    Fully integrated Voice AI that often offers the lowest overall latency.
  </Card>
  <Card title="Hybrid-cascade" href="#hybrid-cascade">
    **LLM ↔ TTS**

    Realtime LLM for speech input and reasoning, with a separate TTS system for output voice.
  </Card>
  <Card title="Cascaded" href="#full-cascade">
    **STT ↔ LLM ↔ TTS**

    Separate STT, LLM, and TTS stages for maximum provider flexibility and pipeline control.
  </Card>
</CardGroup>

## High-level comparison

| Pipeline | Best when you want | Latency | Voice flexibility | Provider flexibility | VoxEngine control |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Speech-to-speech** | Streamlined architecture | Lowest | Limited to the realtime provider voice stack | Medium | Medium |
| **Hybrid-cascade** | Realtime LLM with external TTS | Low | High | High for TTS-only | High |
| **Cascaded** | Independent control of STT, LLM, and TTS | Higher | High | Highest | Highest |

<Note>
Some vendors present a speech-to-speech (S2S) API externally, but internally manage a cascaded architecture with separate components with varying degrees of control and configuration. See more details below.
</Note>

<Tip>
* Start with speech-to-speech when you want to get to a working voice agent quickly.
* Move to hybrid-cascade when you need more TTS voice choices and control, and can tolerate some additional latency.
* Consider full cascade when you need independent control over transcription, reasoning, playback, turn-taking, or provider mix and are willing to manage the additional interactions.
</Tip>

---

## Voximplant connectors and pipeline support

Voximplant always manages the telephony side of the call: routing, answering, bridging media, call control, and any orchestration logic you add in VoxEngine. Voximplant Voice AI API clients, also called connectors, provide a direct connection from VoxEngine to the provider's environment with a low-latency WebSocket connection. Voximplant's various connector options differ in how they handle transcription, reasoning, and speech synthesis internally.

LLMs like OpenAI, Gemini, Grok, and Qwen provide direct access to the speech-enabled LLM. Speech input and output parameters are managed as part of the connector.

Ultravox provides a speech-native LLM, but integrates TTS within their environment, only exposing a Speech-to-Speech interface to Voximplant. Similarly, ElevenLabs, Cartesia, Deepgram, and Inworld provide a speech-to-speech interface to Voximplant, but handle LLM, STT, and TTS elements internally. Configuration of these internal elements varies by vendor. We call these integrations "indirect speech-to-speech".

All vendors provide some level of end-of-turn detection, with some vendors providing more explicit control over turn-taking and barge-in.

The table below summarizes support by vendor from the Voximplant connector perspective:

| Agent vendor | Direct S2S | Indirect S2S | Hybrid | Cascaded |
| :--- | :---: | :---: | :---: | :---: |
| [OpenAI](/voice-ai/openai/overview) | ✓ | | ✓ | ✓ |
| [Gemini Live](/voice-ai/google/overview) | ✓ | | | |
| [xAI Grok voice agent](/voice-ai/xai/overview) | ✓ | | | |
| [Qwen Cloud](/voice-ai/qwen/overview) | ✓ | | | |
| [Ultravox](/voice-ai/ultravox/overview) | | ✓ | | |
| [ElevenLabs agents](/voice-ai/elevenlabs/overview) | | ✓ | | |
| [Deepgram agents](/voice-ai/deepgram/overview) | | ✓ | | |
| [Cartesia Line agents](/voice-ai/cartesia/overview) | | ✓ | | |
| [Inworld Realtime](/voice-ai/inworld/overview) | | ✓ | | |

---

## Speech-to-speech

In this pattern, caller audio is bridged to the provider in real time, and the provider returns speech audio directly back into the call.

![Speech-to-speech architecture](../../assets/connectors/s2s-light.png#light)
![Speech-to-speech architecture](../../assets/connectors/s2s-dark.png#dark)

### How it works

* Caller audio is streamed from VoxEngine to a realtime voice agent over WebSockets.
* The provider handles speech recognition, reasoning, and speech generation in a single session.
* VoxEngine manages telephony, routing, media bridge, and call control around that session.

### Tradeoffs

<CardGroup cols={2}>
  <Card title="Advantages" icon="fa-duotone fa-circle-check">
    * Lowest end-to-end latency.
    * Simple architecture with fewer systems to coordinate.
    * Fastest path from prototype to production trial.
    * Natural fit for direct realtime connectors with built-in streaming speech.
  </Card>
  <Card title="Disadvantages" icon="fa-duotone fa-circle-xmark">
    * Voice quality and speech style are limited to the provider's native output voices.
    * Less control over how STT, reasoning, and speech output are separated.
    * Switching one stage often means switching the whole stack.
  </Card>
</CardGroup>

### Best for

* You want the fastest possible conversational loop.
* You are satisfied with the provider's built-in voices.
* You want the simplest operational model.

### Related guides

#### Direct speech-to-speech connectors

These connectors expose the speech-enabled LLM directly to VoxEngine:

<CardGroup cols={2}>
  <Card title="OpenAI" href="/voice-ai/openai/overview">
    Direct realtime speech-to-speech with OpenAI.
  </Card>
  <Card title="Gemini Live" href="/voice-ai/google/overview">
    Direct live audio pipeline with Gemini Live.
  </Card>
  <Card title="xAI Grok voice agent" href="/voice-ai/xai/overview">
    Realtime voice interaction with Grok voice agent sessions.
  </Card>
  <Card title="Qwen Cloud" href="/voice-ai/qwen/overview">
    Realtime speech-to-speech with the Qwen audio model.
  </Card>
</CardGroup>

#### Indirect speech-to-speech connectors

These connectors present a speech-to-speech interface to VoxEngine while managing more of the internal speech and agent stack inside the provider environment:

<CardGroup cols={2}>
  <Card title="Ultravox" href="/voice-ai/ultravox/overview">
    Speech-native realtime agent with native speech input and output.
  </Card>
  <Card title="ElevenLabs agents" href="/voice-ai/elevenlabs/overview">
    Conversational agent sessions with realtime speech handling.
  </Card>
  <Card title="Deepgram agents" href="/voice-ai/deepgram/overview">
    Realtime voice agent flow with Deepgram speech input and output.
  </Card>
  <Card title="Cartesia Line agents" href="/voice-ai/cartesia/overview">
    Speech-to-speech agent flow with Cartesia-managed runtime behavior.
  </Card>
  <Card title="Inworld Realtime" href="/voice-ai/inworld/overview">
    Speech-to-speech sessions with Inworld STT, an LLM, and TTS-2 output.
  </Card>
</CardGroup>

---

## Hybrid-cascade

Hybrid-cascade—sometimes called half-cascade—keeps the realtime LLM in the loop for user speech input and reasoning, but routes speech output to a separate synthesis provider. This is often the best compromise between latency and voice flexibility.

![Half-cascade architecture](../../assets/connectors/half-cascade-light.png#light)
![Half-cascade architecture](../../assets/connectors/half-cascade-dark.png#dark)

### How it works

* Caller audio is streamed to a realtime LLM.
* The realtime LLM returns text tokens rather than raw audio.
* VoxEngine streams the text into a TTS engine and plays the generated speech back to the caller.

### Tradeoffs

<CardGroup cols={2}>
  <Card title="Advantages" icon="fa-duotone fa-circle-check">
    * Much broader choice of output voices and specialized TTS providers.
    * Allows tuning speaking style, voice identity, and output pricing separately from the LLM.
    * Still supports low-latency streaming when paired with realtime TTS.
    * Strong balance between orchestration control and implementation simplicity.
  </Card>
  <Card title="Disadvantages" icon="fa-duotone fa-circle-xmark">
    * More moving parts than direct speech-to-speech.
    * Output latency depends on the selected TTS provider and playback buffer strategy.
    * Increased cost—billing covers both the realtime LLM and speech synthesis.
  </Card>
</CardGroup>

### Best for

* You want a specific brand voice or voice quality that your LLM provider does not offer.
* You want more control over output speech without moving to a full cascade.
* You need a practical middle ground between speed and flexibility.

### Related guides

<CardGroup cols={2}>
  <Card title="OpenAI + Cartesia" href="/voice-ai/openai/half-cascade-cartesia">
    Realtime LLM with Cartesia realtime TTS.
  </Card>
  <Card title="OpenAI + ElevenLabs" href="/voice-ai/openai/half-cascade-elevenlabs">
    Realtime LLM with ElevenLabs streaming TTS.
  </Card>
  <Card title="OpenAI + Inworld" href="/voice-ai/openai/half-cascade-inworld">
    Realtime LLM with Inworld speech output.
  </Card>
  <Card title="Grok Realtime TTS" href="/voice-ai/speech/grok-tts">
    xAI streaming TTS for half-cascade speech output.
  </Card>
</CardGroup>

---

## Full cascade

Full cascade separates speech-to-text, reasoning, and text-to-speech into independent stages. This gives you the most control over the pipeline and complete freedom to mix providers.

![Full-cascade architecture](../../assets/connectors/cascaded-light.png#light)
![Full-cascade architecture](../../assets/connectors/cascaded-dark.png#dark)

### How it works

* VoxEngine transcribes caller audio with an integrated STT engine.
* Your scenario sends the transcribed text to an LLM or custom OpenAI-compatible endpoint.
* The generated text response is synthesized through a TTS provider and streamed back into the call.
* Voice activity detection, turn detection, and barge-in control are orchestrated explicitly in VoxEngine.

### Tradeoffs

<CardGroup cols={2}>
  <Card title="Advantages" icon="fa-duotone fa-circle-check">
    * Maximum freedom to choose the best STT, LLM, and TTS provider for each stage.
    * Complete control over turn-taking, interruption logic, and prompt/response handling.
    * Ideal for custom vocabulary, localized accents, or specialized domain models.
    * Easy to swap a single layer without redesigning the rest of the pipeline.
  </Card>
  <Card title="Disadvantages" icon="fa-duotone fa-circle-xmark">
    * Higher implementation and operational complexity.
    * Multiple handoffs require careful latency and buffer coordination.
    * Requires deliberate turn-taking and barge-in handling for a natural conversational experience.
  </Card>
</CardGroup>

### Best for

* You need granular control over transcription, reasoning, and speech generation.
* You want to mix providers based on language coverage, latency, or cost.
* You require explicit turn-taking logic or custom business orchestration around the LLM.

### Related guides

For turn-taking, interruption, and end-of-turn behavior, see the [Speech Flow Control guides](/voice-ai/speech-flow-control/turn-detection). For standalone xAI speech output in cascade pipelines, see [Grok TTS](/voice-ai/speech/grok-tts).

<CardGroup cols={2}>
  <Card title="Responses: Deepgram-Groq-Inworld" href="/voice-ai/bring-your-own-llm/full-cascade-groq">
    Independent STT, LLM, and TTS with explicit turn-taking.
  </Card>
  <Card title="Responses: Microsoft-Grok-Grok TTS" href="/voice-ai/bring-your-own-llm/grok-full-cascade">
    Microsoft STT, xAI Grok text mode, and Grok Realtime TTS.
  </Card>
  <Card title="Agentic VoiceDSP" href="/voice-ai/speech-flow-control/agentic-voicedsp">
    Reference guide for VAD, turn detection, and barge-in orchestration.
  </Card>
  <Card title="Run TTS in VoxEngine" href="/voice-ai/enhance-and-deploy/telephony-and-voice-ai#run-tts-in-voxengine">
    Related guide for playback and TTS orchestration patterns.
  </Card>
</CardGroup>

---

## Choosing a pipeline

We recommend this progression when building Voice AI systems:

1. **Start with speech-to-speech** to validate your call flow, latency expectations, and prompt design quickly.
2. **Move to hybrid-cascade** if you need a specific brand voice or output speech behavior that your speech-LLM provider does not offer.
3. **Move to full cascade** when you require complete provider independence, custom turn-taking models, or specialized enterprise orchestration between stages.

This progression keeps your initial implementation simple while giving you the architectural freedom to add modularity as your requirements evolve.