/**
 * Voximplant + Deepgram Voice Agent connector demo
 * Scenario: answer an incoming call and bridge it to Deepgram Voice Agent.
 */

require(Modules.Deepgram);
const SYSTEM_PROMPT = `You are a helpful English-speaking voice assistant for phone callers. Keep your turns short and telephony-friendly (usually 1–2 sentences).`;

// -------------------- Deepgram Voice Agent settings --------------------
const SETTINGS_OPTIONS = {
    tags: ["voximplant", "deepgram", "voice_agent_connector", "incoming_call_demo"],
    agent: {
        language: "en",
        greeting: "Hi! I'm Voxi. How can I help today?",
        listen: {
            provider: {
                type: "deepgram",
                model: "flux-general-en",
                // ... additional provider options
            },
        },
        think: {
            provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
                // ... additional provider options

            },
            prompt: SYSTEM_PROMPT,
            // ... additional think options: context_length, functions, endpoint

        },
        speak: {
            provider: {
                type: "deepgram",
                model: "aura-2-cordelia-en",
                // Examples for other providers:
                // "type": "open_ai", "model": "tts-1", "voice": "alloy"
                // "type": "eleven_labs", "model_id": "eleven_monolingual_v1", "language_code": "en-US"
                // "type": "cartesia", "model_id": "sonic-2", "voice": {"mode": "id", "id": "voice-id"}, "language": "en"
                // "type": "aws_polly", "voice": "Matthew", "language_code": "en-US", "engine": "standard", "credentials": {...}
            },
            // ... additional speak options: endpoint (required for non-deepgram providers)
        },
        // ... additional agent options: context, greeting
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());


    try {
        const providerApiKey = VoxEngine.getSecretValue("DEEPGRAM_API_KEY");
        if (!providerApiKey) throw new Error("Set DEEPGRAM_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({ hd_audio: true, stereo: true });   // Optional: record the call

        // Create client and wire media
        voiceAIClient = await Deepgram.createVoiceAgentClient({
            apiKey: providerApiKey, // Add your Deepgram API key to Voximplant Secrets under `DEEPGRAM_API_KEY`
            settingsOptions: SETTINGS_OPTIONS,
        });
        VoxEngine.sendMediaBetween(call, voiceAIClient);


        // ---------------------- Event handlers -----------------------
        // Barge-in: keep conversation responsive
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.UserStartedSpeaking, () => {
            Logger.write("===BARGE-IN: Deepgram.VoiceAgentEvents.UserStartedSpeaking===");
            voiceAIClient.clearMediaBuffer();
        });

        // Capture transcript
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.ConversationText, (event) => {
            const {role, text} = event?.data?.payload || {};
            if (role && text) {
                Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
            }
        });

        // Consolidated "log-only" handlers - key Deepgram/VoxEngine debugging events
        [
            Deepgram.VoiceAgentEvents.Welcome,
            Deepgram.VoiceAgentEvents.SettingsApplied,
            Deepgram.VoiceAgentEvents.AgentThinking,
            Deepgram.VoiceAgentEvents.AgentAudioDone,
            Deepgram.VoiceAgentEvents.ConnectorInformation,
            Deepgram.VoiceAgentEvents.HTTPResponse,
            Deepgram.VoiceAgentEvents.Warning,
            Deepgram.VoiceAgentEvents.Error,
            Deepgram.VoiceAgentEvents.Unknown,
            Deepgram.Events.WebSocketMediaStarted,
            Deepgram.Events.WebSocketMediaEnded,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                Logger.write(JSON.stringify(event));
            });
        });
    } catch (e) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(JSON.stringify(e));
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
