require(Modules.XAI);
// Pin the xAI Voice Agent model used by this example.
const GROK_MODEL = "grok-voice-latest";
const SYSTEM_PROMPT = `
  Your name is Voxi. You are a helpful voice assistant for phone callers representing the company Voximplant (pronounced VOX-im-plant).
  Keep responses short and telephony-friendly (usually 1-2 sentences).
  If the user asks for a live agent or an operator, call the "forward_to_agent" function.
  If the user says goodbye, call the "hangup_call" function.
`;

// -------------------- Grok Voice Agent settings --------------------
const SESSION_PARAMETERS = {
    session: {
        voice: "Ara",
        turn_detection: {type: "server_vad"},
        instructions: SYSTEM_PROMPT,
        tools: [
            {type: "web_search"},
            {
                type: "file_search",
                vector_store_ids: ["collection_4c5a63ab-f739-4c13-93d2-05b74095c34a"], // optional RAG
                max_num_results: 5,
            },
            {
                type: "x_search",
                allowed_x_handles: ["voximplant", "aylarov"],
            },
            {
                type: "function",
                name: "forward_to_agent",
                description: "Forward the user to a live agent",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
            {
                type: "function",
                name: "hangup_call",
                description: "Hangup the call",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
        ],
    },
};

// Helper to parse custom data JSON from call setup
function parseCustomData() {
    const raw = VoxEngine.customData();
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (error) {
        Logger.write("===CUSTOM_DATA_PARSE_FAILED===");
        Logger.write(error);
        return {};
    }
}

VoxEngine.addEventListener(AppEvents.Started, async () => {
    let voiceAIClient;
    let call;
    let hangupCall = false;
    let forwardToLiveAgent = false;

    const {destination, callerId} = parseCustomData();

    if (!destination || !callerId) {
        Logger.write(
            "Missing destination or callerId. Provide custom data: {\"destination\":\"+15551234567\",\"callerId\":\"+13322776633\"}",
        );
        VoxEngine.terminate();
        return;
    }

    call = VoxEngine.callPSTN(destination, callerId);
    // Alternative outgoing paths (uncomment to use):
    // call = VoxEngine.callUser({username: destination, callerid: callerId});
    // call = VoxEngine.callSIP(`sip:${destination}@your-sip-domain`, callerId);
    // call = VoxEngine.callWhatsappUser({number: destination, callerid: callerId});

    // Termination functions - add cleanup and logging as needed
    call.addEventListener(CallEvents.Disconnected, ()=>VoxEngine.terminate());
    call.addEventListener(CallEvents.Failed, ()=>VoxEngine.terminate());

    try {
        voiceAIClient = await XAI.createVoiceAgentAPIClient({
            xAIApiKey: VoxEngine.getSecretValue("XAI_API_KEY"),
            model: GROK_MODEL,
            onWebSocketClose: (event) => {
                Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
                VoxEngine.terminate();
            },
        });

        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.ConversationCreated, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.sessionUpdate(SESSION_PARAMETERS);
        });

        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.SessionUpdated, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.responseCreate({instructions: "Hello."});
        });

        // Keep it interruption-friendly (barge-in).
        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.InputAudioBufferSpeechStarted, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.clearMediaBuffer();
        });

        // Function calling.
        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.ResponseFunctionCallArgumentsDone, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);

            const {name, call_id} = event?.data?.payload || {};
            let output;

            if (name !== "forward_to_agent" && name !== "hangup_call") {
                Logger.write(`===Ignoring unhandled function call: ${name}===`);
                return;
            }

            if (name === "forward_to_agent") {
                forwardToLiveAgent = true;
                output = {result: "Forwarding your call to a live agent. Please hold on."};
            } else if (name === "hangup_call") {
                hangupCall = true;
                output = {result: "Have a great day, goodbye!"};
            }

            voiceAIClient.conversationItemCreate({
                item: {
                    type: "function_call_output",
                    call_id,
                    output: JSON.stringify(output),
                },
            });
            voiceAIClient.responseCreate({});
        });

        // -------------------- Log Other Events --------------------
        [
            CallEvents.FirstAudioPacketReceived,
            XAI.Events.WebSocketMediaStarted,
            XAI.VoiceAgentAPIEvents.InputAudioBufferSpeechStopped,
            XAI.VoiceAgentAPIEvents.ConversationItemInputAudioTranscriptionCompleted,
            XAI.VoiceAgentAPIEvents.ConversationItemAdded,
            XAI.VoiceAgentAPIEvents.ResponseCreated,
            XAI.VoiceAgentAPIEvents.ResponseOutputItemAdded,
            XAI.VoiceAgentAPIEvents.ResponseDone,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioTranscriptDelta,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioTranscriptDone,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioDelta,
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioDone,
            XAI.VoiceAgentAPIEvents.ResponseOutputItemDone,
            XAI.VoiceAgentAPIEvents.ConnectorInformation,
            XAI.VoiceAgentAPIEvents.InputAudioBufferCommitted,
            XAI.VoiceAgentAPIEvents.WebSocketError,
            XAI.VoiceAgentAPIEvents.Unknown,
        ].forEach((evtName) => {
            voiceAIClient.addEventListener(evtName, (e) => {
                Logger.write(`===${e.name}===>${JSON.stringify(e)}`);
            });
        });

        voiceAIClient.addEventListener(XAI.Events.WebSocketMediaStarted, () => {
            VoxEngine.sendMediaBetween(call, voiceAIClient);
        });

        voiceAIClient.addEventListener(XAI.Events.WebSocketMediaEnded, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            if (hangupCall) callCloseHandler();
            else if (forwardToLiveAgent) {
                call.say("Here is where I would forward the call via the phone network or SIP.");
                call.addEventListener(CallEvents.PlaybackFinished, callCloseHandler);
            } else return;
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(error);
        VoxEngine.terminate();
    }
});
