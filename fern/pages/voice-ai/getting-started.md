# Getting started

Most Voice AI orchestration guides assume you already have a functional telephony backend running in Voximplant. If you are starting from scratch, this step-by-step guide walks you through setting up the foundation: creating an account, launching your first application, configuring low-latency scenarios, and attaching a phone number so your AI voice agent can make and receive live phone calls.

---

## 1. Create a Voximplant account

If you haven't registered yet:

1. Sign up for an account in the [Voximplant Control Panel]().
2. Choose a unique **Account name** (this acts as your global namespace across the platform).
3. Confirm your email address and log in to the dashboard to claim your initial testing balance.

---

## 2. Create an application

In Voximplant, an **Application** is the central container that isolates your code, routing rules, phone numbers, and API credentials:

1. In the left navigation menu, click **Applications**.
2. Click **Create application** (or the **+** icon).
3. Name your application (for example, `voice-ai-assistant`).
4. Click **Create**.

Click on your newly created application to open its workspace.

---

## 3. Create a Voice AI scenario

Scenarios are serverless JavaScript files executed inside Voximplant's real-time media engine (VoxEngine). This is where your telephony call legs connect to voice AI streams.

To create your initial  scenario:

1. Inside your application, navigate to the **Scenarios** tab.
2. Click **Create scenario** (or **+**).
3. Create a name for the scenario.
4. Paste the starter code into the Cloud IDE editor.
5. Click **Save** in the top-right corner.

<Warning title="Crucial: Disable DTX for Voice AI">
Discontinuous Transmission (DTX) pauses audio transmission during silence. While useful for saving bandwidth in standard phone calls, DTX introduces clipping, latency, and false turn-detection interrupts in conversational voice AI. Always set `disableDtxForAudio: true` when answering or initiating calls for Voice AI workflows.
</Warning>

---

## 4. Create a routing rule

A scenario does not run until it is triggered. A **Routing rule** acts as the switchboard that listens for incoming calls or API requests and runs your scenario:

1. In your application, navigate to the **Routing** tab.
2. Click **New rule**.
3. Name your rule (for example, `ai-agent-routing`).
4. Set the **Pattern** field to `.*` (this regex matches all incoming calls).
5. Under **Assigned scenarios**, drag or select your scenario.
6. Click **Save**.

---

## 5. Get a phone number (optional)

If you want callers to reach your AI agent by dialing a real mobile or landline phone, attach a phone number to your application:

1. In the main menu, go to **Numbers** → **Buy phone number**.
2. Select **Real** or **Test** numbers, choose your target country and city, and complete the purchase.
3. Open your application, go to the **Numbers** tab, and click **Attach number**.
4. Select your purchased number, choose your `ai-agent-routing` rule, and click **Attach**.

<Info title="Testing without a phone number">
If you are developing in-app voice agents using our Web, iOS, or Android SDKs, or testing via the Control Panel's built-in **Web softphone** (located under **Testing tools** in the top navigation bar), you do not need to buy a phone number.
</Info>

---

## 6. Store provider API keys in Secrets

When integrating third-party AI providers (such as OpenAI, ElevenLabs, Cartesia, Deepgram, or Google), avoid hardcoding API keys directly into your JavaScript scenario files. Instead, use the built-in Secrets vault:

1. Inside your application, navigate to the **Secrets** tab.
2. Click **Add secret**.
3. Enter a key name (e.g., `OPENAI_API_KEY` or `ELEVENLABS_API_KEY`) and paste your provider token.
4. Access the stored secret safely in your scenarios using `VoxEngine.getSecret()`.

---

## Next steps: Connect your AI provider

Now that your application workspace, scenario engine, and routing switchboard are configured, you are ready to implement conversational intelligence.

Choose the architecture that fits your use case:

* **Speech-to-Speech & Realtime APIs** — Connect low-latency streaming agents with [OpenAI Realtime](), [Google Gemini Live](), or [Ultravox]().
* **Cascade Pipelines** — Build modular architectures by combining [Deepgram]() (STT), your own self-hosted or cloud LLM, and [Cartesia]() or [ElevenLabs]() (TTS).
* **Tool Calling with MCP** — Connect your live voice bot to CRMs, ticketing systems, and databases using the native VoxEngine [Model Context Protocol (MCP)]() client.