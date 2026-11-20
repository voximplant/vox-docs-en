/**
 * Bring your own LLM demo: Chat Completions through an OpenAI-compatible API.
 * Scenario: answer an incoming call, transcribe caller speech, and respond with an external LLM.
 */

require(Modules.OpenAI);
require(Modules.ASR);

// -------------------- OpenAI-compatible LLM settings --------------------
const LLM_BASE_URL = "https://api.together.ai/v1";
const LLM_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
const SYSTEM_PROMPT = "You are a helpful phone assistant. Keep replies short and natural.";

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let asr;
    let chatClient;
    let responseText = "";
    let responseCompleted = false;
    let isResponding = false;
    const messages = [{role: "system", content: SYSTEM_PROMPT}];

    // Termination function - clean up ASR and the LLM client
    const terminate = () => {
        asr?.stop();
        chatClient?.close();
        VoxEngine.terminate();
    };

    // Speak the completed assistant response back to the caller
    const playFinalResponse = (text) => {
        if (responseCompleted) return;
        responseCompleted = true;
        isResponding = false;
        const finalText = text || responseText || "The LLM responded successfully.";
        Logger.write(`===LLM_DONE=== ${finalText}`);
        messages.push({role: "assistant", content: finalText});
        call.say(finalText);
    };

    // Send the caller's final transcript to the LLM
    const askLLM = (input) => {
        if (isResponding) {
            Logger.write("===SKIP_INPUT_WHILE_RESPONDING===");
            Logger.write(input);
            return;
        }
        isResponding = true;
        responseCompleted = false;
        responseText = "";
        messages.push({role: "user", content: input});

        chatClient.createChatCompletions({
            model: LLM_MODEL,
            messages,
            stream: true,
            max_tokens: 80,
        });
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        const providerApiKey = VoxEngine.getSecretValue("TOGETHER_API_KEY");
        if (!providerApiKey) throw new Error("Set TOGETHER_API_KEY in Voximplant Secrets");

        call.answer();
        // call.record({hd_audio: true, stereo: true}); // Optional: record the call

        // Create an OpenAI-compatible Chat Completions client
        chatClient = await OpenAI.createChatCompletionsAPIClient({
            apiKey: providerApiKey,
            baseUrl: LLM_BASE_URL,
            storeContext: false,
            onWebSocketClose: (event) => {
                Logger.write("===LLM.WebSocket.Close===");
                if (event) Logger.write(JSON.stringify(event));
                terminate();
            },
        });

        // Stream text deltas as they arrive
        chatClient.addEventListener(OpenAI.ChatCompletionsAPIEvents.ContentDelta, (event) => {
            const delta = event.data.payload.delta;
            if (!delta) return;
            responseText += delta;
            Logger.write(`===LLM_DELTA=== ${delta}`);
        });

        // Final content event from the Chat Completions client
        chatClient.addEventListener(OpenAI.ChatCompletionsAPIEvents.ContentDone, (event) => {
            playFinalResponse(event.data.payload.content);
        });

        // Raw chunk event used as a fallback completion signal
        chatClient.addEventListener(OpenAI.ChatCompletionsAPIEvents.Chunk, (event) => {
            const payload = event.data.payload;
            const finishReason = payload.choices?.[0]?.finish_reason;
            if (finishReason === "stop") playFinalResponse();
        });

        // ---------------------- Error and diagnostic events -----------------------
        chatClient.addEventListener(OpenAI.ChatCompletionsAPIEvents.ChatCompletionsAPIError, (event) => {
            Logger.write("===ChatCompletions.Error===");
            Logger.write(JSON.stringify(event));
        });

        chatClient.addEventListener(OpenAI.ChatCompletionsAPIEvents.ConnectorInformation, (event) => {
            Logger.write("===ChatCompletions.ConnectorInformation===");
            if (event?.data) Logger.write(JSON.stringify(event.data));
        });

        // Create ASR and send caller audio to it
        asr = VoxEngine.createASR({
            profile: ASRProfileList.Google.en_US,
        });

        // Send final ASR transcripts to the LLM
        asr.addEventListener(ASREvents.Result, (event) => {
            if (event.isFinal === false) return;
            const text = event.text?.trim();
            if (!text) return;
            Logger.write(`===USER=== ${text}`);
            askLLM(text);
        });

        asr.addEventListener(ASREvents.ASRError, (event) => {
            Logger.write("===ASR_ERROR===");
            Logger.write(JSON.stringify(event));
        });

        // Bridge caller audio to ASR and greet the caller
        call.sendMediaTo(asr);
        call.say("Connected to the LLM. Ask me something.");
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(JSON.stringify(error));
        terminate();
    }
});
