const { config } = require("../config");

async function transcribeAudio(file) {
  if (!config.openaiApiKey) {
    return {
      text: "I think AI can help students learn faster because it gives personalized feedback.",
      mode: "mock",
      warning: "OPENAI_API_KEY is not set, so mock transcription was used.",
    };
  }

  const form = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.contentType || "audio/m4a",
  });

  form.append("file", blob, file.filename || "argument.m4a");
  form.append("model", config.transcriptionModel);
  form.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json();

  return {
    text: String(payload.text || "").trim(),
    mode: "openai",
    warning: null,
  };
}

async function createResponse({ instructions, input, maxOutputTokens = 220 }) {
  if (!config.openaiApiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.responseModel,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Response generation failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json();
  return extractOutputText(payload);
}

async function createJsonResponse({ instructions, input, maxOutputTokens = 800 }) {
  const text = await createResponse({ instructions, input, maxOutputTokens });
  return parseJsonObject(text);
}

async function createEmbedding(text) {
  if (!config.openaiApiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: String(text || "").slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json();
  return payload.data?.[0]?.embedding || null;
}

async function createSpeech({ text, voice, instructions, speed = 1 }) {
  if (!config.openaiApiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ttsModel,
      input: String(text || "").slice(0, 4096),
      voice,
      instructions,
      response_format: "mp3",
      speed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Speech generation failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }

    throw new Error("Model did not return valid JSON");
  }
}

module.exports = {
  createEmbedding,
  createJsonResponse,
  createResponse,
  createSpeech,
  transcribeAudio,
};
