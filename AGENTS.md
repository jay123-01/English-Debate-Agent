# Project Guidance

This repository contains two runnable prototypes:

- The root web/PWA prototype: `index.html`, `src/app.js`, `styles.css`, and `server.js`.
- The mobile-first app direction: `mobile-app/` plus `server/`.

The core product direction is source-grounded English debate practice:

- The user can provide a prompt, pasted text, an article, a PDF, or eventually a YouTube transcript.
- The app turns that source into a brief with a summary, key claims, useful vocabulary, and debate motions.
- The user chooses a motion, stance, and level, then debates against an AI opponent.
- The AI opponent should ground its counterarguments in the source when relevant.
- The coach should provide feedback on English fluency, natural expressions, debate logic, vocabulary, source use, and persuasiveness.

Prefer implementing new product behavior in `mobile-app/` and `server/` unless the user explicitly asks for the web/PWA prototype.

Treat the root web/PWA files as an earlier prototype. Keep them working when you touch them, but do not mirror every mobile/server feature into the web prototype by default.

Keep AI provider secrets out of client code. API keys belong in server environment variables or local server `.env` files, never in browser or Expo public configuration.

When changing JavaScript server files, run the relevant syntax or package check before reporting completion.
