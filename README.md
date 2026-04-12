# Jira Meeting Bot

Real-time Jira ticket creation from meeting transcripts via Recall.ai.

## Setup

```bash
npm install
cp env.example .env
# fill in .env with your API keys
```

## Run

```bash
npm run dev       # development (tsx watch)
npm run build     # compile to dist/
npm start         # run compiled output
```

## Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/start-bot` | Launch a Recall.ai bot into a meeting |
| `ws://.../ws/recall` | Recall.ai streams transcript events here |
| `ws://.../ws/ui` | Dashboard connects here for proposals |

## Usage

1. Start the server with `npm run dev`
2. For local dev, expose the server with [ngrok](https://ngrok.com): `ngrok http 3001`
3. Set `PUBLIC_WS_URL=wss://<your-ngrok-id>.ngrok.io/ws/recall` in `.env`
4. Send a meeting URL to start a bot:

```bash
curl -X POST http://localhost:3001/api/start-bot \
  -H "Content-Type: application/json" \
  -d '{"meetingUrl": "https://zoom.us/j/..."}'
```