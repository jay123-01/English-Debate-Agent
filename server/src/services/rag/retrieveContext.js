const { createEmbedding } = require("../openai");
const { getSource } = require("./sourceStore");

async function retrieveContext({ sourceId, query, limit = 4 }) {
  const source = await getSource(sourceId);
  if (!source || !Array.isArray(source.chunks) || source.chunks.length === 0) {
    return { source: null, chunks: [], contextText: "" };
  }

  const queryEmbedding = await createEmbedding(query);
  if (!queryEmbedding) {
    const chunks = source.chunks.slice(0, limit);
    return { source, chunks, contextText: formatContext(chunks) };
  }

  const chunks = source.chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding || []),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return { source, chunks, contextText: formatContext(chunks) };
}

function formatContext(chunks) {
  return chunks
    .map((chunk, index) => `[Source ${index + 1}] ${chunk.content}`)
    .join("\n\n");
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

module.exports = { retrieveContext };
