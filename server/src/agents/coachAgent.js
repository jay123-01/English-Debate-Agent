const { createJsonResponse } = require("../services/openai");

async function analyzeArgument(argument, options = {}) {
  const fallback = analyzeArgumentWithHeuristics(argument, options);
  if (options.fast) {
    return fallback;
  }

  try {
    const result = await analyzeArgumentWithModel(argument, options);
    return result || fallback;
  } catch {
    return fallback;
  }
}

async function analyzeArgumentWithModel(argument, options) {
  const instructions = [
    "You are an English debate coach for a source-grounded debate practice app.",
    "Evaluate the user's latest spoken or typed argument.",
    "Return only valid JSON with keys: clarity, structure, evidence, sourceUse, tip, argumentTip, revisedSentence, sourceMove.",
    "Scores must be integers from 0 to 100.",
    "tip must focus on natural English fluency.",
    "argumentTip must focus on debate logic.",
    "revisedSentence must rewrite one sentence in more natural spoken English.",
    "sourceMove must explain how the user should use the provided source next.",
  ].join(" ");

  const input = [
    `User argument: ${cleanText(argument).slice(0, 3000)}`,
    options.sourceContext ? `Relevant source context:\n${cleanText(options.sourceContext).slice(0, 5000)}` : "",
    options.phase ? `Debate phase: ${cleanText(options.phase)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const feedback = await createJsonResponse({
    instructions,
    input,
    maxOutputTokens: 650,
  });

  return normalizeFeedback(feedback);
}

function analyzeArgumentWithHeuristics(argument, options = {}) {
  const text = cleanText(argument);
  const words = text.split(/\s+/).filter(Boolean);
  const sentenceCount = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const averageSentenceLength = words.length / sentenceCount;
  const hasReason = /\b(because|since|therefore|as a result|for example)\b/i.test(text);
  const hasContrast = /\b(however|although|but|on the other hand)\b/i.test(text);
  const hasEvidence = /\b(data|research|study|example|evidence|case)\b/i.test(text);

  const clarity = clampScore(45 + Math.min(35, words.length * 1.5) - Math.max(0, averageSentenceLength - 24));
  const structure = clampScore(42 + (hasReason ? 24 : 0) + (hasContrast ? 16 : 0));
  const evidence = clampScore(34 + (hasEvidence ? 34 : 0));
  const sourceUse = clampScore(38 + (options.sourceContext ? 18 : 0) + (hasEvidence ? 22 : 0));

  let tip = "Add a concrete example to make your argument easier to defend.";
  if (!hasReason) {
    tip = 'Try using "because" or "for example" to connect your claim to evidence.';
  } else if (!hasContrast) {
    tip = 'Add one contrast phrase like "however" to prepare for counterarguments.';
  } else if (averageSentenceLength > 26) {
    tip = "Split long sentences so your spoken argument lands more clearly.";
  }

  return {
    clarity,
    structure,
    evidence,
    sourceUse,
    tip,
    argumentTip: options.sourceContext
      ? "Try tying your next point to one concrete detail from the source."
      : "Add a concrete example or source detail to make your point easier to defend.",
    revisedSentence: createRevisedSentence(text),
    sourceMove: options.sourceContext
      ? "Name one specific source detail, then explain why it changes the debate."
      : "Add one example before you make the next claim.",
  };
}

function normalizeFeedback(feedback) {
  if (!feedback || typeof feedback !== "object") {
    return null;
  }

  return {
    clarity: clampScore(Number(feedback.clarity)),
    structure: clampScore(Number(feedback.structure)),
    evidence: clampScore(Number(feedback.evidence)),
    sourceUse: clampScore(Number(feedback.sourceUse)),
    tip: cleanText(feedback.tip).slice(0, 240) || "Make your claim shorter and easier to say aloud.",
    argumentTip: cleanText(feedback.argumentTip).slice(0, 260) || "Add a clearer reason and one piece of evidence.",
    revisedSentence: cleanText(feedback.revisedSentence).slice(0, 260) || "I would argue that this matters because it affects real people.",
    sourceMove: cleanText(feedback.sourceMove).slice(0, 260) || "Use one concrete detail from the source in your next answer.",
  };
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function createRevisedSentence(text) {
  if (!text) {
    return "I would argue that this matters because it creates a real tradeoff.";
  }

  return `A more natural version: ${text.split(/[.!?]/)[0].slice(0, 160)}.`;
}

module.exports = {
  analyzeArgument,
};
