function getDebatePhase(history) {
  const userTurns = Array.isArray(history)
    ? history.filter((turn) => turn.role === "user").length
    : 0;

  if (userTurns === 0) {
    return "opening";
  }
  if (userTurns === 1) {
    return "rebuttal";
  }
  if (userTurns === 2) {
    return "cross-examination";
  }
  return "closing";
}

module.exports = {
  getDebatePhase,
};
