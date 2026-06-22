const { analyzeArgument } = require("../agents/coachAgent");
const { generateDebateReply } = require("../agents/debateAgent");
const { getDebatePhase } = require("./debatePhase");
const { createSpeech } = require("./openai");
const { retrieveContext } = require("./rag/retrieveContext");
const { saveTtsClip } = require("./ttsStore");

class Trace {
  constructor() {
    this.items = [];
  }

  add(label, ms) {
    this.items.push({ label, ms: Math.max(0, Math.round(ms)) });
  }
}

async function createDebateTurn(payload, options = {}) {
  const trace = options.trace || new Trace();
  const phase = getDebatePhase(payload.history);
  const retrievalStarted = Date.now();
  const retrieval = payload.sourceId
    ? await retrieveContext({
        sourceId: payload.sourceId,
        query: [payload.motion || payload.topic, payload.argument].filter(Boolean).join("\n"),
      })
    : { source: null, chunks: [], contextText: "" };
  if (payload.sourceId && !retrieval.source) {
    throw new Error("Source not found");
  }
  if (payload.sourceId) {
    trace.add("Source retrieval", Date.now() - retrievalStarted);
  }

  const debateStarted = Date.now();
  const debate = await generateDebateReply({
    ...payload,
    phase,
    sourceTitle: retrieval.source?.title,
    sourceContext: retrieval.contextText,
  });
  trace.add("Debate agent", Date.now() - debateStarted);

  const coachStarted = Date.now();
  const feedback = await analyzeArgument(payload.argument, {
    sourceContext: retrieval.contextText,
    phase,
  });
  trace.add("Coach agent", Date.now() - coachStarted);

  const ttsStarted = Date.now();
  const audio = await buildTtsAudio({
    text: debate.reply,
    persona: debate.tts,
    origin: options.origin,
    mode: options.audioMode || "url",
  });
  if (audio) {
    trace.add("TTS agent", Date.now() - ttsStarted);
  }

  return {
    reply: debate.reply,
    mode: debate.mode,
    persona: debate.persona,
    phase,
    audioUrl: audio?.audioUrl || null,
    audioBuffer: audio?.buffer || null,
    audioContentType: audio?.contentType || null,
    feedback,
    sourceContext: retrieval.chunks.map((chunk) => ({
      id: chunk.id,
      preview: chunk.content.slice(0, 180),
      score: Number.isFinite(chunk.score) ? Number(chunk.score.toFixed(3)) : null,
    })),
    latency: trace.items,
  };
}

async function buildTtsAudio({ text, persona, origin, mode }) {
  if (!persona || mode === "none") {
    return null;
  }

  try {
    const buffer = await createSpeech({
      text,
      voice: persona.voice,
      instructions: persona.instructions,
      speed: persona.speed,
    });
    if (!buffer) {
      return null;
    }

    if (mode === "buffer") {
      return {
        buffer,
        contentType: "audio/mpeg",
      };
    }

    if (!origin) {
      return null;
    }

    const clipId = saveTtsClip({ buffer });
    return {
      audioUrl: `${origin}/api/tts/${encodeURIComponent(clipId)}`,
      contentType: "audio/mpeg",
    };
  } catch {
    return null;
  }
}

module.exports = {
  Trace,
  createDebateTurn,
};
