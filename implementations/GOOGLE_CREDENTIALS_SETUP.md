# Google Cloud TTS Credentials Setup

Complete guide to set up Google Cloud Text-to-Speech API credentials for your Vapi TTS server.

## What You Need

| Credential | Purpose | Where It Goes |
|------------|---------|---------------|
| **Service Account JSON Key** | Authenticates your server with Google Cloud | `google-credentials.json` file or `GOOGLE_CREDENTIALS_JSON` env var |
| **Google Cloud Project** | Contains your TTS API and billing | Google Cloud Console |

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Enter a project name (e.g., `vapi-tts-thai`)
4. Click **Create**
5. Wait for project creation, then select it

> 💡 **Tip:** If you're new to Google Cloud, you get **$300 free credits** for 90 days.

---

## Step 2: Enable Text-to-Speech API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Cloud Text-to-Speech API"**
3. Click on it, then click **Enable**

![Enable API](https://cloud.google.com/text-to-speech/docs/images/enable-api.png)

---

## Step 3: Create a Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account**
3. Fill in:
   - **Name:** `vapi-tts-server`
   - **Description:** `Service account for Vapi TTS integration`
4. Click **Create and Continue**

### Assign Permissions

5. In **Grant this service account access**, add role:
   - Click **Select a role**
   - Search for: `Cloud Text-to-Speech User`
   - Select it
6. Click **Continue**, then **Done**

---

## Step 4: Create JSON Key

1. In the Service Accounts list, click on your new service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**

> ⚠️ **Important:** A JSON file will be downloaded. Keep this file secure - it provides access to your Google Cloud resources!

---

## Step 5: Configure Your Server

### Option A: Local Development (File-based)

1. Rename the downloaded file to `google-credentials.json`
2. Place it in your project root (`vapi-tts-server/`)
3. Create `.env` file:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_VOICE_NAME=th-TH-Neural2-C
GOOGLE_LANGUAGE_CODE=th-TH
```

4. Add to `.gitignore` (important!):
```
google-credentials.json
```

### Option B: Railway/Cloud Deployment (Environment Variable)

1. Open your `google-credentials.json` file
2. Copy the **entire contents** (it's JSON)
3. In Railway dashboard, add environment variable:
   - **Name:** `GOOGLE_CREDENTIALS_JSON`
   - **Value:** (paste the entire JSON content)

The server automatically detects this and creates a temp credentials file.

---

## Step 6: Verify Setup

### Test locally:

```bash
npm start
```

You should see:
```
TTS server listening on port 3000
Using Google Cloud TTS with voice: th-TH-Neural2-C
Language: th-TH
```

### Test TTS synthesis:

```bash
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"voice-request","text":"สวัสดีครับ","sampleRate":24000}}' \
  --output test.pcm
```

If successful, a `test.pcm` file will be created (should be > 0 bytes).

---

## Available Thai Voices

| Voice Name | Type | Gender | Quality | Cost |
|------------|------|--------|---------|------|
| `th-TH-Neural2-C` | Neural2 | Female | ⭐⭐⭐ High | $16/1M chars |
| `th-TH-Standard-A` | Standard | Female | ⭐⭐ Good | $4/1M chars |

**Free tier:** 1 million characters/month (Neural2) or 4 million (Standard)

---

## Troubleshooting

### "Could not load the default credentials"

**Cause:** Credentials file not found or not readable.

**Fix:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Check file exists: `dir google-credentials.json`
- For Railway: ensure `GOOGLE_CREDENTIALS_JSON` contains valid JSON

### "Permission denied" or "403 Forbidden"

**Cause:** Service account lacks TTS permissions.

**Fix:**
1. Go to IAM & Admin → IAM
2. Find your service account
3. Edit and add role: `Cloud Text-to-Speech User`

### "API not enabled"

**Cause:** Text-to-Speech API not enabled for your project.

**Fix:** Go to APIs & Services → Library → Enable "Cloud Text-to-Speech API"

### "Billing not enabled"

**Cause:** Google Cloud requires billing for API usage (even with free tier).

**Fix:**
1. Go to Billing in Google Cloud Console
2. Link a billing account to your project
3. You still get free tier credits

---

## Security Best Practices

1. **Never commit credentials** - Always add `google-credentials.json` to `.gitignore`
2. **Use environment variables in production** - Don't deploy with file-based credentials
3. **Rotate keys periodically** - Create new keys and delete old ones every 90 days
4. **Limit permissions** - Only grant `Cloud Text-to-Speech User`, not broader roles

---

## Quick Reference

```bash
# Environment variables needed:

# For local development:
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# For Railway/Cloud (use one or the other):
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}

# Optional voice settings:
GOOGLE_VOICE_NAME=th-TH-Neural2-C
GOOGLE_LANGUAGE_CODE=th-TH
```
