/**
 * Voximplant + Deepgram Voice Agent connector demo
 * Feature highlighted: CROSS-CALL CONTEXT HISTORY using ApplicationStorage + agent.context.messages
 */

require(Modules.Deepgram);
require(Modules.ApplicationStorage);

const HISTORY_TTL_SECONDS = 14 * 24 * 3600; // 2 weeks
const MAX_HISTORY_ITEMS = 10;

const SYSTEM_PROMPT = `
You are a helpful English-speaking voice assistant for phone callers.
Keep your turns short and telephony-friendly (usually 1–2 sentences).

If conversation history is present, start by briefly summarizing what the caller asked last time in 1 sentence, then ask how you can help.
`;

function safeParseJsonArray(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        void error;
        return [];
    }
}

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;

    // Caller ID is used as a simple "user identity" for the demo.
    const callerId = call.callerid() || null;
    const historyKey = callerId ? `dgva_history:${callerId}` : null;
    let rollingHistory = [];

    async function saveHistory() {
        if (!historyKey) return;
        await ApplicationStorage.put(historyKey, JSON.stringify(rollingHistory), HISTORY_TTL_SECONDS);
        Logger.write("===CROSS_CALL_HISTORY_SAVED===");
        Logger.write(JSON.stringify({callerId, messages: rollingHistory.length}));
    }

    async function terminate() {
        try {
            await saveHistory();
            voiceAIClient?.close();
        } catch (error) {
            Logger.write(`===CROSS_CALL_HISTORY_SAVE_ERROR===> ${JSON.stringify(error)}`);
        }
        VoxEngine.terminate();

    }

    try {
        call.answer();

        // -------------------- Load cross-call history --------------------
        if (historyKey) {
            const stored = await ApplicationStorage.get(historyKey);
            rollingHistory = safeParseJsonArray(stored?.value);
            Logger.write("===CROSS_CALL_HISTORY_LOADED===");
            Logger.write(JSON.stringify({callerId, messages: rollingHistory.length}));
        } else {
            Logger.write("===CROSS_CALL_HISTORY_DISABLED=== Missing caller ID");
        }

        // -------------------- Deepgram Voice Agent settings --------------------
        const SETTINGS_OPTIONS = {
            tags: ["voximplant", "deepgram", "voice_agent_connector", "cross_call_history_demo"],
            agent: {
                language: "en",
                greeting: "Hi! I'm Voxi. How can I help today?",
                context: {
                    messages: rollingHistory,
                },
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
                        temperature: 0.6,
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

        // Create client and wire media
        voiceAIClient = await Deepgram.createVoiceAgentClient({
            apiKey: VoxEngine.getSecretValue('DEEPGRAM_API_KEY'),
            settingsOptions: SETTINGS_OPTIONS,
        });
        VoxEngine.sendMediaBetween(call, voiceAIClient);

        call.addEventListener(CallEvents.Disconnected, () => {
            terminate();
        });
        call.addEventListener(CallEvents.Failed, () => {
            terminate();
        });

        // -------------------- Update rolling history --------------------
        // Deepgram emits history items suitable for agent.context.messages.
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.History, (event) => {
            const item = event?.data?.payload;
            if (!item) return;

            rollingHistory.push(item);
            rollingHistory = rollingHistory.slice(-MAX_HISTORY_ITEMS);
        });

        // Optional: log transcript
        voiceAIClient.addEventListener(Deepgram.VoiceAgentEvents.ConversationText, (event) => {
            const {role, text} = event?.data?.payload || {};
            if (role && text) Logger.write(`===TRANSCRIPT=== ${role}: ${text}`);
        });
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        terminate();
    }
});
