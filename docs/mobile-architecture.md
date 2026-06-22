# Mobile Voice Debate Agent Architecture

This is the mobile-first version of the project.

## Fast path

```text
Phone mic
  -> Expo audio recording
  -> server /api/voice-turn
  -> OpenAI speech-to-text
  -> Debate Agent
  -> phone text-to-speech
```

## Background path

```text
Transcript
  -> Coach Agent
  -> Feedback metrics
  -> Session memory later
```

The fast path returns the spoken debate reply first. Extra layers should be
added around it instead of blocking the main voice reply.

## Project folders

```text
mobile-app/
  App.js
  src/api/debateApi.js
  src/hooks/useVoiceRecorder.js
  src/theme.js

server/
  src/server.js
  src/services/openai.js
  src/services/anthropic.js
  src/agents/debateAgent.js
  src/agents/coachAgent.js
  src/http/multipart.js
```

## Why the OpenAI key stays on the server

The mobile app only stores `EXPO_PUBLIC_API_URL`. Expo public variables are
bundled into the app, so secrets do not belong there. The OpenAI API key stays
in `server/.env` or your production server environment.

The same rule applies to `ANTHROPIC_API_KEY`. Keep it in the server
environment, not in `mobile-app/.env.local`.
