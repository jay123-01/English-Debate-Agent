# Voice Debate Agent Server

This server powers the Expo app and the Telegram bot client.

## HTTP API

```powershell
cd server
npm start
```

The Expo app calls the HTTP API with `EXPO_PUBLIC_API_URL`.

## Telegram Bot

Create a bot with BotFather, then add the token to `server/.env`:

```env
TELEGRAM_BOT_TOKEN=123456:your_bot_token
TELEGRAM_ALLOWED_USER_IDS=
```

`TELEGRAM_ALLOWED_USER_IDS` is optional. Leave it blank to allow anyone with the bot link, or set comma-separated Telegram numeric user IDs for a private test group:

```env
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
```

Run the bot with long polling:

```powershell
cd server
npm run telegram
```

The bot supports:

- `/new`: reset the chat session.
- `/paste`: paste a source article, prompt, transcript, or notes.
- `/state`: show current motion, stance, level, and persona.
- `/summary`: summarize the debate session.
- Text messages: debate turns.
- Voice messages: transcribed debate turns.
- Inline buttons: choose motion, stance, level, and persona.

The Telegram client reuses the same source brief, JSON RAG, debate opponent, coach feedback, session summary, and OpenAI TTS path as the HTTP API.
