const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(path.join(__dirname, "..", ".env"));

const config = {
  port: Number(process.env.PORT || 8787),
  openaiApiKey: cleanSingleLineSecret(process.env.OPENAI_API_KEY),
  anthropicApiKey: cleanSingleLineSecret(process.env.ANTHROPIC_API_KEY),
  responseModel: process.env.OPENAI_RESPONSE_MODEL || "gpt-5.5",
  transcriptionModel: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  ttsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
  telegramBotToken: cleanSingleLineSecret(process.env.TELEGRAM_BOT_TOKEN),
  telegramAllowedUserIds: parseCsv(process.env.TELEGRAM_ALLOWED_USER_IDS),
  telegramPollTimeoutSeconds: Number(process.env.TELEGRAM_POLL_TIMEOUT_SECONDS || 30),
  maxAudioBytes: Number(process.env.MAX_AUDIO_BYTES || 15 * 1024 * 1024),
  maxSourceChars: Number(process.env.MAX_SOURCE_CHARS || 120000),
};

module.exports = { config };

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanSingleLineSecret(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0] || "";
}
