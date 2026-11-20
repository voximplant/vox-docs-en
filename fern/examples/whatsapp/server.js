require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const VoximplantApiClient = require('@voximplant/apiclient-nodejs').default;

const app = express();
const PORT = process.env.PORT || 3000;
// Path to voximplant service account json file
const parameters = {
    pathToCredentials: './voximplant_service_account.json',
};
const client = new VoximplantApiClient(parameters);
client.onReady = function () {
    console.log("Voximplant API client is ready.");
};


// Middleware
app.use(bodyParser.json());

// Environment variables (similar to Lambda environment variables)
const config = {
    whatsappToken: process.env.WHATSAPP_TOKEN,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    apiVersion: process.env.API_VERSION || 'v18.0'
};

// WhatsApp API base URL
const whatsappApiUrl = `https://graph.facebook.com/${config.apiVersion}/${config.whatsappPhoneNumberId}`;

// Webhook verification endpoint (GET)
app.get('/webhook', (req, res) => {
    console.log('Webhook verification request received');

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.whatsappWebhookVerifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('Verification failed - invalid token');
            res.sendStatus(403);
        }
    } else {
        console.log('Verification failed - missing parameters');
        res.sendStatus(400);
    }
});

// Webhook message endpoint (POST)
// NOTE: For production use, validate the X-Hub-Signature-256 header using your app secret
// to verify that requests originate from Meta. See: https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
app.post('/webhook', async (req, res) => {
    console.log('Webhook message received:', JSON.stringify(req.body, null, 2));

    try {
        // Immediately respond to WhatsApp to acknowledge receipt
        res.status(200).send('EVENT_RECEIVED');

        // Process the webhook event
        await processWebhookEvent(req.body);
    } catch (error) {
        console.error('Error processing webhook:', error);
        // Note: We already sent 200, so we can't change the response now
        // In a production scenario, you might want to implement proper error handling
    }
});

// Process incoming webhook events
async function processWebhookEvent(body) {
    const entry = body.entry?.[0];
    if (!entry) {
        console.log('No entry found in webhook');
        return;
    }

    const changes = entry.changes?.[0];
    if (!changes || changes.field !== 'messages') {
        console.log('No relevant changes found');
        return;
    }

    const messages = changes.value.messages;
    if (!messages || messages.length === 0) {
        console.log('No messages found in webhook');
        return;
    }

    for (const message of messages) {
        await processMessage(message);
    }
}

// Process individual message
async function processMessage(message) {
    console.log('Processing message:', message);

    const from = message.from;
    const messageType = message.type;

    try {
        switch (messageType) {
            case 'text':
                await handleTextMessage(from, message.text.body);
                break;
            case 'image':
                await handleImageMessage(from, message.image);
                break;
            case 'audio':
                await handleAudioMessage(from, message.audio);
                break;
            case 'document':
                await handleDocumentMessage(from, message.document);
                break;
            case 'voiceai':
                await sendTextMessage(from, message.text.body);
                break;
            default:
                await sendTextMessage(from, `Sorry, I don't support ${messageType} messages yet.`);
                break;
        }
    } catch (error) {
        console.error(`Error processing ${messageType} message:`, error);
        // Optionally send an error message to the user
        await sendTextMessage(from, 'Sorry, I encountered an error processing your message.');
    }
}

// Handle text messages
async function handleTextMessage(from, text) {
    console.log("Checking Voximplant WAB session for " + from);
    try {
        const ev = await client.KeyValueStorage.getKeyValueItem({
            key: "WAB_" + from,
            applicationId: process.env.VOXIMPLANT_APP_ID,
        });
        console.log(ev);
        if (ev.result != undefined) {
            console.log("WAB call exists");
            let url = ev.result.value;
            if (url == undefined) {
                console.log("Voximplant session URL hasn't been found");
            } else {
                // make HTTP request to URL to communicate with the session
                await sendMessageToVox(url, text);
            }
        } else {
            console.log("WAB call doesn't exist");
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
    // console.log(`Received text message from ${from}: ${text}`);

    // const lowerText = text.toLowerCase().trim();

    // if (lowerText.includes('hello') || lowerText.includes('hi')) {
    //     await sendTextMessage(from, 'Hello! Welcome to our service. How can I help you today?');
    // } else if (lowerText.includes('help')) {
    //     await sendTextMessage(from, 'I can help you with:\n- Product information\n- Support questions\n- General inquiries\n\nJust ask me anything!');
    // } else {
    //     await sendTextMessage(from, `You said: "${text}". This is an automated response.`);
    // }
}

// Handle image messages
async function handleImageMessage(from, image) {
    console.log(`Received image message from ${from}`);
    await sendTextMessage(from, 'Thanks for the image! I received it successfully.');
}

// Handle audio messages
async function handleAudioMessage(from, audio) {
    console.log(`Received audio message from ${from}`);
    await sendTextMessage(from, 'Thanks for the audio message! I received it successfully.');
}

// Handle document messages
async function handleDocumentMessage(from, document) {
    console.log(`Received document from ${from}: ${document.filename}`);
    await sendTextMessage(from, `Thanks for the document "${document.filename}"! I received it successfully.`);
}

// Send text message to Voximplant WAB session
async function sendMessageToVox(url, text) {
    try {
        const response = await axios.post(
            url,
            {
                text: { body: text },
                type: 'text'
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Message to Voximplant sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
        throw error;
    }
}

// Send text message via WhatsApp API
async function sendTextMessage(to, text) {
    console.log('Sending text message to: ' + to);
    try {
        const response = await axios.post(
            `${whatsappApiUrl}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
                type: 'text'
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Message sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
        throw error;
    }
}

// Additional function to send template messages (if needed)
async function sendTemplateMessage(to, templateName, languageCode = 'en') {
    try {
        const response = await axios.post(
            `${whatsappApiUrl}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Template message sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending template message:', error.response?.data || error.message);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'WhatsApp Business API server is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp Business API server running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
