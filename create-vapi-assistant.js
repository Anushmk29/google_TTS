const axios = require('axios');
require('dotenv').config();

// Configuration from .env
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_SECRET = process.env.VAPI_SECRET;
const VOICE_NAME = process.env.GOOGLE_VOICE_NAME || 'th-TH-Neural2-C';

// IMPORTANT: Replace this with your actual Railway URL if not passing as an argument
const DEFAULT_RAILWAY_URL = 'https://googletts-production-47b4.up.railway.app';
const RAILWAY_URL = process.argv[2] || DEFAULT_RAILWAY_URL;

if (!VAPI_API_KEY) {
    console.error('ERROR: VAPI_API_KEY is missing in .env file.');
    process.exit(1);
}

if (RAILWAY_URL === 'YOUR_RAILWAY_URL_HERE') {
    console.error('ERROR: Please provide your Railway URL.');
    console.log('Usage: node create-vapi-assistant.js https://your-app.railway.app');
    process.exit(1);
}

const assistantConfig = {
    name: "Sophia - Thai Voice (Custom TTS)",
    firstMessage: "สวัสดีค่ะ ดิฉันชื่อโซเฟีย มีอะไรให้ช่วยไหมคะ?",
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
                content: "คุณคือโซเฟีย เอเจนต์อัจฉริยะที่พูดภาษาไทยได้อย่างเป็นธรรมชาติและสุภาพ (You are Sophia, an intelligent agent who speaks Thai naturally and politely.)"
            }
        ]
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
    }
};

async function createAssistant() {
    try {
        console.log('Creating assistant with configuration:');
        console.log(JSON.stringify(assistantConfig, null, 2));

        const response = await axios.post('https://api.vapi.ai/assistant', assistantConfig, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Assistant Created Successfully!');
        console.log('Assistant ID:', response.data.id);
        console.log('You can now test it in the Vapi Dashboard: https://dashboard.vapi.ai/assistants');
    } catch (error) {
        console.error('\n❌ Error creating assistant:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

createAssistant();
