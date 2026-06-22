const { config } = require("../config");
const { createJsonResponse, createEmbedding } = require("../services/openai");
const { chunkSource } = require("../services/rag/chunkSource");
const { createSourceId, saveSource } = require("../services/rag/sourceStore");

async function createSource({ sourceType = "text", title, text }) {
  const cleanSourceType = normalizeSourceType(sourceType);
  const cleanTitle = cleanText(title).slice(0, 120) || "Untitled source";
  const cleanTextValue = cleanText(text).slice(0, config.maxSourceChars);

  if (cleanTextValue.length < 80) {
    throw new Error("Source text must be at least 80 characters.");
  }

  const sourceId = createSourceId();
  const brief = await createBrief({
    sourceType: cleanSourceType,
    title: cleanTitle,
    text: cleanTextValue,
  });
  const ragResult = await buildRagIndex({
    chunks: chunkSource(cleanTextValue),
  });

  const source = {
    sourceId,
    sourceType: cleanSourceType,
    ragBackend: ragResult.backend,
    ragWarning: ragResult.warning,
    title: brief.title || cleanTitle,
    text: cleanTextValue,
    summary: brief.summary,
    keyClaims: brief.keyClaims,
    debateMotions: brief.debateMotions,
    usefulVocabulary: brief.usefulVocabulary,
    chunks: ragResult.chunks,
    createdAt: new Date().toISOString(),
  };

  await saveSource(source);
  return publicSource(source);
}

async function createBrief({ sourceType, title, text }) {
  if (!config.openaiApiKey) {
    return createMockBrief({ title, text });
  }

  const instructions = [
    "You create concise source briefs for English debate practice.",
    "Return only valid JSON with keys: title, summary, keyClaims, debateMotions, usefulVocabulary.",
    "summary must be 2 short sentences.",
    "keyClaims must contain 3 to 5 strings.",
    "debateMotions must contain 3 clear debate motions.",
    "usefulVocabulary must contain 5 to 8 English phrases useful for debating the source.",
  ].join(" ");

  const input = [
    `Source type: ${sourceType}`,
    `Given title: ${title}`,
    "Source text:",
    text.slice(0, 12000),
  ].join("\n\n");

  const brief = await createJsonResponse({
    instructions,
    input,
    maxOutputTokens: 900,
  });

  return normalizeBrief(brief, title);
}

async function embedChunks(chunks) {
  const embedded = [];

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);
    embedded.push({ ...chunk, embedding });
  }

  return embedded;
}

async function buildRagIndex({ chunks }) {
  return {
    backend: "json",
    warning: null,
    chunks: await embedChunks(chunks),
  };
}

function normalizeBrief(brief, fallbackTitle) {
  const safeBrief = brief && typeof brief === "object" ? brief : {};
  const fallback = createMockBrief({ title: fallbackTitle, text: "" });
  return {
    title: cleanText(safeBrief.title || fallbackTitle).slice(0, 120),
    summary: cleanText(safeBrief.summary || "This source introduces a debate topic with competing claims. Use it to practice evidence-based English debate."),
    keyClaims: normalizeStringList(safeBrief.keyClaims, 5, fallback.keyClaims),
    debateMotions: normalizeStringList(safeBrief.debateMotions, 3, fallback.debateMotions),
    usefulVocabulary: normalizeStringList(safeBrief.usefulVocabulary, 8, fallback.usefulVocabulary),
  };
}

function createMockBrief({ title, text }) {
  const firstSentence = cleanText(text).split(/(?<=[.!?])\s+/)[0] || "This source presents a debatable issue.";
  return {
    title,
    summary: `${firstSentence.slice(0, 180)} Use this source to practice making claims, giving reasons, and challenging assumptions.`,
    keyClaims: [
      "The source presents a central claim that can be challenged.",
      "The strongest arguments need specific evidence from the source.",
      "Readers can disagree about the tradeoffs and implications.",
    ],
    debateMotions: [
      `${title} presents a convincing argument.`,
      `The benefits in this source are stronger than the risks.`,
      `The source's main recommendation should be adopted.`,
    ],
    usefulVocabulary: ["central claim", "supporting evidence", "tradeoff", "counterargument", "implication"],
  };
}

function publicSource(source) {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    title: source.title,
    summary: source.summary,
    keyClaims: source.keyClaims,
    debateMotions: source.debateMotions,
    usefulVocabulary: source.usefulVocabulary,
    chunkCount: source.chunks.length,
    ragBackend: source.ragBackend || "json",
    ragWarning: source.ragWarning || null,
  };
}

function normalizeStringList(value, limit, fallback) {
  const list = Array.isArray(value) ? value : [];
  const normalized = list.map(cleanText).filter(Boolean).slice(0, limit);
  return normalized.length ? normalized : fallback;
}

function normalizeSourceType(sourceType) {
  const clean = cleanText(sourceType).toLowerCase();
  return ["prompt", "text", "article", "pdf", "youtube"].includes(clean) ? clean : "text";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { createSource };
