require(Modules.XAI);
// Pin the xAI Voice Agent model used by this example.
const GROK_MODEL = "grok-voice-latest";
const SYSTEM_PROMPT = `
  Your name is Voxi. You are a helpful voice assistant for phone callers representing the company Voximplant (pronounced VOX-im-plant).
  You can answer questions about the company, its voice AI integrations, and X/Twitter posts from the "voximplant" and "aylarov" handles.
  "aylarov" is the X handle for Alexey Aylarov, Voximplant's CEO.

  Keep responses short and telephony-friendly (usually 1-2 sentences).
  If the user asks for a live agent or an operator, call the "forward_to_agent" function.
  If the user says goodbye, call the "hangup_call" function.

  When answering a company/product question, prefer searching the knowledge base first.
  `;
const COLLECTION_ID = "collection_4c5a63ab-f739-4c13-93d2-05b74095c34a"; // uploaded documents to show RAG

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
                vector_store_ids: [COLLECTION_ID],
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

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient = undefined;
    let hangupCall = false,
        forwardToLiveAgent = false;

    call.answer();
    call.record({hd_audio: true, stereo: true}); // optional: call recording

    const callCloseHandler = () => {
        voiceAIClient?.close();
        VoxEngine.terminate();
    };
    call.addEventListener(CallEvents.Disconnected, callCloseHandler);
    call.addEventListener(CallEvents.Failed, callCloseHandler);

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
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.responseCreate({instructions: "Hello."});
        });

        // -------------------- Barge-in (keep it interruption-friendly) --------------------
        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.InputAudioBufferSpeechStarted, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            voiceAIClient.clearMediaBuffer();
        });

        // -------------------- Function calling --------------------
        voiceAIClient.addEventListener(XAI.VoiceAgentAPIEvents.ResponseFunctionCallArgumentsDone, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);

            const {name, call_id} = event?.data?.payload || {};
            let output;

            // Ignore server-side tools like collections_search / web_search / x_search
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

            // Create a conversationItem and send it
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
            XAI.VoiceAgentAPIEvents.ResponseOutputAudioDelta, // Not in enum
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

        voiceAIClient.addEventListener(XAI.Events.WebSocketMediaEnded, (event) => {
            Logger.write(`===${event.name}===>${JSON.stringify(event.data)}`);
            if (hangupCall) callCloseHandler();
            else if (forwardToLiveAgent) {
                call.say("Here is where I would forward the call via the phone network, SIP, or WhatsApp.");
                // See the forwardCallToPSTN, forwardCallToSIP, forwardCallToUser, and  handleBlindTransfer call methods
                // For this simple demo, we will just close and hang-up
                call.addEventListener(CallEvents.PlaybackFinished, callCloseHandler);
            }
        });
    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(error);
        VoxEngine.terminate();
    }
});
