const axios = require('axios');
require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.argv[2];

if (!VAPI_API_KEY || !ASSISTANT_ID) {
    console.error('Usage: node inspect-assistant.js <ASSISTANT_ID>');
    process.exit(1);
}

async function inspectAssistant() {
    try {
        console.log(`Inspecting assistant: ${ASSISTANT_ID}...`);
        const response = await axios.get(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
            headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
        });

        console.log('\n--- CURRENT CONFIGURATION ---');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n--- KEY SETTINGS CHECK ---');
        console.log('First Message:', response.data.firstMessage);
        console.log('First Message Mode:', response.data.firstMessageMode);
        console.log('Voice Provider:', response.data.voice?.provider);
        console.log('Voice URL:', response.data.voice?.server?.url);

    } catch (error) {
        console.error('Error inspecting assistant:', error.response?.status, error.response?.data || error.message);
    }
}

inspectAssistant();
