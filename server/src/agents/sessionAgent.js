const { createJsonResponse } = require("../services/openai");

async function createSessionSummary({ motion, userStance, aiStance, turns, sourceTitle }) {
  const safeTurns = Array.isArray(turns) ? turns.slice(-12) : [];
  if (safeTurns.length === 0) {
    return createFallbackSummary();
  }

  try {
    const summary = await createJsonResponse({
      instructions: [
        "You summarize an English debate practice session for a learner.",
        "Return only valid JSON with keys: summary, strongestUserPoint, weakestUserPoint, languageFocus, nextDrill.",
        "Be concrete, brief, and useful for the next practice round.",
      ].join(" "),
      input: [
        `Motion: ${cleanText(motion)}`,
        `Source title: ${cleanText(sourceTitle || "")}`,
        `User stance: ${cleanText(userStance)}`,
        `AI stance: ${cleanText(aiStance)}`,
        `Turns:\n${safeTurns.map(formatTurn).join("\n")}`,
      ].join("\n\n"),
      maxOutputTokens: 650,
    });

    return normalizeSummary(summary);
  } catch {
    return createFallbackSummary();
  }
}

function normalizeSummary(summary) {
  const safeSummary = summary && typeof summary === "object" ? summary : {};
  return {
    summary: cleanText(safeSummary.summary) || "You completed a short source-grounded debate exchange.",
    strongestUserPoint: cleanText(safeSummary.strongestUserPoint) || "Your clearest point was the one with a reason attached.",
    weakestUserPoint: cleanText(safeSummary.weakestUserPoint) || "Your weakest point needs more evidence or a clearer impact.",
    languageFocus: cleanText(safeSummary.languageFocus) || "Practice shorter spoken sentences with clear linking words.",
    nextDrill: cleanText(safeSummary.nextDrill) || "Give one claim, one source detail, and one impact in under 30 seconds.",
  };
}

function createFallbackSummary() {
  return {
    summary: "You completed a short debate practice session.",
    strongestUserPoint: "Your strongest point was the claim with the clearest reason.",
    weakestUserPoint: "Your weakest point needs a more specific example or source detail.",
    languageFocus: "Use shorter sentences and clearer linkers such as because, however, and for example.",
    nextDrill: "Answer the same motion again using claim, reason, evidence, and impact.",
  };
}

function formatTurn(turn) {
  const role = turn.role === "agent" ? "Opponent" : "User";
  return `${role}: ${cleanText(turn.text).slice(0, 900)}`;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = {
  createSessionSummary,
};
