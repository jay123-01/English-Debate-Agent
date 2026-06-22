# Mobile App Guidance

This directory contains the Expo React Native mobile app.

The app is responsible for:

- Accepting source input, starting with pasted prompts/text and later supporting PDF or YouTube transcript flows.
- Rendering a source brief: summary, key claims, debate motions, useful vocabulary, and stance selection.
- Recording user speech with `expo-audio`.
- Calling the backend API through `src/api/debateApi.js`.
- Rendering topic, stance, conversation, feedback, and latency UI.
- Reading debate replies aloud with `expo-speech`.

Do not parse PDFs, fetch YouTube transcripts, run embeddings, or call AI providers from the mobile app. Document parsing, chunking, retrieval, and AI provider calls must happen on the server.

Do not put API keys or private secrets in this directory. `EXPO_PUBLIC_*` values are bundled into the app and must be treated as public.

Use `EXPO_PUBLIC_API_URL` for the backend base URL. On a physical phone, this should usually be the computer's LAN IP rather than `localhost`.

Keep server communication code in `src/api/debateApi.js` unless there is a strong reason to split it.

Keep microphone recording logic in `src/hooks/useVoiceRecorder.js` unless the recording flow becomes large enough to justify another hook or helper.
