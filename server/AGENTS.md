# Server Guidance

This directory contains the Node API server for the mobile app.

The server is responsible for:

- Accepting source input, starting with pasted prompt/text and later supporting PDF or YouTube transcript ingestion.
- Creating source briefs with summaries, key claims, useful vocabulary, and debate motions.
- Chunking source text and storing retrievable source context.
- Accepting voice turns at `/api/voice-turn`.
- Accepting typed turns at `/api/text-turn`.
- Keeping AI provider credentials on the server.
- Running transcription, source-grounded retrieval, debate reply generation, coach feedback, and latency tracing.

Keep configuration and `.env` loading in `src/config.js`.

Keep source analysis logic in `src/agents/sourceAgent.js` when that module is added.

Keep debate opponent behavior in `src/agents/debateAgent.js`.

Keep English coach feedback logic in `src/agents/coachAgent.js`.

Keep RAG and source storage utilities in `src/services/rag/` when those modules are added. Expected responsibilities include source storage, chunking, context retrieval, PDF parsing, and transcript handling.

Prefer a Node-native RAG path. If the local JSON store is outgrown, replace `sourceStore.js` and `retrieveContext.js` with a Node-accessible vector database such as pgvector, Qdrant, Chroma HTTP, or LanceDB rather than adding a Python worker by default.

Keep external provider calls in `src/services/`. OpenAI-specific code belongs in `src/services/openai.js`; Anthropic-specific code belongs in `src/services/anthropic.js`.

Keep request parsing helpers in `src/http/`.

After changing files in this directory, run:

```bash
npm run check
```
