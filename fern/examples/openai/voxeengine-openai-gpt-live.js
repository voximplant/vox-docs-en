/**
 * Voximplant + OpenAI GPT Live demo
 * Scenario: answer an incoming call, bridge it to gpt-live-1,
 * and delegate order and store-hours tools to a backend Responses model.
 */

require(Modules.OpenAI);

const SYSTEM_PROMPT = `
You are Voxy, a helpful voice assistant for phone callers.
Keep spoken replies brief, usually one or two sentences.
Delegate order lookups and store hours to the backend.
Do not invent an order status or opening hours.
If the caller asks about an order and did not give an order id, ask for the order id.
`;

const BACKEND_PROMPT = `
You help a live voice assistant. Transcripts can contain mistakes.
Use tools only for verified facts.
Call get_order_status when the caller asks about an order and an order id is known.
Call get_store_hours when the caller asks when the store is open.
Do not guess. Return the tool result as the answer.
`;

const ORDERS = {
    A0042: {
        status: "confirmed",
        detail: "Order A0042 shipped today and should arrive tomorrow.",
    },
    B1001: {
        status: "processing",
        detail: "Order B1001 is still being prepared and has not shipped.",
    },
};

const SESSION_CONFIG = {
    session: {
        model: "gpt-live-1",
        instructions: SYSTEM_PROMPT,
        audio: {
            output: {
                voice: "marin",
            },
        },
        delegation: {
            type: "responses",
            responses: {
                model: "gpt-5.6-luna",
                instructions: BACKEND_PROMPT,
                tools: [
                    {
                        type: "function",
                        name: "get_order_status",
                        description: "Look up the shipping status of an order by its order id.",
                        parameters: {
                            type: "object",
                            properties: {
                                order_id: {
                                    type: "string",
                                    description: "Order id, for example A0042.",
                                },
                            },
                            required: ["order_id"],
                        },
                    },
                    {
                        type: "function",
                        name: "get_store_hours",
                        description: "Return the store opening hours.",
                        parameters: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                ],
                tool_choice: "auto",
                parallel_tool_calls: false,
            },
        },
    },
};

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({call}) => {
    let voiceAIClient;
    const answeredCallIds = {};

    const eventPayload = (event) => event?.data?.payload || event?.data || {};

    const terminate = () => {
        voiceAIClient?.close();
        VoxEngine.terminate();
    };

    const executeTool = (name, args) => {
        if (name === "get_order_status") {
            const orderId = String(args?.order_id || "").trim().toUpperCase();
            const order = ORDERS[orderId];
            if (!order) {
                return {
                    status: "not_found",
                    order_id: orderId,
                    detail: "No order exists with that id.",
                };
            }
            return {
                status: order.status,
                order_id: orderId,
                detail: order.detail,
            };
        }

        if (name === "get_store_hours") {
            return {
                status: "ok",
                detail: "The store is open Monday to Friday, from 9 AM to 6 PM.",
            };
        }

        return {
            status: "unsupported",
            detail: "That tool is not available.",
        };
    };

    const handleFunctionCall = (item) => {
        if (
            !item
            || item.type !== "function_call"
            || !item.call_id
            || (item.status && item.status !== "completed")
            || answeredCallIds[item.call_id]
        ) {
            return;
        }

        answeredCallIds[item.call_id] = true;

        let args = {};
        try {
            args = item.arguments ? JSON.parse(item.arguments) : {};
        } catch (error) {
            Logger.write("===TOOL_ARGUMENTS_PARSE_FAILED===");
            Logger.write(error);
        }

        const result = executeTool(item.name, args);
        Logger.write(`===TOOL_CALL=== ${item.name}`);
        voiceAIClient.responseItemCreate({
            item: {
                type: "function_call_output",
                call_id: item.call_id,
                output: JSON.stringify(result),
            },
        });
        voiceAIClient.responseCreate({}); // continue the delegated backend turn
    };

    call.addEventListener(CallEvents.Disconnected, terminate);
    call.addEventListener(CallEvents.Failed, terminate);

    try {
        call.answer();

        voiceAIClient = await OpenAI.createLiveAPIClient({
            apiKey: VoxEngine.getSecretValue("OPENAI_API_KEY"),
            onWebSocketClose: terminate,
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.SessionStarted, () => {
            Logger.write("===SESSION_STARTED===");
            VoxEngine.sendMediaBetween(call, voiceAIClient);
            voiceAIClient.sessionInstructionsAppend({
                content: "Greet the caller immediately in English. "
                    + "Say they can ask for the status of order A0042 or B1001, or for store hours. "
                    + "Then pause and listen.",
                delegation_id: null,
            });
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.SessionInstructionsAppended, () => {
            voiceAIClient.sessionCommentaryAppend({
                content: "Begin the conversation now, following the instructions provided.",
                delegation_id: null,
            });
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.ResponseEvent, (event) => {
            const payload = eventPayload(event);
            const nestedEvent = payload.event;
            if (nestedEvent?.type !== "response.output_item.done") return;
            Logger.write(`===DELEGATION=== ${payload.delegation_id || "none"}`);
            handleFunctionCall(nestedEvent.item);
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.AgentStartedSpeaking, () => {
            Logger.write("===AGENT_STARTED_SPEAKING===");
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.AgentStoppedSpeaking, () => {
            Logger.write("===AGENT_STOPPED_SPEAKING===");
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.SessionInputTranscriptDelta, (event) => {
            const text = eventPayload(event).delta || eventPayload(event).transcript;
            if (text) Logger.write(`===USER=== ${text}`);
        });

        voiceAIClient.addEventListener(OpenAI.LiveAPIEvents.SessionOutputTranscriptDelta, (event) => {
            const text = eventPayload(event).delta || eventPayload(event).transcript;
            if (text) Logger.write(`===AGENT=== ${text}`);
        });

        [
            OpenAI.LiveAPIEvents.SessionDelegationCreated,
            OpenAI.LiveAPIEvents.SessionClosed,
            OpenAI.LiveAPIEvents.Error,
        ].forEach((eventName) => {
            voiceAIClient.addEventListener(eventName, (event) => {
                Logger.write(`===${event.name}===`);
                if (event?.data) Logger.write(JSON.stringify(event.data));
            });
        });

        voiceAIClient.sessionStart(SESSION_CONFIG);
    } catch (error) {
        Logger.write("===UNHANDLED_ERROR===");
        Logger.write(error);
        terminate();
    }
});
