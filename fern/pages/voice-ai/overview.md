# Voice AI orchestration

Building a voice agent is easy. Building one that does not talk over the user, freeze for three seconds, or hallucinate on live telephone audio is where things get tricky.

Voximplant’s Voice AI orchestration layer sits directly at the intersection of carrier-grade telephony and frontier AI models. Instead of stitching together separate speech vendors, WebSocket proxies, and carrier trunks with duct tape, Voximplant provides a serverless control runtime where AI models, audio pipelines, and live phone calls run side-by-side.

---

## Why orchestrate on Voximplant?

* **Native turn-taking & VAD**: Say goodbye to awkward pauses and accidental barge-ins. Built-in Silero VAD and intelligent Pipecat turn detection distinguish between a breath, a mid-sentence pause, and the end of a thought.
* **Mix & match or go end-to-end**: Run full speech-to-speech agents or build custom cascade pipelines—swapping STT, LLM, and TTS providers dynamically with zero architectural rewrites.
* **Bring your own LLM (BYO-LLM)**: Connect any OpenAI-compatible API endpoint, self-hosted open-source model (via vLLM, Ollama), or private cloud deployment directly to the Voximplant low-latency voice pipeline.
* **Native Model Context Protocol (MCP)**: Give your agents hands. Connect voice agents to external databases, CRMs, and APIs via the native VoxEngine MCP client—no middleware required.
* **Every channel connected**: Deploy your conversational agents to PSTN phone numbers in 60+ countries, SIP PBX trunks, mobile and web SDKs, or WhatsApp Business Calling.

---

## Quick links

<CardGroup cols={3}>
  <Card title="Getting started" icon="fa-duotone fa-rocket" href="/voice-ai/getting-started">
    Set up your application, create a low-latency scenario, and launch your first AI agent.
  </Card>
  <Card title="Bring your own LLM" icon="fa-duotone fa-brain-circuit" href="/voice-ai/bring-your-own-llm">
    Connect self-hosted models or custom OpenAI-compatible endpoints to telephony.
  </Card>
  <Card title="Agentic VoiceDSP" icon="fa-duotone fa-waveform-lines" href="/voice-ai/speech-flow-control/agentic-voicedsp">
    Master turn detection, Silero VAD, interruption handling, and Hush noise suppression.
  </Card>
  <Card title="MCP client" icon="fa-duotone fa-brackets-curly" href="/voice-ai/mcp-client">
    Execute real-time tool calls and fetch CRM data mid-call via Model Context Protocol.
  </Card>
  <Card title="Direct agent connectors" icon="fa-duotone fa-robot" href="#direct-agent-and-real-time-connectors">
    Explore native speech-to-speech integrations with OpenAI, Gemini, Ultravox, and more.
  </Card>
  <Card title="Media streaming" icon="fa-duotone fa-plug" href="/platform/media-streams/media-over-web-sockets">
    Stream bidirectional ~20ms audio chunks over WebSockets for custom AI backends.
  </Card>
</CardGroup>

---

## Voice AI ecosystems at a glance

### Direct agent and real-time connectors

Connect directly to frontier voice models and speech-native agent runtimes:

<CardGroup cols={3}>
  <Card title="OpenAI Realtime" icon="fa-duotone fa-sparkles" href="/voice-ai/openai/overview">
    Native real-time audio and agent-style integrations via the OpenAI Realtime API.
  </Card>
  <Card title="Google Gemini Live" icon="fa-duotone fa-waveform-lines" href="/voice-ai/google/overview">
    Low-latency multimodal speech interactions with Gemini Live on Vertex AI.
  </Card>
  <Card title="Deepgram voice agent" icon="fa-duotone fa-ear-listen" href="/voice-ai/deepgram/overview">
    End-to-end voice agent API combining speech recognition, LLM reasoning, and TTS.
  </Card>
  <Card title="ElevenLabs ElevenAgents" icon="fa-duotone fa-flask-vial" href="/voice-ai/elevenlabs/overview">
    Conversational AI agent platform integration with human-quality voices.
  </Card>
  <Card title="Ultravox Realtime" icon="fa-duotone fa-bolt" href="/voice-ai/ultravox/overview">
    Speech-native LLM connector communicating directly over low-latency WebSockets.
  </Card>
  <Card title="Cartesia Line agents" icon="fa-duotone fa-chart-network" href="/voice-ai/cartesia/overview">
    Ultra-fast voice agent runtime with sub-second response times and VoxEngine control.
  </Card>
  <Card title="xAI Grok voice agent" icon="fa-duotone fa-alien-8bit" href="/voice-ai/xai/overview">
    Real-time Grok voice-agent flows and native telephony integration.
  </Card>
  <Card title="Inworld Realtime" icon="fa-duotone fa-user-robot" href="/voice-ai/inworld/overview">
    Real-time expressive voice agents with dynamic emotional inflections.
  </Card>
  <Card title="Dialogflow connector" icon="fa-duotone fa-comments" href="/voice-ai/dialogflow/es">
    Connect Google Dialogflow ES and CX virtual agents to enterprise phone queues.
  </Card>
</CardGroup>

### Speech and real-time TTS options

For cascade and modular pipelines, swap high-performance speech synthesis and recognition engines:

