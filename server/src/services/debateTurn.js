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
  const isFast = payload.responseMode === "fast" || options.responseMode === "fast";
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
    responseMode: isFast ? "fast" : "full",
  });
  trace.add("Debate agent", Date.now() - debateStarted);

  const [feedback, audio] = await Promise.all([
    withTimedTrace({
      label: "Coach agent",
      trace,
      task: () =>
        analyzeArgument(payload.argument, {
          sourceContext: retrieval.contextText,
          phase,
          fast: isFast,
        }),
    }),
    withTimedTrace({
      label: "TTS agent",
      trace,
      task: () =>
        buildTtsAudio({
          text: debate.reply,
          persona: debate.tts,
          origin: options.origin,
          mode: isFast ? "none" : options.audioMode || "url",
        }),
      shouldTrace: (audioResult) => Boolean(audioResult),
    }),
  ]);

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

async function withTimedTrace({ label, trace, task, shouldTrace = () => true }) {
  const started = Date.now();
  const result = await task();
  if (shouldTrace(result)) {
    trace.add(label, Date.now() - started);
  }
  return result;
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
