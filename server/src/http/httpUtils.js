const { config } = require("../config");

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function parseHistory(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function publicErrorMessage(error) {
  const message = String(error?.message || "Server error");

  if (/Headers\.append|Authorization|Bearer|sk-[A-Za-z0-9_-]+/.test(message)) {
    return "AI provider configuration is invalid. Check server environment variables.";
  }

  if (/Transcription failed|Response generation failed|Embedding failed|Speech generation failed|OpenAI|Anthropic/i.test(message)) {
    return "AI provider request failed. Check server logs.";
  }

  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 240);
}

function getRequestOrigin(req) {
  const host = req.headers.host || `localhost:${config.port}`;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${host}`;
}

class Trace {
  constructor() {
    this.items = [];
  }

  add(label, ms) {
    this.items.push({ label, ms: Math.max(0, Math.round(ms)) });
  }
}

module.exports = {
  Trace,
  cleanText,
  getRequestOrigin,
  parseHistory,
  publicErrorMessage,
  readJson,
  sendJson,
  setCorsHeaders,
};
