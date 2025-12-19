# Complete Vapi Setup Guide - Custom TTS with Twilio

This guide explains how to connect your Vapi assistant with your custom Google Cloud TTS server for real-time Thai voice calling.

## 📞 How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME VOICE CALL FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📱 User's Phone                                                            │
│      │                                                                       │
│      │ User speaks (Thai/English)                                           │
│      ▼                                                                       │
│  ☎️  Twilio Phone Number ───────────────────► Vapi Platform                 │
│                                                    │                         │
│                                                    │ 1. Speech-to-Text (STT) │
│                                                    ▼                         │
│                                              📝 Transcribed Text             │
│                                                    │                         │
│                                                    │ 2. LLM Processing       │
│                                                    │    (GPT-4/Claude)       │
│                                                    ▼                         │
│                                              🤖 AI Response Text             │
│                                                    │                         │
│                                                    │ 3. Tool Calling         │
│                                                    │    (if configured)      │
│                                                    ▼                         │
│                                              📝 Final Response Text          │
│                                                    │                         │
│                        ┌───────────────────────────┘                         │
│                        │ 4. Custom TTS Request                               │
│                        ▼                                                     │
│  🖥️  Your TTS Server (Railway/Render)                                       │
│      │                                                                       │
│      │ 5. Google Cloud TTS                                                  │
│      ▼                                                                       │
│  🔊 Thai Audio (PCM)                                                        │
│      │                                                                       │
│      └─────────────────────────────────────────► Vapi Platform              │
│                                                    │                         │
│                                                    │ 6. Stream to caller     │
│                                                    ▼                         │
│  📱 User hears Thai response                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Step-by-Step Setup

### Step 1: Deploy Your TTS Server

1. **Push to GitHub** (if not done already):
   ```bash
   git init
   git add .
   git commit -m "Custom TTS server"
   git remote add origin https://github.com/YOUR_USERNAME/vapi-tts-server.git
   git push -u origin main
   ```

2. **Deploy to Railway**:
   - Go to [Railway.app](https://railway.app)
   - Create new project → Deploy from GitHub repo
   - Add environment variable:
     - Create a new variable `GOOGLE_CREDENTIALS_JSON`
     - Paste the entire contents of your `google-credentials.json`
   - Railway will auto-deploy

3. **Get your server URL** (e.g., `https://vapi-tts-server-production.up.railway.app`)

> ⚠️ **Note**: For Railway, you need to modify `server.js` to read credentials from environment variable. See [Railway Google Auth Guide](#railway-google-auth-fix) below.

### Step 2: Update Your Vapi Assistant

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Select your assistant or create a new one
3. Go to **Voice** settings
4. Configure as follows:

```json
{
  "voice": {
    "provider": "custom-voice",
    "server": {
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/api/synthesize",
      "secret": "your_vapi_secret_here",
      "timeoutSeconds": 45
    },
    "fallbackPlan": {
      "voices": [
        {
          "provider": "eleven-labs",
          "voiceId": "21m00Tcm4TlvDq8ikWAM"
        }
      ]
    }
  }
}
```

Or in the dashboard UI:
- **Voice Provider**: Custom Voice
- **Server URL**: `https://YOUR-RAILWAY-URL.up.railway.app/api/synthesize`
- **Timeout**: 45 seconds

### Step 3: Verify Twilio Connection

Your Twilio number should already be connected to Vapi. To verify:

1. In Vapi Dashboard → **Phone Numbers**
2. Confirm your Twilio number is listed
3. It should show "Active" status

### Step 4: Test Your Setup

#### Option A: Test via Vapi Dashboard
1. Go to your assistant in Vapi Dashboard
2. Click **Test Call**
3. Choose your Twilio number
4. Call from your phone

#### Option B: Test via API
```bash
curl -X POST https://api.vapi.ai/call/phone \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistantId": "YOUR_ASSISTANT_ID",
    "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
    "customer": {
      "number": "+91XXXXXXXXXX"
    }
  }'
```

#### Option C: Dial your Twilio number directly
- Call your Twilio number from any phone
- The Vapi assistant should answer and speak in Thai

---

## 💰 Cost Breakdown

### Per 3-Minute Call (Average)

| Component | Rate | 3-min Cost | Notes |
|-----------|------|------------|-------|
| **Vapi Platform** | $0.05/min | $0.15 | Base orchestration |
| **Speech-to-Text** | ~$0.01/min | $0.03 | Deepgram/Whisper |
| **LLM (GPT-4o)** | ~$0.05/min | $0.15 | Varies by usage |
| **Custom TTS** | FREE | $0.00 | 1M chars/month free |
| **Twilio (India)** | ~$0.08/min | $0.24 | Outbound to mobile |
| **Total** | | **$0.57** | Per 3-min call |

### Monthly Estimates

| Usage Level | Calls/Month | Avg Duration | Monthly Cost |
|-------------|-------------|--------------|--------------|
| Light | 100 calls | 3 min | ~$57 |
| Medium | 500 calls | 3 min | ~$285 |
| Heavy | 2000 calls | 3 min | ~$1,140 |

### Google Cloud TTS Cost Detail

| Voice Type | Rate | Free Tier | After Free |
|------------|------|-----------|------------|
| Neural2 (th-TH-Neural2-C) | $16/1M chars | 1M chars FREE/month | $0.000016/char |

**For a 3-minute call:**
- Estimated TTS output: ~1,500 characters
- Cost: Within free tier (1M chars/month = ~666 calls FREE)

### Cost-Saving Tips

1. **Keep responses concise** - Fewer characters = lower TTS cost
2. **Use GPT-3.5 Turbo** instead of GPT-4 for simple tasks ($0.02/min vs $0.20/min)
3. **Use Vapi's free number** instead of Twilio for testing
4. **Monitor usage** in Vapi Dashboard → Analytics

---

## 🧪 Testing Checklist

- [ ] TTS server is deployed and accessible
- [ ] `curl https://YOUR-URL/health` returns OK
- [ ] Vapi assistant is configured with custom TTS
- [ ] Made a test call and heard Thai speech
- [ ] Tool calling works (if using)

---

## Railway Google Auth Fix

For Railway deployment, update `server.js` to read credentials from environment variable:

```javascript
// At the top of server.js, add:
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const fs = require('fs');
  const credPath = '/tmp/google-credentials.json';
  fs.writeFileSync(credPath, process.env.GOOGLE_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}
```

Then in Railway, add environment variable:
- **Name**: `GOOGLE_CREDENTIALS_JSON`
- **Value**: (paste entire contents of your JSON key file)

---

## Troubleshooting

### No audio / silent response
- Check TTS server logs in Railway
- Verify Google credentials are set correctly
- Test TTS endpoint directly with curl

### Call connects but AI doesn't respond
- Check Vapi assistant model settings
- Verify system prompt is configured
- Check Vapi call logs for errors

### High latency / slow response
- Google Cloud TTS typically adds 200-500ms
- Use Neural2 voice (faster than WaveNet)
- Keep AI responses short

### Thai pronunciation issues
- Confirm voice is set to `th-TH-Neural2-C`
- Check that text is actual Thai (not romanized)

---

## 📚 Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Google Cloud TTS Voices](https://cloud.google.com/text-to-speech/docs/voices)
- [Twilio Voice Pricing](https://www.twilio.com/voice/pricing)
