function chunkSource(text) {
  const clean = cleanText(text);
  if (!clean) {
    return [];
  }

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const units = paragraphs.length > 1 ? paragraphs : splitIntoSentences(clean);
  const chunks = [];
  let current = "";

  for (const unit of units) {
    if (!current) {
      current = unit;
      continue;
    }

    if ((current + " " + unit).length <= 900) {
      current = `${current} ${unit}`;
      continue;
    }

    chunks.push(current);
    current = unit;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((content, index) => ({
    id: `chunk_${String(index + 1).padStart(3, "0")}`,
    content: content.slice(0, 1200),
  }));
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function cleanText(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

module.exports = { chunkSource };
