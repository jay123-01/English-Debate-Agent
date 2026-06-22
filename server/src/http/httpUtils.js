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
  readJson,
  sendJson,
  setCorsHeaders,
};
