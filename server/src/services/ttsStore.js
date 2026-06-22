const crypto = require("node:crypto");

const clips = new Map();
const ttlMs = 30 * 60 * 1000;

function saveTtsClip({ buffer, contentType = "audio/mpeg" }) {
  const clipId = `tts_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  clips.set(clipId, {
    buffer,
    contentType,
    createdAt: Date.now(),
  });
  sweepExpiredClips();
  return clipId;
}

function getTtsClip(clipId) {
  const clip = clips.get(clipId);
  if (!clip) {
    return null;
  }

  if (Date.now() - clip.createdAt > ttlMs) {
    clips.delete(clipId);
    return null;
  }

  return clip;
}

function sweepExpiredClips() {
  const now = Date.now();
  for (const [clipId, clip] of clips.entries()) {
    if (now - clip.createdAt > ttlMs) {
      clips.delete(clipId);
    }
  }
}

module.exports = {
  getTtsClip,
  saveTtsClip,
};
