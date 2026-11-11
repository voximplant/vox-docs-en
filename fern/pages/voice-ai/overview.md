# Voice AI Orchestration

Building a voice agent is easy. Building one that doesn't talk over the user, freeze for three seconds, or hallucinate on live telephone audio is where things get tricky.

Voximplant’s Voice AI Orchestration layer sits directly at the intersection of carrier-grade telephony and frontier AI models. Instead of stitching together separate speech vendors, websocket proxies, and carrier trunks with duct tape, Voximplant gives you a serverless control runtime where AI models, speech pipelines, and live phone calls run side-by-side.

## Why orchestrate on Voximplant?

- **Native turn-taking & VAD**: Say goodbye to awkward pauses and accidental barge-ins. Built-in voice activity detection (VAD) and intelligent turn detection distinguish between a breath, a pause, and the end of a thought.
- **Mix & match or go end-to-end**: Run full speech-to-speech agents or build a custom cascade pipeline—swapping STT, LLM, and TTS providers on the fly with zero architectural rewrites.
- **Bring Your Own LLM (BYO-LLM)**: Connect any OpenAI-compatible endpoint, self-hosted open-source model, or private cloud deployment directly to our low-latency voice pipeline.
- **Native Model Context Protocol (MCP)**: Connect your voice agent to external tools, CRMs, databases, and APIs using the native VoxEngine MCP Client—no middleware or external gateways required.
- **Every channel connected**: Deploy your conversational agents to PSTN phone numbers in 100+ countries, SIP trunks, mobile and web apps, or WhatsApp.

## Supported AI ecosystems

We integrate with top frontier models and voice infrastructure so you can pick the best tool for every language, accent, and latency budget:

- **Conversational & Speech-to-Speech**: OpenAI Realtime API, Google Gemini Live, Ultravox, ElevenLabs Conversational AI, and Inworld.
- **Realtime Text-to-Speech (TTS)**: Cartesia, ElevenLabs, Inworld, xAI, VoxTTS, Amazon Polly, Google Cloud TTS, and Yandex.
- **Speech-to-Text (STT)**: Deepgram, Google Cloud Speech, xAI, Microsoft Azure Speech, and SaluteSpeech.
- **LLM Reasoning**: OpenAI, Google Gemini, Anthropic Claude, xAI Grok, Alibaba Qwen, DeepSeek, and custom fine-tuned models.

## Where to start

- **[Getting started with Voice AI orchestration]()**

Stop wrestling with WebSockets and audio buffers—build conversational agents that sound human, react in milliseconds, and actually get work done.