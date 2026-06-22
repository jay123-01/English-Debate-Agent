export const defaultPersonaId = "maya";

export const debatePersonas = [
  {
    id: "maya",
    name: "Maya Ortiz",
    gender: "Female",
    label: "Precise challenger",
    description: "Warm but surgical. She presses for evidence and exposes weak assumptions.",
    speech: {
      rate: 0.91,
      pitch: 1.08,
    },
    voiceHints: ["samantha", "karen", "moira", "tessa", "zira", "jenny", "aria", "susan"],
  },
  {
    id: "theo",
    name: "Theo Bennett",
    gender: "Male",
    label: "Strategic opponent",
    description: "Calm and direct. He reframes your claim and attacks the tradeoff.",
    speech: {
      rate: 0.88,
      pitch: 0.86,
    },
    voiceHints: ["daniel", "alex", "fred", "tom", "guy", "david", "mark", "ryan"],
  },
];

export function getDebatePersona(personaId) {
  return debatePersonas.find((persona) => persona.id === personaId) || debatePersonas[0];
}

export function pickPersonaVoice(voices, persona) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return null;
  }

  const englishVoices = voices.filter((voice) => {
    const language = String(voice.language || "").toLowerCase();
    return language.startsWith("en");
  });
  const candidates = englishVoices.length ? englishVoices : voices;

  return (
    candidates.find((voice) => matchesHint(voice, persona.voiceHints)) ||
    candidates.find((voice) => voice.quality === "Enhanced") ||
    candidates[0] ||
    null
  );
}

function matchesHint(voice, hints) {
  const name = String(voice.name || "").toLowerCase();
  const identifier = String(voice.identifier || voice.voiceURI || "").toLowerCase();
  return hints.some((hint) => name.includes(hint) || identifier.includes(hint));
}
