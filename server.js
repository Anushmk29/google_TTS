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

// In-memory cache for commonly used audio phrases
// Key: md5(text + sampleRate)
const ttsCache = new Map();

// Secret validation logic
function isSecretValid(req) {
  if (!VAPI_SECRET) return true; // No secret set, any request is fine
  const providedSecret = req.headers['x-vapi-secret'];
  return providedSecret === VAPI_SECRET;
}

// Request logging middleware
function logVapiRequest(req, res, next) {
  if (process.env.DEBUG_REQUESTS === 'true') {
    console.log('=== Incoming Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Has Secret:', !!req.headers['x-vapi-secret']);
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

// Main TTS endpoint (with logging middleware)
app.post('/api/synthesize', logVapiRequest, async (req, res) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Set up timeout protection
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, 30000);

  try {
    const { message } = req.body;
    if (!message) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Missing message object' });
    }

    const { type, text, sampleRate } = message;

    // 1. Allow non-voice requests without secret check (helps with webhook noise)
    if (type !== 'voice-request') {
      console.log(`[INFO] Received ${type} message. Ignoring with 200 OK.`);
      clearTimeout(timeout);
      return res.status(200).json({ status: 'ignored' });
    }

    // 2. Validate secret ONLY for actual voice requests
    if (!isSecretValid(req)) {
      console.warn(`[AUTH] Invalid secret for voice-request from ${req.ip}`);
      clearTimeout(timeout);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`TTS request started: ${requestId} for text: "${text ? text.substring(0, 30) : ''}..."`);

    // Validate text content
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn(`[WARN] Received empty text in voice-request: ${requestId}`);
      clearTimeout(timeout);
      return res.status(200).json({ status: 'empty' }); // Don't error, just return nothing
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

    // Check cache first for high performance
    const cacheKey = crypto.createHash('md5').update(`${processedText}:${sampleRate}`).digest('hex');
    let audioBuffer = ttsCache.get(cacheKey);

    if (audioBuffer) {
      console.log(`Cache HIT for ${requestId}: "${processedText.substring(0, 30)}..."`);
    } else {
      console.log(
        `Cache MISS for ${requestId}: "${processedText.substring(0, 30)}...", rate=${sampleRate}Hz`
      );
      // Generate the audio with Google Cloud TTS
      audioBuffer = await synthesizeAudio(processedText, sampleRate);

      // Save it to cache
      if (audioBuffer && audioBuffer.length > 0) {
        ttsCache.set(cacheKey, audioBuffer);
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('TTS synthesis produced no audio');
    }

    clearTimeout(timeout);

    // Return raw PCM audio to VAPI
    // Vapi documentation recommends specific audio/l16 content type for PCM
    res.setHeader('Content-Type', `audio/l16; rate=${sampleRate}`);
    res.setHeader('Content-Length', audioBuffer.length);
    res.write(audioBuffer);
    res.end();

    const duration = Date.now() - startTime;
    console.log(
      `[SUCCESS] TTS ${requestId}: Served ${audioBuffer.length} bytes in ${duration}ms (Text: "${processedText.substring(0, 40)}...")`
    );

  } catch (error) {
    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    console.error(`[ERROR] TTS failed: ${requestId}, ${duration}ms`);
    if (error.response) {
      console.error('Google API Error:', error.response.status, JSON.stringify(error.response.data));
    } else {
      console.error(error.message);
    }

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

  // LINEAR16 from Google includes a WAV header. We need raw PCM for Vapi.
  // Robustly find the 'data' chunk and skip its 8-byte header (chunk ID + size)
  const dataPos = audioContent.indexOf('data');
  if (dataPos !== -1) {
    // skip 'data' (4 bytes) + chunk size (4 bytes)
    audioContent = audioContent.slice(dataPos + 8);
    console.log(`Stripped WAV header, raw PCM size: ${audioContent.length} bytes`);
  } else if (audioContent.toString('utf8', 0, 4) === 'RIFF') {
    // Fallback: if 'data' not found but it's a RIFF file, skip standard 44 bytes
    audioContent = audioContent.slice(44);
    console.warn('WAV "data" chunk not found, falling back to 44-byte skip');
  }

  return audioContent;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`TTS server listening on port ${PORT}`);
  console.log(`Using Google Cloud TTS with voice: ${VOICE_NAME}`);

  // Pre-cache common greetings to eliminate startup latency
  const greetings = [
    "สวัสดีค่ะ ดิฉันชื่อโซเฟีย มีอะไรให้ช่วยไหมคะ?",
    "สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ?",
    "สวัสดีค่ะ"
  ];

  console.log('Pre-caching common greetings (in background)...');

  // Run pre-caching without awaiting to avoid blocking server start
  (async () => {
    for (const text of greetings) {
      try {
        for (const rate of [24000, 16000, 8000]) {
          const processedText = preprocessText(text);
          const cacheKey = crypto.createHash('md5').update(`${processedText}:${rate}`).digest('hex');
          if (!ttsCache.has(cacheKey)) {
            const audio = await synthesizeAudio(processedText, rate);
            ttsCache.set(cacheKey, audio);
          }
        }
      } catch (e) {
        console.warn(`Failed to pre-cache phrase: "${text}" - ${e.message}`);
        if (e.response && e.response.data) {
          console.error('Google API Error Details:', JSON.stringify(e.response.data, null, 2));
        }
      }
    }
    console.log('Pre-caching complete. Server is warm and ready!');
  })();
});

module.exports = app;