<CardGroup cols={3}>
  <Card title="Cartesia Realtime TTS" icon="fa-duotone fa-volume-high" href="/voice-ai/cartesia/overview">
    State-of-the-art streaming TTS with Sonic engine latency under 100ms.
  </Card>
  <Card title="ElevenLabs streaming TTS" icon="fa-duotone fa-volume-high" href="/voice-ai/elevenlabs/overview">
    Rich voice cloning and emotive streaming speech synthesis.
  </Card>
  <Card title="Inworld Realtime TTS" icon="fa-duotone fa-volume-high" href="/voice-ai/inworld/overview">
    Low-latency character and conversational speech generation.
  </Card>
  <Card title="Google Realtime TTS" icon="fa-duotone fa-volume-high" href="/reference/voxengine/overview">
    Google Cloud Text-to-Speech streaming synthesis with dozens of language accents.
  </Card>
  <Card title="Grok Realtime TTS" icon="fa-duotone fa-volume-high" href="/voice-ai/xai/overview">
    xAI streaming speech synthesis over native WebSocket channels.
  </Card>
  <Card title="Deepgram speech-to-text" icon="fa-duotone fa-microphone-lines" href="/voice-ai/deepgram/overview">
    Nova-2 speech recognition delivering real-time transcription with intermediate results.
  </Card>
</CardGroup>

---

## Pipeline architectures you can build

Voximplant supports multiple architectural patterns so you can balance cost, latency, and reasoning depth:

* **Speech-to-speech (full duplex)**: Audio streams directly from the caller into an end-to-end voice model (e.g., OpenAI Realtime, Gemini Live, Ultravox). The model handles turn-taking, reasoning, and speech output in a continuous loop.
* **Speech → LLM → TTS (half-cascade)**: Feed audio into a multimodal speech model for reasoning, but stream text output to a specialized neural TTS engine (such as Cartesia or ElevenLabs) for custom brand voices.
* **STT → LLM → TTS (full cascade)**: Stream caller audio to a fast STT engine (Deepgram), pipe transcribed text to any LLM (Anthropic Claude, OpenAI, Qwen, or self-hosted models), and stream generated tokens to a real-time TTS provider.
* **Hybrid and fallback pipelines**: Run primary conversations through an end-to-end voice model while executing background tasks (sentiment analysis, intent categorization, CRM logging) in parallel on secondary models.

---

## Detailed capabilities

<AccordionGroup>
  <Accordion title="Orchestration primitives & call control">
    * **Provider portability**: Swap STT, LLM, or TTS vendors by changing scenario configuration without altering telephony routing or phone numbers.
    * **Parallel model execution**: Run background intelligence tasks concurrently with the live conversation (for example, generating summaries or running compliance checks during the call).
    * **Automated failover**: Configure fallback speech engines or secondary LLM endpoints if a primary provider experiences rate limits or timeouts.
    * **Wideband audio pipeline**: High-fidelity HD audio sampling (16 kHz and 48 kHz) for superior speech recognition accuracy and natural voice playback.
    * **Deep SIP & PBX interop**: Deploy voice agents behind existing corporate PBXs, Session Border Controllers (SBCs), or carrier SIP trunks via [SIP calls and registrations](/platform/telephony/sip-calls-and-registrations).
    * **Channel portability**: Write your conversational scenario once and deploy it across PSTN phone numbers, mobile apps, web browsers, and WhatsApp Business.
  </Accordion>

  <Accordion title="Turn-taking, VAD & barge-in control">
    * **Silero voice activity detection (VAD)**: Runs directly inside the media engine to identify speech start and silence boundaries in real time.
    * **Pipecat turn detection**: Uses semantic sentence-boundary models to distinguish between mid-sentence pauses and completed user turns.
    * **Barge-in handling**: Automatically halts agent audio playback the instant user speech is detected, preventing the bot from talking over the caller.
    * **Hush noise suppression**: Eliminates background keyboard typing, street noise, and room echo before audio reaches speech recognition models.
  </Accordion>

  <Accordion title="Model Context Protocol (MCP) & tool calling">
    * **Native MCP client**: Connect your voice agent to any external Model Context Protocol server over WebSockets.
    * **Dynamic context retrieval**: Fetch account records, past order history, and customer profile data mid-call to inject into prompt context.
    * **Real-time action execution**: Allow agents to book appointments, trigger password resets, or dispatch SMS confirmations while on the line.
  </Accordion>

  <Accordion title="Telephony & global network infrastructure">
    * **Global PSTN connectivity**: Procure local, mobile, and toll-free numbers in 60+ countries with instant provisioning.
    * **Serverless execution**: Scenarios execute directly on media edge nodes across global data centers with sub-second latency.
    * **WebSockets media streaming**: Stream raw binary audio chunks (~20 ms) and metadata simultaneously via [Media over WebSockets](/platform/media-streams/media-over-web-sockets).
  </Accordion>
</AccordionGroup>

---

## Next steps

Ready to build your first voice agent? Get started with the step-by-step tutorial:

* [Getting started with Voice AI orchestration](/voice-ai/getting-started) — Provision an application, configure low-latency call settings, and deploy your first agent.
* [Bring your own LLM](/voice-ai/bring-your-own-llm) — Connect custom models or third-party inference endpoints.
* [Agentic VoiceDSP](/voice-ai/speech-flow-control/agentic-voicedsp) — Configure turnkey VAD, turn detection, and noise suppression.