const http = require("node:http");

const { createSessionSummary } = require("./agents/sessionAgent");
const { createSource } = require("./agents/sourceAgent");
const { config } = require("./config");
const {
  cleanText,
  getRequestOrigin,
  parseHistory,
  publicErrorMessage,
  readJson,
  sendJson,
  setCorsHeaders,
} = require("./http/httpUtils");
const { parseMultipartForm, readRequestBuffer } = require("./http/multipart");
const { Trace, createDebateTurn } = require("./services/debateTurn");
const { transcribeAudio } = require("./services/openai");
const { getTtsClip } = require("./services/ttsStore");

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ready: true,
        hasApiKey: Boolean(config.openaiApiKey),
        hasAnthropicKey: Boolean(config.anthropicApiKey),
        responseModel: config.responseModel,
        transcriptionModel: config.transcriptionModel,
        embeddingModel: config.embeddingModel,
        ttsModel: config.ttsModel,
        anthropicModel: config.anthropicModel,
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/tts/")) {
      await handleTtsClip(url, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/voice-turn") {
      await handleVoiceTurn(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sources") {
      await handleCreateSource(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/text-turn") {
      await handleTextTurn(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/session-summary") {
      await handleSessionSummary(req, res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: publicErrorMessage(error) });
  }
});

server.listen(config.port, () => {
  console.log(`Voice Debate mobile API is running at http://localhost:${config.port}`);
  console.log(
    config.openaiApiKey
      ? `OpenAI enabled: ${config.responseModel}, ${config.transcriptionModel}`
      : config.anthropicApiKey
        ? `Anthropic enabled for debate replies: ${config.anthropicModel}. STT remains mock without OPENAI_API_KEY.`
        : "Mock mode: set OPENAI_API_KEY or ANTHROPIC_API_KEY for real debate replies.",
  );
});

async function handleVoiceTurn(req, res) {
  const trace = new Trace();
  const body = await readRequestBuffer(req);
  const { fields, files } = parseMultipartForm(req.headers["content-type"], body);

  const audio = files.audio;
  if (!audio) {
    sendJson(res, 400, { error: "Missing audio file" });
    return;
  }

  const transcriptionStarted = Date.now();
  const transcription = await transcribeAudio(audio);
  trace.add("Speech to text", Date.now() - transcriptionStarted);

  const payload = {
    topic: fields.motion || fields.topic || "Should AI be used in education?",
    stance: fields.stance === "oppose" ? "oppose" : "support",
    sourceId: fields.sourceId,
    motion: fields.motion || fields.topic,
    userStance: fields.userStance || fields.stance,
    aiStance: fields.aiStance,
    level: fields.level,
    personaId: fields.personaId,
    origin: getRequestOrigin(req),
    argument: transcription.text,
    history: parseHistory(fields.history),
  };

  const result = await createDebateTurn(payload, {
    trace,
    origin: getRequestOrigin(req),
    audioMode: "url",
  });
  sendJson(res, 200, {
    ...result,
    audioBuffer: undefined,
    audioContentType: undefined,
    transcript: transcription.text,
    warnings: [transcription.warning].filter(Boolean),
  });
}

async function handleCreateSource(req, res) {
  const payload = await readJson(req);
  const source = await createSource({
    sourceType: payload.sourceType,
    title: payload.title,
    text: payload.text,
  });

  sendJson(res, 201, source);
}

async function handleTextTurn(req, res) {
  const trace = new Trace();
  const payload = await readJson(req);
  const argument = cleanText(payload.argument);

  if (!argument) {
    sendJson(res, 400, { error: "Missing argument" });
    return;
  }

  const result = await createDebateTurn(
    {
      topic: payload.topic || "Should AI be used in education?",
      stance: payload.stance === "oppose" ? "oppose" : "support",
      sourceId: payload.sourceId,
      motion: payload.motion || payload.topic,
      userStance: payload.userStance || payload.stance,
      aiStance: payload.aiStance,
      level: payload.level,
      personaId: payload.personaId,
      origin: getRequestOrigin(req),
      argument,
      history: Array.isArray(payload.history) ? payload.history : [],
    },
    {
      trace,
      origin: getRequestOrigin(req),
      audioMode: "url",
    },
  );

  sendJson(res, 200, {
    ...result,
    audioBuffer: undefined,
    audioContentType: undefined,
    transcript: argument,
    warnings: [],
  });
}

async function handleSessionSummary(req, res) {
  const payload = await readJson(req);
  const summary = await createSessionSummary({
    motion: payload.motion || payload.topic,
    userStance: payload.userStance || payload.stance,
    aiStance: payload.aiStance,
    turns: Array.isArray(payload.history) ? payload.history : [],
    sourceTitle: payload.sourceTitle,
  });

  sendJson(res, 200, summary);
}

async function handleTtsClip(url, res) {
  const clipId = decodeURIComponent(url.pathname.replace("/api/tts/", ""));
  const clip = getTtsClip(clipId);
  if (!clip) {
    sendJson(res, 404, { error: "TTS clip not found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": clip.contentType,
    "Content-Length": clip.buffer.length,
    "Cache-Control": "private, max-age=1800",
  });
  res.end(clip.buffer);
}
