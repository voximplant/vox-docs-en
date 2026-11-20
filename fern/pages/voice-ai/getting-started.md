# Getting started with Voice AI

Voximplant combines a serverless **Voice AI Orchestration Platform** with a carrier-grade **Communications Platform as a Service (CPaaS)**. This allows you to connect real-time conversational AI models, LLMs, and speech engines directly to telephone lines, SIP trunks, WebRTC, and WhatsApp.

Before writing code or deploying an agent, consider three architectural choices:

1. **Telephony channels**: How will users connect? (PSTN phone numbers, SIP PBX trunks, WebRTC in a web/mobile app, or WhatsApp Business).
2. **AI pipeline architecture**: Are you running an end-to-end speech-to-speech model, a half-cascade, or a modular STT $\rightarrow$ LLM $\rightarrow$ TTS cascade?
3. **Call direction**: Is your agent answering inbound customer calls or placing outbound notifications and campaigns?

<Note>
For common questions regarding platform latency, billing, and architecture, see our [Voice AI Frequently Asked Questions (FAQ)](/voice-ai/faq).
</Note>

---

## Core concepts at a glance

Voximplant runs on **VoxEngine**, a serverless JavaScript runtime executing directly alongside live media streams:

* **Applications**: Top-level project containers that isolate your scenarios, credentials, routing rules, and phone numbers.
* **Scenarios**: Serverless JavaScript programs that control telephony logic, manipulate media streams, and communicate with AI providers.
* **Routing rules**: Pattern-matching rules that evaluate incoming destinations and determine which scenario to launch.
* **Phone numbers**: Virtual PSTN numbers (local, mobile, toll-free) used to receive calls or provide an outbound Caller ID.
* **Secrets & Application Storage**: Isolated key-value storage for environment variables and encrypted storage for third-party AI provider API keys.

---

## Step-by-step setup guide

