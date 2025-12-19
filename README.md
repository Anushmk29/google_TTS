# Vapi Custom TTS Server - Google Cloud TTS for Thai (OAuth 2.0)

A high-performance custom TTS server that enables Vapi to use Google Cloud Text-to-Speech for natural Thai language synthesis. This implementation uses **OAuth 2.0** and direct REST API calls for maximum control and reliability.

## 🚀 Features

- 🇹🇭 **Thai Language Support** - Optimized for `th-TH-Neural2-C` (high quality).
- 🔐 **OAuth 2.0 Authentication** - Secure, token-based authentication (no more JSON key files).
- ⚡ **REST API Integration** - Direct calls to Google's TTS engine for low latency.
- 🤖 **Auto-Assistant Creation** - Includes a script to automatically create your Vapi agent.

---

## 🛠️ Setup Guide

### 1. Google Cloud Configuration

1.  Go to the **[Google Cloud Console](https://console.cloud.google.com)**.
2.  Enable the **Text-to-Speech API**.
3.  Go to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
    - **Application type:** Web application.
    - **Name:** Vapi TTS Server.
    - **Authorized redirect URIs:** Add `http://localhost:3001/oauth2callback`.
5.  Copy your **Client ID** and **Client Secret**.

### 2. Environment Setup

Create a `.env` file from the example:
```bash
cp .env.example .env
```

Fill in these required variables:
- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
- `VAPI_API_KEY`: Your **Private** API key from [Vapi Dashboard](https://dashboard.vapi.ai/account).

### 3. Generate Refresh Token

Run the included helper script to authorize your app:
```bash
node get-refresh-token.js
```
- A browser window will open. Sign in with your Google account.
- If you see "Google hasn't verified this app", click **Advanced > Go to Vapi TTS Server (unsafe)**.
- Once completed, copy the `GOOGLE_REFRESH_TOKEN` printed in your terminal and add it to your `.env`.

---

## 🤖 Create Vapi Assistant

I have provided a script that creates a pre-configured Vapi assistant with the Thai voice setup correctly.

1.  Start your server (or deploy to Railway).
2.  Run the command:
    ```bash
    # If running locally:
    node create-vapi-assistant.js http://localhost:3000

    # If already on Railway:
    node create-vapi-assistant.js https://your-app.up.railway.app
    ```
3.  Check your [Vapi Dashboard](https://dashboard.vapi.ai/assistants). You will see a new assistant named **"Google Thai Voice (Custom TTS)"**.

---

## 🧪 Testing & Verification

### Local Test
Once your `.env` is ready and server is running (`npm start`):

```bash
# Test synthesis (outputs test.pcm)
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"voice-request","text":"สวัสดีครับ","sampleRate":24000}}' \
  --output test.pcm
```

### Deploying to Railway
1. Push this repository to GitHub.
2. Connect it to [Railway](https://railway.app).
3. Add all your `.env` variables to the Railway "Variables" tab.
4. Railway will automatically detect the `package.json` and start the server.

---

## 📂 Project Structure

- `server.js`: The main Express server handling Vapi's TTS requests.
- `get-refresh-token.js`: Helper for Google OAuth authorization.
- `create-vapi-assistant.js`: API script to create your Vapi agent.
- `.env.example`: Template for credentials.

## ❓ Troubleshooting

- **401 Unauthorized (Vapi):** Make sure you are using the **Private** API key, not the public one.
- **invalid_client (Google):** Double-check your `GOOGLE_CLIENT_SECRET` for extra spaces.
- **redirect_uri_mismatch:** Ensure Google Console has `http://localhost:3001/oauth2callback` exactly.

## License
MIT
