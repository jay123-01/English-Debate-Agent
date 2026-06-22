const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

export async function submitVoiceTurn({
  audioUri,
  topic,
  stance,
  history,
  sourceId,
  motion,
  userStance,
  aiStance,
  level,
  personaId,
  responseMode,
}) {
  const formData = new FormData();

  formData.append("topic", topic);
  formData.append("stance", stance);
  if (sourceId) {
    formData.append("sourceId", sourceId);
  }
  if (motion) {
    formData.append("motion", motion);
  }
  if (userStance) {
    formData.append("userStance", userStance);
  }
  if (aiStance) {
    formData.append("aiStance", aiStance);
  }
  if (level) {
    formData.append("level", level);
  }
  if (personaId) {
    formData.append("personaId", personaId);
  }
  if (responseMode) {
    formData.append("responseMode", responseMode);
  }
  formData.append("history", JSON.stringify(history || []));
  formData.append("audio", {
    uri: audioUri,
    name: "argument.m4a",
    type: "audio/m4a",
  });

  return request("/api/voice-turn", {
    method: "POST",
    body: formData,
  });
}

export async function createSource({ sourceType = "text", title, text }) {
  return request("/api/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceType,
      title,
      text,
    }),
  });
}

export async function submitTextTurn({
  argument,
  topic,
  stance,
  history,
  sourceId,
  motion,
  userStance,
  aiStance,
  level,
  personaId,
  responseMode,
}) {
  return request("/api/text-turn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      argument,
      topic,
      stance,
      sourceId,
      motion,
      userStance,
      aiStance,
      level,
      personaId,
      responseMode,
      history: history || [],
    }),
  });
}

export async function createSessionSummary({
  topic,
  motion,
  stance,
  userStance,
  aiStance,
  sourceTitle,
  history,
}) {
  return request("/api/session-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      motion,
      stance,
      userStance,
      aiStance,
      sourceTitle,
      history: history || [],
    }),
  });
}

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}
