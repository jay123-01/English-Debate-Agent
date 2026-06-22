# English Debate Agent

Source-grounded English debate practice with an Expo mobile app, a Node API server, and a Telegram bot client.

This repo has two prototypes:

- `mobile-app/`: the real Expo mobile app direction.
- root `index.html` + `server.js`: the earlier web/PWA prototype.

For the mobile app, start with [mobile-app/README.md](mobile-app/README.md).
For the Node API and Telegram bot client, start with [server/README.md](server/README.md).

## Earlier Web Prototype

The root web prototype is intentionally simple:

- Browser speech recognition turns your voice into text.
- A debate agent generates an opposing response.
- Browser speech synthesis reads the response aloud.
- Coach and memory layers run after the fast response path.

## Run

```bash
npm start
```

Open:

```text
http://localhost:5173
```

## Install as an app

This prototype is a PWA, so it can be installed like an app from a supported
browser.

- Chrome or Edge on desktop: open `http://localhost:5173`, then use the
  install button in the address bar or the in-app `Install app` button.
- Android Chrome: open the URL, then choose install from the browser menu.
- iPhone Safari: use Share, then Add to Home Screen.

## Use OpenAI responses

The app runs without an API key in mock mode. To use the OpenAI-backed debate agent, set:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5.5
npm start
```

On Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="your_api_key"
$env:OPENAI_MODEL="gpt-5.5"
npm start
```

## Architecture

Fast path:

```text
Mic Input -> Speech to Text -> Debate Agent -> Text to Speech
```

Background path:

```text
User argument -> English Coach -> Session Memory
```

This makes it easier to add layers later without slowing down the spoken reply.
