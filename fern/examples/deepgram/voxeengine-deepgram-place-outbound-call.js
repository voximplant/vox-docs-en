/**
 * Voximplant + Deepgram Voice Agent connector demo
 * Scenario: place an outgoing PSTN call and bridge it to Deepgram Voice Agent.
 */

require(Modules.Deepgram);
const SYSTEM_PROMPT = `
You are Voxi, a helpful voice assistant for phone callers.
Keep responses short and telephony-friendly (usually 1-2 sentences).
`;

// -------------------- Deepgram Voice Agent settings --------------------
const SETTINGS_OPTIONS = {
    tags: ["voximplant", "deepgram", "voice_agent_connector", "outbound_call_demo"],
    agent: {
        language: "en",
        greeting: "Hi! This is Voxi from Voximplant. How can I help today?",
        listen: {
            provider: {
                type: "deepgram",
                model: "flux-general-en",
            },
        },
        think: {
            provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
            },
            prompt: SYSTEM_PROMPT,
        },
        speak: {
            provider: {
                type: "deepgram",
                model: "aura-2-cordelia-en",
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let call;
    let voiceAIClient;

    try {
        // This can be provided when manually running a routing rule in the Control Panel,
        // or via Management API using the `script_custom_data` parameter.
        // example: {"destination": "+15551234567","callerId": "+15557654321"}
        const {destination, callerId} = JSON.parse(VoxEngine.customData());

        // Place the outgoing call
        call = VoxEngine.callPSTN(destination, callerId);
        // Alternative outgoing paths (uncomment to use):
        // call = VoxEngine.callUser({username: destination, callerid: callerId});
        // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
        // call = VoxEngine.callWhatsappUser({number: destination, callerid: callerId});

        // Termination functions - add cleanup and logging as needed
        call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());
        call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());

        call.addEventListener(CallEvents.Connected, async () => {
            // Optional: record once connected
            call.record({hd_audio: true, stereo: true});

            // Create client and wire media after the callee answers
            const apiKey = VoxEngine.getSecretValue('DEEPGRAM_API_KEY');
            voiceAIClient = await Deepgram.createVoiceAgentClient({
                apiKey,
                settingsOptions: SETTINGS_OPTIONS,
            });
            VoxEngine.sendMediaBetween(call, voiceAIClient);

            // Barge-in: keep conversation responsive
            voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.UserStartedSpeaking, () => {
                Logger.write("===BARGE-IN: Deepgram.VoiceAgentEvents.UserStartedSpeaking===");
                voiceAIClient.clearMediaBuffer();
            });

            // Capture transcript
            voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.ConversationText, (event) => {
                const {role, text} = event?.data?.payload || {};
                if (role && text) Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
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
        });
    } catch (e) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(e);
        voiceAIClient?.close();
        VoxEngine.terminate();
    }
});
