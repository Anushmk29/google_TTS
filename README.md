# Vapi Custom TTS Server - Google Cloud TTS for Thai

A custom TTS server that enables Vapi to use Google Cloud Text-to-Speech for high-quality Thai language voice synthesis.

## Features

- 🇹🇭 **Thai Language Support** - Neural2 voices for natural Thai speech
- ⚡ **Real-time** - Optimized for Vapi's real-time call requirements
- 🔌 **n8n Compatible** - Trigger Vapi calls via webhooks (see [N8N_INTEGRATION.md](./N8N_INTEGRATION.md))

## Quick Start

### 1. Set Up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Text-to-Speech API**: Search for it in the API Library
4. Create a Service Account:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **Create Service Account**
   - Grant role: **Cloud Text-to-Speech User**
   - Create JSON key and download it

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_VOICE_NAME=th-TH-Neural2-C
```

Place your downloaded JSON key as `google-credentials.json` in the project root.

### 3. Install & Run

```bash
npm install
npm start
```

## Deployment

### Railway (Recommended)

1. Push code to GitHub
2. Create project on [Railway](https://railway.app)
3. Add environment variables:
   - Add contents of `google-credentials.json` as `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Or set up Google Cloud service account differently
4. Deploy!

> **Note**: For Railway, you'll need to modify the code to read credentials from environment variable instead of file. See Railway docs for Google Cloud authentication.

### Docker

```bash
docker build -t vapi-tts .
docker run -p 3000:3000 \
  -v /path/to/google-credentials.json:/app/google-credentials.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/google-credentials.json \
  -e GOOGLE_VOICE_NAME=th-TH-Neural2-C \
  vapi-tts
```

## Configure Vapi

In your Vapi assistant configuration:

```json
{
  "voice": {
    "provider": "custom-voice",
    "server": {
      "url": "https://your-server.railway.app/api/synthesize",
      "secret": "your_vapi_secret",
      "timeoutSeconds": 45
    }
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |
| `/api/synthesize` | POST | TTS endpoint (Vapi calls this) |

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Test TTS (Thai text)
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"voice-request","text":"สวัสดีครับ ยินดีต้อนรับ","sampleRate":24000}}' \
  --output test.pcm

# Play the audio (requires ffplay)
ffplay -f s16le -ar 24000 -ac 1 test.pcm
```

## Thai Voice Options

| Voice Name | Type | Gender | Quality |
|------------|------|--------|---------|
| th-TH-Neural2-C | Neural2 | Female | High (recommended) |
| th-TH-Standard-A | Standard | Female | Good (lower cost) |

## Troubleshooting

### Authentication Errors
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Check service account has Text-to-Speech permissions
- Ensure JSON key file exists and is readable

### No Audio Output
- Check server logs for Google API errors
- Verify Thai text is being sent correctly
- Test with simple Thai text: "สวัสดี"

## License

MIT
