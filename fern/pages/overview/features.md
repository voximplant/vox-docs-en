# Voximplant features

Explore the features, services, and developer tools available on Voximplant to help you build, scale, and orchestrate global real-time communication workflows.

## AI orchestration & intelligence

Voximplant acts as the central control plane for your voice AI workflows, orchestrating multiple AI providers within live audio streams.

* **[LLMs & generative AI]()**: Connect directly to **OpenAI**, **Google Gemini**, **xAI**, **Ultravox**, and other frontier models. Embed conversational assistants into IVRs and contact center queues.
* **[Text-to-speech (TTS)]()**: Deliver natural audio using **ElevenLabs**, **Cartesia**, **Inworld**, **Amazon Polly**, and other providers.
* **[Speech-to-text (STT)]()**: Transcribe customer speech in real time with **Deepgram**, **Microsoft**, **Google**, and more—featuring intermediate partial results, emotion detection, and gender identification.
* **Flexible pipeline customization**: Mix and match STT, LLM, and TTS providers to achieve the optimal language coverage, voice quality, and latency budget for your use case.

## Global CPaaS & client SDKs

Build your communication layer once and deploy it across web, mobile, and desktop environments.

* **Cloud infrastructure**: Scalable, serverless backend that processes real-time media across global edge nodes.
* **[Web SDK]()**: Modern, TypeScript-first SDK with support for React, Vue, Angular, and vanilla JavaScript setups.
* **Mobile SDKs**: Native libraries for **[iOS & macOS]()** (Swift) and **[Android]()** (Kotlin with Jetpack Compose support).
* **Cross-platform SDKs**: Full support for **[Flutter]()** and **[React Native]()**.
* **Native telephony features**: Built-in support for push notifications (CallKit, PushKit, FCM), audio device switching, and background execution.

## Voice, video & conferencing

Embed carrier-grade real-time voice and video into cloud, web, or mobile applications.

* **[Voice]() & [Video]() calling**: High-definition peer-to-peer and cloud-bridged 1-on-1 or group sessions.
* **[Conferences]()**: Host multi-party audio and video conferences with up to 50–100 participants.
* **Media controls**: Native support for [screen sharing]() and [video streaming]() to external RTMP destinations.
* **[Call recording]()**: Record [audio and video calls]() to the Voximplant Cloud or directly into your own Amazon S3-compatible storage.

## Contact center & automation

Transform customer operations with intelligent call distribution and automated campaigns.

* **[Smart contact center]()**: Distribute calls and messages to agents based on skills, queues, and priority rules.
* **[Analytics & reporting]()**: Track detailed agent performance metrics and call statistics.
* **[Predictive dialer (PDS)]()**: Automate high-volume outbound campaigns with intelligent pacing.
* **[Answering machine detection (AMD)]()**: Distinguish between human pickup, voicemail prompts, and busy signals before connecting.
* **[Smart IVR]()**: Build interactive voice response menus with natural language understanding to automate routine inquiries.

## Connectivity & telephony

Bridge your applications directly to the global telecommunications grid.

* **[Phone numbers]()**: Rent local, national, and toll-free virtual numbers across 60+ countries.
* **[SIP integration]()**: Connect existing on-premise PBX systems, cloud phone systems, or carrier trunks via SIP.
* **[WebSocket module]()**: Stream full-duplex, low-latency raw audio and binary data to and from third-party services and AI pipelines.

## VoxEngine serverless runtime

VoxEngine allows developers to write event-driven JavaScript scenarios that execute directly inside Voximplant's media nodes during active calls.

* **[HTTP networking]()**: Make synchronous or asynchronous HTTP requests (`GET`, `POST`, `PUT`, `PATCH`) to external backends directly from call scenarios.
* **[Key-Value Storage]()**: Store and retrieve persistent key-value pairs (up to 2,000 characters per value) to maintain session state or cache tokens across calls.
* **[Real-time logging]()**: Write custom log messages up to 15,000 characters and stream them live via the [control panel]().

## Management & administration

Automate platform operations and manage account infrastructure at scale.

* **[Management API]()**: An OpenAPI-compliant REST API to automate everything available in the control panel—from provisioning numbers to triggering outbound calls.
* **[Control panel]()**: A web interface for manual scenario editing, routing rule configuration, user permissions, and billing management.

## Ecosystem integrations

Voximplant connects seamlessly with enterprise cloud platforms and developer tools:

* **Cloud storage & computing**: Amazon Web Services (S3), Google Cloud Platform, Microsoft Azure.
* **AI & conversational platforms**: OpenAI, Google Dialogflow, IBM Watson, and custom LLMs.
* **Telephony & media platforms**: Third-party SIP PBXs, SBCs, and custom WebSocket streaming endpoints.