<Steps>
  <Step title="Create an account">
    ### 1. Create your account
    
    All platform resources are managed via the [Voximplant Control Panel](https://manage.voximplant.com):
    
    1. Sign up for an account at [manage.voximplant.com/auth/sign_up](https://manage.voximplant.com/auth/sign_up).
    2. Choose an **Account name**. This name serves as your permanent global account identifier across SDK logins and API calls.
    3. Confirm your email and log in to access the dashboard and claim your initial testing balance.
  </Step>

  <Step title="Create an application">
    ### 2. Create an application
    
    An application groups and isolates all resources for a specific project:
    
    1. In the Control Panel, open **Applications**.
    2. Click **New application** (or **Create**).
    3. Enter a name (for example, `voice-ai-staging`) and save.
    
    <Info title="Environment isolation">
    Use separate applications for distinct environments—such as `voice-ai-staging` vs. `voice-ai-production`—to keep credentials and routing rules isolated.
    </Info>
    
    For more details, see the [Applications setup guide](/platform/getting-started/create-an-application) or the [Applications HTTP API reference](/reference/management-api/reference/applications).
  </Step>

  <Step title="Create a scenario">
    ### 3. Create a scenario
    
    Scenarios are JavaScript files executed by VoxEngine in the cloud when a call triggers a routing rule:
    
    1. Inside your application, navigate to **Scenarios**.
    2. Click the plus button (**+**) to create a new scenario.
    3. Enter a scenario name (for example, `voice-ai-agent.js`).
    4. Paste your scenario logic and click **Save**.
    
    Below is a starter scenario that answers an incoming call, optimizes audio latency for AI processing, and plays an introductory greeting:

```javascript title="voice-ai-agent.js"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const call = e.call;

  // Answer call with low-latency audio settings
  call.answer({
    disableDtxForAudio: true, // Disables discontinuous transmission to prevent audio clipping
  });

  call.addEventListener(CallEvents.Connected, () => {
    // Connect your Voice AI agent here
    call.say("Hello from the Voximplant Voice AI cloud.", {
      voice: VoiceList.Amazon.en_US_Joanna,
    });
  });

  call.addEventListener(CallEvents.PlaybackFinished, () => {
    call.hangup();
  });
});
```

    For more details, see the [Scenarios setup guide](/platform/getting-started/create-a-scenario) or the [Scenarios HTTP API reference](/reference/management-api/reference/scenarios).
  </Step>

  <Step title="Configure routing rules">
    ### 4. Configure routing rules
    
    Routing rules determine which scenario executes when traffic reaches the platform. They evaluate the destination string (dialed phone number, SIP address, or username) against a regular expression pattern:
    
    1. Inside your application, navigate to **Routing**.
    2. Click **New rule**.
    3. Set a descriptive name (e.g., `inbound-calls`).
    4. Set the **Pattern** field to `.*` (matches all incoming destinations).
    5. Under **Assigned scenarios**, drag or select your `voice-ai-agent.js` scenario.
    6. Click **Save**.
    
    <Note>
    Routing rules evaluate from top to bottom. The first rule whose pattern matches the destination executes. For initial testing, `.*` acts as an ideal catch-all pattern.
    </Note>
    
    For more details, see the [Routing rules setup guide](/platform/getting-started/create-a-routing-rule) or the [Routing rules HTTP API reference](/reference/management-api/reference/rules).
  </Step>

  <Step title="Configure Secrets and Application Storage">
    ### 5. Store API keys and configuration
    
    Voximplant provides two separate storage mechanisms inside every application:
    
    * **Secrets**: Encrypted storage for sensitive credentials like provider API keys (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`). Accessible via `VoxEngine.getSecretValue('<name>')`.
    * **Application Storage (`ApplicationStorage`)**: A persistent key-value store for non-sensitive runtime configuration, shared counters, and feature flags.

```javascript title="Read a secret and a storage key"
require(Modules.ApplicationStorage);

// Retrieve an encrypted API key
const apiKey = VoxEngine.getSecretValue("OPENAI_API_KEY");

// Retrieve non-sensitive configuration
const calleeDestination = (await ApplicationStorage.get("CALLEE_DESTINATION")).value;
```

    For more details, see the [Secrets guide](/platform/storage/secret-storage) and the [ApplicationStorage API reference](/reference/voxengine/application-storage).
  </Step>

  <Step title="Attach a phone number (optional)">
    ### 6. Attach a phone number
    
    If callers need to reach your Voice AI agent from a standard mobile phone or landline:
    
    1. In the Control Panel, go to **Numbers** → **Buy phone number**.
    2. Purchase a local, mobile, or toll-free number.
    3. Return to **Applications**, open your application, and select the **Numbers** tab.
    4. Attach the purchased number and bind it to your routing rule.
    
    <Info title="Testing without a phone number">
    If you are testing using WebRTC, our client SDKs, or the built-in Web Softphone under **Testing tools** in the top navigation bar, a phone number is optional.
    </Info>
  </Step>
</Steps>

---

## Choosing your Voice AI pipeline

Once your basic application structure is deployed, choose the pipeline architecture that fits your use case:

* **Speech-to-Speech (Full Duplex)**: Raw audio streams directly between the caller and an end-to-end conversational model with native turn-taking (e.g., OpenAI Realtime, Google Gemini Live, Ultravox, xAI Grok).
* **Half-Cascade (Speech/LLM $\rightarrow$ Realtime TTS)**: Use a multimodal speech model for reasoning, but pipe generated text into a dedicated low-latency neural TTS provider like [Grok TTS](/voice-ai/speech/grok-tts), Cartesia, or ElevenLabs for distinct voice branding.
* **Full Cascade (STT $\rightarrow$ LLM $\rightarrow$ TTS)**: Connect best-of-breed components—such as Deepgram for transcription, an open-source or commercial LLM for reasoning, and Cartesia or ElevenLabs for speech output.

---

## Next steps

Explore our production-ready connectors to wire up your chosen provider:

* [Voice AI Connectors Overview](/voice-ai/overview) — Browse complete scenario code and setup guides for OpenAI, Gemini, ElevenLabs, Cartesia, Deepgram, and more.
* [Inbound vs. Outbound Calling](/voice-ai/inbound-vs-outbound/inbound-calls) — Learn how to handle inbound customer service inquiries versus triggering proactive outbound AI agent calls.
* [Bring your own LLM](/voice-ai/bring-your-own-llm) — Connect custom self-hosted models or private OpenAI-compatible endpoints.