require(Modules.ApplicationStorage);
require(Modules.OpenAI);

let sessionUrl = null, connected = false, cid = null, realtimeAPIClient = undefined;

const OPENAI_API_KEY = VoxEngine.getSecretValue("OPENAI_API_KEY");
const MODEL = "gpt-realtime-2.1";
const WA_PROXY_URL = "https://waproxy.ngrok.app/webhook";

const onWebSocketClose = (event) => {
    Logger.write("===ON_WEB_SOCKET_CLOSE==");
    Logger.write(JSON.stringify(event));
    VoxEngine.terminate();
};

VoxEngine.addEventListener(AppEvents.Started, (appEvent) => {
    sessionUrl = appEvent.accessSecureURL;
});

VoxEngine.addEventListener(AppEvents.HttpRequest, (appEvent) => {
    Logger.write("Inbound Http request");
    try {
        let data = JSON.parse(appEvent.content);
        if (data.text?.body != undefined) {

            const item = {
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": data.text.body,
                        },
                    ],
                },
            };

            // Client events are processed in order, so the item is in the
            // conversation before the response is generated
            realtimeAPIClient.conversationItemCreate(item);
            realtimeAPIClient.responseCreate({});
        }

    } catch (err) {
        Logger.write(JSON.stringify(err));
    }
    return "OK";
});

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({callerid, call}) => {
    cid = callerid;
    const realtimeAPIClientParameters = {
        model: MODEL,
        apiKey: OPENAI_API_KEY,
        type: OpenAI.RealtimeAPIClientType.REALTIME,
        onWebSocketClose,
    };

    call.answer();
    try {
        realtimeAPIClient = await OpenAI.createRealtimeAPIClient(realtimeAPIClientParameters);
        const session_update = {
            "session": {
                "type": "realtime",
                "model": MODEL,
                "instructions": `Your name is Voxy, you're a friendly and fun guy. You speak English only. You have to collect person's name, company he/she works at and his/her email. Call the 'createProfile' function whenever you learn all information including name, company and email address. You MUST NEVER mention the tools/functions to the user. You speak English ONLY, don't switch to any other language. Always continue the conversation after the user answers.`,
                "audio": {
                    "input": {
                        "transcription": {
                            "model": "gpt-4o-transcribe",
                            "language": "en",
                        },
                        "turn_detection": {
                            "type": "semantic_vad",
                            "eagerness": "auto",
                            "interrupt_response": true,
                        },
                    },
                    "output": {
                        "voice": "cedar",
                    },
                },
                "tools": [
                    {
                        "type": "function",
                        "name": "createProfile",
                        "description": "Save contact information of a user for the purpose of creating/updating profile information.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "The user's name",
                                },
                                "emailAddress": {
                                    "type": "string",
                                    "description": "The user's work/business email address.",
                                },
                                "organization": {
                                    "type": "string",
                                    "description": "The name of the company/organization where the user works.",
                                },
                            },
                            "required": ["name", "organization", "emailAddress"],
                        },
                    },
                ],
                "tool_choice": "auto",
            },
        };
        realtimeAPIClient.sessionUpdate(session_update);
        VoxEngine.sendMediaBetween(call, realtimeAPIClient);
        connected = true;
        const response = {};
        realtimeAPIClient.responseCreate(response);

        // Interruptions support: clear the media buffer in case of OpenAI's VAD detected speech input
        realtimeAPIClient.addEventListener(OpenAI.RealtimeAPIEvents.InputAudioBufferSpeechStarted, () => {
            Logger.write("===BARGE-IN: OpenAI.InputAudioBufferSpeechStarted===");
            if (realtimeAPIClient) realtimeAPIClient.clearMediaBuffer();
        });

        realtimeAPIClient.addEventListener(OpenAI.RealtimeAPIEvents.ResponseDone, async (event) => {
            // Logger.write("RESPONSE DONE");
            // Logger.write(JSON.stringify(event));
            // Check the function name and act accordingly
            if (event.data.payload?.response?.output[0].type == "function_call" && event.data.payload?.response?.output[0].name == "createProfile") {
                try {
                    let args = JSON.parse(event.data.payload.response.output[0].arguments);
                    if (args.name == "" || args.emailAddress == "" || args.organization == "") return;
                    Logger.write("Profile created, sending info to WhatsApp");
                    const obj = {
                        entry: [
                            {
                                changes: [
                                    {
                                        value: {
                                            messages: [
                                                {
                                                    from: cid,
                                                    type: "voiceai",
                                                    text: {
                                                        body: "Name: " + args.name + ", Email: " + args.emailAddress + ", Company: " + args.organization,
                                                    },
                                                },
                                            ],
                                        },
                                        field: "messages",
                                    },
                                ],
                            },
                        ],
                    };
                    Logger.write(JSON.stringify(obj));
                    await Net.httpRequestAsync(WA_PROXY_URL, {
                        method: "POST",
                        postData: JSON.stringify(obj),
                        enableSystemLog: true,
                        headers: [
                            "Content-Type: application/json",
                        ],
                    });
                    const response = {};
                    realtimeAPIClient.responseCreate(response);
                } catch (err) {
                    Logger.write(err);
                }
                // https://waproxy.ngrok.app/webhook
            }
        });

    } catch (error) {
        Logger.write("===SOMETHING_WENT_WRONG===");
        Logger.write(error);
        VoxEngine.terminate();
    }

    call.record({hd_audio: true, stereo: true});
    try {
        ApplicationStorage.put("WAB_" + callerid, sessionUrl, 60 * 90); // assuming that the call session wouldn't last longer than 1.5 hours
    } catch (e) {
        Logger.write("ApplicationStorage error: " + JSON.stringify(e));
    }

    call.addEventListener(CallEvents.Disconnected, () => {
        if (realtimeAPIClient) realtimeAPIClient.close();
        connected = false;
        try {
            ApplicationStorage.remove("WAB_" + callerid);
        } catch (e) {
            Logger.write("ApplicationStorage error: " + JSON.stringify(e));
        }
        VoxEngine.terminate();
    });


});

VoxEngine.addEventListener(AppEvents.Terminating, () => {
    if (connected) {
        try {
            ApplicationStorage.remove("WAB_" + cid);
        } catch (e) {
            Logger.write("ApplicationStorage error: " + JSON.stringify(e));
        }
    }
});
