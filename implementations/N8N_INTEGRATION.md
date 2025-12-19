# n8n Integration Guide - Real-time Vapi Calls

This guide shows how to trigger Vapi phone calls from n8n webhooks in real-time.

## Architecture

```
n8n Webhook → Vapi API → Your TTS Server → Google Cloud TTS → Caller hears Thai speech
```

## Setup

### 1. Get Your Vapi API Key

1. Log in to [Vapi Dashboard](https://vapi.ai/dashboard)
2. Go to **Settings** → **API Keys**
3. Copy your API key

### 2. Create Assistant in Vapi

Create an assistant with your custom TTS:

```json
{
  "name": "Thai Voice Assistant",
  "voice": {
    "provider": "custom-voice",
    "server": {
      "url": "https://your-tts-server.railway.app/api/synthesize",
      "timeoutSeconds": 45
    }
  },
  "model": {
    "provider": "openai",
    "model": "gpt-4",
    "systemPrompt": "You are a helpful assistant that responds in Thai."
  },
  "firstMessage": "สวัสดีครับ มีอะไรให้ช่วยไหมครับ"
}
```

Save the **Assistant ID** after creation.

### 3. Configure n8n Workflow

#### Step 1: Add Webhook Trigger

1. Add a **Webhook** node
2. Set HTTP Method: `POST`
3. Copy the webhook URL

#### Step 2: Add HTTP Request Node to Call Vapi

1. Add **HTTP Request** node
2. Configure:

| Setting | Value |
|---------|-------|
| Method | POST |
| URL | `https://api.vapi.ai/call/phone` |
| Authentication | Header Auth |
| Header Name | `Authorization` |
| Header Value | `Bearer YOUR_VAPI_API_KEY` |

3. Body (JSON):

```json
{
  "assistantId": "your-assistant-id",
  "phoneNumberId": "your-vapi-phone-number-id",
  "customer": {
    "number": "{{ $json.phoneNumber }}"
  }
}
```

#### Step 3: (Optional) Handle Callback

Add a second webhook to receive call status updates:

1. Add another **Webhook** node for callbacks
2. In Vapi call request, add:
   ```json
   {
     "serverUrl": "https://your-n8n-webhook-url/callback"
   }
   ```

## Complete n8n Workflow JSON

Import this into n8n:

```json
{
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "trigger-call"
      }
    },
    {
      "name": "Call Vapi",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "method": "POST",
        "url": "https://api.vapi.ai/call/phone",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_VAPI_API_KEY"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"assistantId\": \"YOUR_ASSISTANT_ID\",\n  \"phoneNumberId\": \"YOUR_PHONE_NUMBER_ID\",\n  \"customer\": {\n    \"number\": \"{{ $json.phoneNumber }}\"\n  }\n}"
      }
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{ "node": "Call Vapi", "type": "main", "index": 0 }]]
    }
  }
}
```

## Triggering a Call

Send POST request to your n8n webhook:

```bash
curl -X POST https://your-n8n-instance/webhook/trigger-call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+66812345678"}'
```

## Real-time Considerations

- **Latency**: Google Cloud TTS typically responds in 200-500ms
- **Timeout**: Set Vapi timeout to at least 45 seconds
- **Queue**: n8n processes webhooks sequentially by default

## Troubleshooting

### Call Not Connecting
- Verify Vapi phone number is active
- Check customer phone number format (E.164: +66...)
- Review Vapi dashboard for call logs

### No Audio / Silent Call
- Check TTS server is reachable from internet
- Verify server returns correct PCM audio format
- Check Google Cloud TTS credits/quota

### n8n Webhook Timeout
- Increase webhook timeout in n8n settings
- Consider async processing for long operations

## Resources

- [Vapi API Docs](https://docs.vapi.ai)
- [n8n Documentation](https://docs.n8n.io)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech)
