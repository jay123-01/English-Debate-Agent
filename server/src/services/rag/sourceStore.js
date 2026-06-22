const fs = require("node:fs/promises");
const path = require("node:path");

const storageDir = path.join(__dirname, "..", "..", "..", "storage", "sources");

async function saveSource(source) {
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(sourcePath(source.sourceId), JSON.stringify(source, null, 2), "utf8");
  return source;
}

async function getSource(sourceId) {
  const cleanId = normalizeSourceId(sourceId);
  if (!cleanId) {
    return null;
  }

  try {
    const raw = await fs.readFile(sourcePath(cleanId), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function createSourceId() {
  return `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sourcePath(sourceId) {
  return path.join(storageDir, `${normalizeSourceId(sourceId)}.json`);
}

function normalizeSourceId(sourceId) {
  return String(sourceId || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

module.exports = {
  createSourceId,
  getSource,
  saveSource,
};
