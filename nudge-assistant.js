const axios = require('axios');
require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.argv[2];

if (!VAPI_API_KEY || !ASSISTANT_ID) {
    console.error('Usage: node nudge-assistant.js <ASSISTANT_ID>');
    process.exit(1);
}

async function nudge() {
    const url = `https://api.vapi.ai/assistant/${ASSISTANT_ID}`;
    const headers = {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('Step 1: Clearing current greeting...');
        await axios.patch(url, {
            firstMessage: "...", // Temporary minimal message
            firstMessageMode: "assistant-waits-for-user"
        }, { headers });

        console.log('Step 2: Waiting 3 seconds for Vapi to sync...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Step 3: Restoring Thai greeting and forcing Speak First mode...');
        const response = await axios.patch(url, {
            firstMessage: "สวัสดีค่ะ ดิฉันชื่อโซเฟีย มีอะไรให้ช่วยไหมคะ?",
            firstMessageMode: "assistant-speaks-first"
        }, { headers });

        console.log('✅ Nudge Successful!');
        console.log('Current Mode:', response.data.firstMessageMode);
        console.log('Greeting:', response.data.firstMessage);

    } catch (error) {
        console.error('❌ Nudge Failed:', error.response?.status, error.response?.data || error.message);
    }
}

nudge();
