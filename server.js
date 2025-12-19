const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// OAuth 2.0 Configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

// Cache for access token
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  console.log('Refreshing OAuth 2.0 access token...');
  const { token } = await oauth2Client.getAccessToken();
  accessToken = token;
  // Expire a bit early to be safe (tokens usually last 1 hour)
  tokenExpiry = Date.now() + 3500 * 1000;
  return accessToken;
}

// Configuration
const VOICE_NAME = process.env.GOOGLE_VOICE_NAME || 'th-TH-Neural2-C';
const LANGUAGE_CODE = process.env.GOOGLE_LANGUAGE_CODE || 'th-TH';
const VAPI_SECRET = process.env.VAPI_SECRET;

// Secret validation middleware (per VAPI docs)
function validateSecret(req, res, next) {
  if (VAPI_SECRET) {
    const providedSecret = req.headers['x-vapi-secret'];
    if (providedSecret !== VAPI_SECRET) {
      console.warn(`Auth failed from ${req.ip} - invalid secret`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

// Request logging middleware for debugging VAPI requests
function logVapiRequest(req, res, next) {
  if (process.env.DEBUG_REQUESTS === 'true') {
    console.log('=== Incoming TTS Request ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('==============================');
  }
  next();
}

// Text preprocessing (handles SSML and character cleaning)
function preprocessText(text) {
  if (!text) return '';

  // Handle SSML tags - extract text content
  if (text.includes('<speak>')) {
    text = text.replace(/<[^>]*>/g, '').trim();
  }

  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'google-cloud-tts',
    voice: VOICE_NAME,
    language: LANGUAGE_CODE
  });
});

// Server info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Vapi Google Cloud TTS Server',
    version: '1.0.0',
    provider: 'google-cloud-tts',
    voice: VOICE_NAME,
    language: LANGUAGE_CODE,
    endpoints: {
      health: '/health',
      synthesize: '/api/synthesize'
    }
  });
});

// Main TTS endpoint (with VAPI authentication and logging middleware)
app.post('/api/synthesize', validateSecret, logVapiRequest, async (req, res) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Set up timeout protection
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, 30000);

  try {
    console.log(`TTS request started: ${requestId}`);

    // Extract and validate the request
    const { message } = req.body;
    if (!message) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Missing message object' });
    }

    const { type, text, sampleRate } = message;

    // Validate message type
    if (type !== 'voice-request') {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Validate text content
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Invalid or missing text' });
    }

    // Validate sample rate
    const validSampleRates = [8000, 16000, 22050, 24000, 44100];
    if (!validSampleRates.includes(sampleRate)) {
      clearTimeout(timeout);
      return res.status(400).json({
        error: 'Unsupported sample rate',
        supportedRates: validSampleRates,
      });
    }

    // Preprocess text (handles SSML and character cleaning)
    const processedText = preprocessText(text);

    console.log(
      `Synthesizing: ${requestId}, text="${processedText.substring(0, 50)}...", rate=${sampleRate}Hz, voice=${VOICE_NAME}`
    );

    // Generate the audio with Google Cloud TTS
    const audioBuffer = await synthesizeAudio(processedText, sampleRate);

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('TTS synthesis produced no audio');
    }

    clearTimeout(timeout);

    // Return raw PCM audio to VAPI
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', audioBuffer.length);
    res.write(audioBuffer);
    res.end();

    const duration = Date.now() - startTime;
    console.log(
      `TTS completed: ${requestId}, ${duration}ms, ${audioBuffer.length} bytes`
    );

  } catch (error) {
    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    console.error(`TTS failed: ${requestId}, ${duration}ms, ${error.message}`);

    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS synthesis failed', requestId, details: error.message });
    }
  }
});

// Google Cloud TTS REST implementation
async function synthesizeAudio(text, sampleRate) {
  const token = await getAccessToken();

  const requestBody = {
    input: { text },
    voice: {
      languageCode: LANGUAGE_CODE,
      name: VOICE_NAME,
    },
    audioConfig: {
      audioEncoding: 'LINEAR16', // Raw PCM 16-bit
      sampleRateHertz: sampleRate,
    },
  };

  const response = await axios.post(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Google returns base64 encoded audioContent in the REST response
  let audioContent = Buffer.from(response.data.audioContent, 'base64');

  // LINEAR16 from Google includes a 44-byte WAV header when returned
  // We need raw PCM for Vapi, so skip the header if present
  if (audioContent.length > 44 &&
    audioContent.toString('utf8', 0, 4) === 'RIFF') {
    audioContent = audioContent.slice(44);
  }

  return audioContent;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS server listening on port ${PORT}`);
  console.log(`Using Google Cloud TTS with voice: ${VOICE_NAME}`);
  console.log(`Language: ${LANGUAGE_CODE}`);
});

module.exports = app;
