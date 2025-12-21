const axios = require('axios');
require('dotenv').config();

// Configuration
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_SECRET = process.env.VAPI_SECRET;
const ASSISTANT_ID = process.argv[2]; // Pass ID as first argument
const RAILWAY_URL = process.argv[3] || 'https://googletts-production-e22f.up.railway.app';

if (!VAPI_API_KEY) {
    console.error('ERROR: VAPI_API_KEY is missing in .env file.');
    process.exit(1);
}

if (!ASSISTANT_ID) {
    console.error('ERROR: Please provide the Assistant ID.');
    console.log('Usage: node update-assistant.js <ASSISTANT_ID> [RAILWAY_URL]');
    process.exit(1);
}

const updateData = {
    firstMessage: "สวัสดีค่ะ ดิฉันชื่อโซเฟีย มีอะไรให้ช่วยไหมคะ?",
    firstMessageMode: "assistant-speaks-first-with-model-generated-message",
    // Ensure the model is primed to respond
    transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "th"
    },
    model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "คุณคือโซเฟีย เอเจนต์อัจฉริยะที่พูดภาษาไทยได้อย่างเป็นธรรมชาติและสุภาพที่สุด (You are Sophia, an intelligent agent who speaks Thai naturally and very politely.)"
            }
        ],
        temperature: 0.7,
        maxTokens: 525
    },
    voice: {
        provider: "custom-voice",
        server: {
            url: `${RAILWAY_URL.replace(/\/$/, '')}/api/synthesize`,
            headers: {
                "x-vapi-secret": VAPI_SECRET
            },
            timeoutSeconds: 30
        }
    },
    // Important settings for immediate response
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    backgroundSound: "off",
    // Clear any previously set main server/webhook URL to avoid event noise
    server: null
};

async function updateAssistant() {
    try {
        console.log(`Updating assistant ${ASSISTANT_ID}...`);

        const response = await axios.patch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, updateData, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Assistant Updated Successfully!');
        console.log('ID:', response.data.id);
        console.log('Voice Server:', response.data.voice.server.url);
        console.log('First Message:', response.data.firstMessage);
    } catch (error) {
        console.error('\n❌ Error updating assistant:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

updateAssistant();
