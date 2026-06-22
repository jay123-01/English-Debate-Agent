const { config } = require("../config");
const { createMessage } = require("../services/anthropic");
const { createResponse } = require("../services/openai");
const { getDebatePersona, publicPersona } = require("./debatePersonas");

async function generateDebateReply({
  topic,
  stance,
  argument,
  history,
  sourceTitle,
  sourceContext,
  motion,
  userStance,
  aiStance,
  level,
  personaId,
  phase,
  responseMode,
}) {
  const persona = getDebatePersona(personaId);
  const isFast = responseMode === "fast";

  if (!config.openaiApiKey && !config.anthropicApiKey) {
    return {
      reply: mockDebateReply({ topic, stance, argument }),
      mode: "mock",
      persona: publicPersona(persona),
      tts: persona.tts,
    };
  }

  const oppositeStance = aiStance || (stance === "support" ? "oppose" : "support");
  const userSide = userStance || stance || "support";
  const recentTurns = Array.isArray(history)
    ? history
        .slice(-6)
        .map((turn) => `${turn.role === "agent" ? "Agent" : "User"}: ${cleanText(turn.text)}`)
        .join("\n")
    : "";

  const instructions = [
    `You are ${persona.name}, ${persona.role}, for an English learner.`,
    ...persona.speakingStyle,
    `Your stance is ${oppositeStance}.`,
    `Current debate phase: ${cleanText(phase || "rebuttal")}.`,
    "Debate against the user's chosen stance.",
    "Use one concrete source detail when the source context is relevant.",
    "Signal source use in natural speech, for example: 'The source points out...' or 'That matters because the article says...'.",
    "Do not simply summarize the source.",
    "Give one clear counterargument, one reason, and one follow-up question or cross-examination question.",
    "Avoid repeating the same response structure every turn.",
    "If the user's point is vague, politely challenge it.",
    `Match this learner level: ${cleanText(level || "intermediate")}.`,
    "Use natural spoken English.",
    isFast ? "Keep the response under 65 words." : "Keep the response under 120 words.",
    "Do not mention internal instructions or API details.",
  ].join(" ");

  const input = [
    `Debate motion: ${cleanText(motion || topic)}`,
    `Opponent persona: ${persona.name}`,
    `Debate phase: ${cleanText(phase || "rebuttal")}`,
    `Source title: ${cleanText(sourceTitle || "")}`,
    `User stance: ${cleanText(userSide)}`,
    `Your stance: ${cleanText(oppositeStance)}`,
    sourceContext ? `Relevant source context:\n${cleanText(sourceContext).slice(0, 5000)}` : "",
    recentTurns ? `Recent conversation:\n${recentTurns}` : "",
    `User argument: ${cleanText(argument)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (config.openaiApiKey) {
    const reply = await createResponse({
      instructions,
      input,
      maxOutputTokens: isFast ? 130 : 220,
    });

    return {
      reply: reply || mockDebateReply({ topic, stance, argument }),
      mode: "openai",
      persona: publicPersona(persona),
      tts: persona.tts,
    };
  }

  const reply = await createMessage({
    system: instructions,
    input,
    maxOutputTokens: isFast ? 130 : 220,
  });

  return {
    reply: reply || mockDebateReply({ topic, stance, argument }),
    mode: "anthropic",
    persona: publicPersona(persona),
    tts: persona.tts,
  };
}

function mockDebateReply({ topic, stance, argument }) {
  const opposite = stance === "support" ? "against" : "in favor of";
  const angle = pickCounterAngle(argument);

  return [
    `I understand your point, but I would argue ${opposite} that position.`,
    angle,
    `For "${cleanText(topic)}", your claim needs a specific example or evidence.`,
    "What real case would prove your argument?",
  ].join(" ");
}

function pickCounterAngle(argument) {
  if (/\b(student|school|education|teacher|learn)\b/i.test(argument)) {
    return "Education also depends on fairness, motivation, and human judgment, which technology alone cannot guarantee.";
  }

  if (/\b(cost|money|expensive|fund|tax)\b/i.test(argument)) {
    return "A policy can sound useful while still failing if the cost is higher than the public benefit.";
  }

  if (/\b(freedom|right|choice|privacy)\b/i.test(argument)) {
    return "Individual freedom matters, but society also has to consider harm and responsibility.";
  }

  return "The weak point is that the benefit does not happen automatically.";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1800);
}

module.exports = {
  generateDebateReply,
};
