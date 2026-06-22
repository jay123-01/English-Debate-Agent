const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 5173);
const ROOT = __dirname;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ready: true,
        hasApiKey: Boolean(OPENAI_API_KEY),
        model: OPENAI_MODEL,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/debate") {
      const payload = await readJson(req);
      const startedAt = Date.now();
      const result = OPENAI_API_KEY
        ? await generateOpenAIDebate(payload)
        : generateMockDebate(payload);

      sendJson(res, 200, {
        ...result,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    if (req.method === "GET") {
      serveStatic(url.pathname, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Voice Debate Lab is running at http://localhost:${PORT}`);
  console.log(
    OPENAI_API_KEY
      ? `Debate agent: OpenAI Responses API (${OPENAI_MODEL})`
      : "Debate agent: mock mode. Set OPENAI_API_KEY for OpenAI responses.",
  );
});

function serveStatic(requestPath, res) {
  const safePath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function generateOpenAIDebate(payload) {
  const topic = sanitizeText(payload.topic);
  const stance = payload.stance === "oppose" ? "oppose" : "support";
  const argument = sanitizeText(payload.argument);
  const history = Array.isArray(payload.history) ? payload.history.slice(-6) : [];
  const recentTurns = history
    .map((turn) => `${turn.role === "ai" ? "AI" : "User"}: ${sanitizeText(turn.text)}`)
    .join("\n");

  const instructions = [
    "You are a spoken English debate opponent for a learner.",
    "Respond in clear natural English.",
    "Take the opposite stance from the user.",
    "Keep the answer under 95 words.",
    "Use one counterargument, one reason, and one follow-up question.",
    "Do not mention that you are an AI model.",
  ].join(" ");

  const input = [
    `Topic: ${topic}`,
    `User stance: ${stance}`,
    recentTurns ? `Recent turns:\n${recentTurns}` : "",
    `User argument: ${argument}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input,
      max_output_tokens: 220,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ...generateMockDebate(payload),
      warning: `OpenAI request failed: ${response.status} ${errorText.slice(0, 160)}`,
    };
  }

  const data = await response.json();
  const text = extractOutputText(data);

  return {
    text: text || generateMockDebate(payload).text,
    mode: "openai",
    model: OPENAI_MODEL,
  };
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function generateMockDebate(payload) {
  const topic = sanitizeText(payload.topic || "this topic");
  const stance = payload.stance === "oppose" ? "oppose" : "support";
  const argument = sanitizeText(payload.argument || "");
  const opposite = stance === "support" ? "against" : "in favor of";
  const angle = pickCounterAngle(argument);

  return {
    text: [
      `I understand your point, but I would argue ${opposite} that position.`,
      angle,
      `For "${topic}", your claim needs a specific example or evidence.`,
      "What real case would prove your argument?",
    ].join(" "),
    mode: "mock",
    model: null,
  };
}

function pickCounterAngle(argument) {
  if (/\b(student|school|education|teacher|learn)\b/i.test(argument)) {
    return "Education also depends on fairness, motivation, and human judgment, which technology alone cannot guarantee.";
  }

  if (/\b(cost|money|expensive|fund|tax)\b/i.test(argument)) {
    return "A policy can sound useful while still failing if the cost is higher than the public benefit.";
  }

  if (/\b(freedom|right|choice|privacy)\b/i.test(argument)) {
    return "Individual freedom matters, but society also has to consider harm and responsibility.";
  }

  return "The weak point is that the benefit does not happen automatically.";
}

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1800);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
