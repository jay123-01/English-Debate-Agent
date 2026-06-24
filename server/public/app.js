const fallbackMotions = [
  "Should AI be used in education?",
  "Should social media be regulated?",
  "Should schools replace exams with projects?",
  "Should remote work become the default?",
];

const personas = [
  {
    id: "maya",
    name: "Maya Ortiz",
    label: "Precise challenger",
    speech: { rate: 0.91, pitch: 1.08 },
  },
  {
    id: "theo",
    name: "Theo Bennett",
    label: "Strategic opponent",
    speech: { rate: 0.88, pitch: 0.86 },
  },
];

const initialFeedback = {
  clarity: 0,
  structure: 0,
  evidence: 0,
  sourceUse: 0,
  tip: "Send your first argument to get feedback.",
};

const state = {
  sourceBrief: null,
  selectedMotion: "",
  stance: "support",
  level: "intermediate",
  personaId: "maya",
  turns: [],
  feedback: initialFeedback,
  latency: [],
  summary: null,
  isBusy: false,
  speakReplies: true,
  deferredInstallPrompt: null,
};

const els = {
  serverStatus: document.querySelector("#serverStatus"),
  installAppBtn: document.querySelector("#installAppBtn"),
  clearSessionBtn: document.querySelector("#clearSessionBtn"),
  sourceState: document.querySelector("#sourceState"),
  sourceTitle: document.querySelector("#sourceTitle"),
  sourceText: document.querySelector("#sourceText"),
  sourceError: document.querySelector("#sourceError"),
  createSourceBtn: document.querySelector("#createSourceBtn"),
  briefPanel: document.querySelector("#briefPanel"),
  briefTitle: document.querySelector("#briefTitle"),
  chunkCount: document.querySelector("#chunkCount"),
  briefSummary: document.querySelector("#briefSummary"),
  keyClaims: document.querySelector("#keyClaims"),
  vocabularyList: document.querySelector("#vocabularyList"),
  motionList: document.querySelector("#motionList"),
  stanceSelect: document.querySelector("#stanceSelect"),
  levelSelect: document.querySelector("#levelSelect"),
  personaList: document.querySelector("#personaList"),
  activeMotion: document.querySelector("#activeMotion"),
  stanceLine: document.querySelector("#stanceLine"),
  speakToggle: document.querySelector("#speakToggle"),
  turnStatus: document.querySelector("#turnStatus"),
  argumentInput: document.querySelector("#argumentInput"),
  sendArgumentBtn: document.querySelector("#sendArgumentBtn"),
  summarizeBtn: document.querySelector("#summarizeBtn"),
  conversationList: document.querySelector("#conversationList"),
  turnCount: document.querySelector("#turnCount"),
  feedbackView: document.querySelector("#feedbackView"),
  summaryPanel: document.querySelector("#summaryPanel"),
  summaryView: document.querySelector("#summaryView"),
  latencyView: document.querySelector("#latencyView"),
};

init();

function init() {
  loadState();
  bindEvents();
  registerServiceWorker();
  checkHealth();
  renderAll();
}

function bindEvents() {
  els.createSourceBtn.addEventListener("click", createSourceBrief);
  els.sendArgumentBtn.addEventListener("click", submitArgument);
  els.summarizeBtn.addEventListener("click", summarizeSession);
  els.clearSessionBtn.addEventListener("click", clearSession);

  els.argumentInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      submitArgument();
    }
  });

  els.stanceSelect.addEventListener("change", () => {
    state.stance = els.stanceSelect.value === "oppose" ? "oppose" : "support";
    persistState();
    renderSetup();
  });

  els.levelSelect.addEventListener("change", () => {
    state.level = els.levelSelect.value;
    persistState();
  });

  els.speakToggle.addEventListener("change", () => {
    state.speakReplies = els.speakToggle.checked;
    persistState();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installAppBtn.hidden = false;
  });

  els.installAppBtn.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      return;
    }
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installAppBtn.hidden = true;
  });
}

async function checkHealth() {
  try {
    const health = await request("/api/health");
    els.serverStatus.textContent = health.hasApiKey ? "OpenAI ready" : "Mock mode";
    els.serverStatus.className = health.hasApiKey ? "status-pill" : "status-pill warn";
  } catch {
    els.serverStatus.textContent = "Offline";
    els.serverStatus.className = "status-pill error";
  }
}

async function createSourceBrief() {
  const text = normalizeText(els.sourceText.value);
  if (text.length < 80) {
    showSourceError("Paste at least 80 characters.");
    return;
  }

  setBusy(true, "Creating brief");
  hideSourceError();

  try {
    const brief = await request("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "text",
        title: normalizeText(els.sourceTitle.value) || "Practice source",
        text,
      }),
    });

    state.sourceBrief = brief;
    state.selectedMotion = brief.debateMotions?.[0] || fallbackMotions[0];
    state.turns = [];
    state.feedback = initialFeedback;
    state.latency = [];
    state.summary = null;
    persistState();
    renderAll();
    setStatus("Source ready");
  } catch (error) {
    showSourceError(error.message);
    setStatus("Ready", "neutral");
  } finally {
    setBusy(false);
  }
}

async function submitArgument() {
  const argument = normalizeText(els.argumentInput.value);
  if (!argument || state.isBusy) {
    return;
  }

  els.argumentInput.value = "";
  setBusy(true, "Debating");

  try {
    const result = await request("/api/text-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        argument,
        topic: getActiveMotion(),
        motion: getActiveMotion(),
        stance: state.stance,
        userStance: state.stance,
        aiStance: getAiStance(),
        sourceId: state.sourceBrief?.sourceId,
        level: state.level,
        personaId: state.personaId,
        responseMode: "fast",
        history: state.turns.slice(-6),
      }),
    });

    const personaName = result.persona?.name || getPersona().name;
    state.turns = [
      ...state.turns,
      {
        id: `${Date.now()}-user`,
        role: "user",
        text: result.transcript || argument,
        source: "typed",
      },
      {
        id: `${Date.now()}-agent`,
        role: "agent",
        text: result.reply,
        phase: result.phase,
        personaName,
        sourceContext: result.sourceContext || [],
      },
    ].slice(-24);

    state.feedback = result.feedback || initialFeedback;
    state.latency = result.latency || [];
    state.summary = null;
    persistState();
    renderAll();
    speakReply(result.reply);
    setStatus("Ready", "neutral");
  } catch (error) {
    setStatus("Failed", "error");
    els.argumentInput.value = argument;
    alert(error.message);
  } finally {
    setBusy(false);
  }
}

async function summarizeSession() {
  if (state.turns.length < 2 || state.isBusy) {
    return;
  }

  setBusy(true, "Summarizing");

  try {
    state.summary = await request("/api/session-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: getActiveMotion(),
        motion: getActiveMotion(),
        stance: state.stance,
        userStance: state.stance,
        aiStance: getAiStance(),
        sourceTitle: state.sourceBrief?.title,
        history: state.turns,
      }),
    });
    persistState();
    renderSummary();
    setStatus("Ready", "neutral");
  } catch (error) {
    setStatus("Failed", "error");
    alert(error.message);
  } finally {
    setBusy(false);
  }
}

function clearSession() {
  window.speechSynthesis?.cancel();
  state.turns = [];
  state.feedback = initialFeedback;
  state.latency = [];
  state.summary = null;
  persistState();
  renderAll();
  setStatus("Ready", "neutral");
}

function renderAll() {
  els.stanceSelect.value = state.stance;
  els.levelSelect.value = state.level;
  els.speakToggle.checked = state.speakReplies;
  renderSourceBrief();
  renderSetup();
  renderConversation();
  renderFeedback();
  renderSummary();
  renderLatency();
}

function renderSourceBrief() {
  const brief = state.sourceBrief;
  els.briefPanel.hidden = !brief;
  els.sourceState.textContent = brief ? "Indexed" : "No source";
  els.sourceState.className = brief ? "status-pill" : "status-pill neutral";

  if (!brief) {
    return;
  }

  els.briefTitle.textContent = brief.title;
  els.chunkCount.textContent = `${brief.chunkCount || 0} chunks`;
  els.briefSummary.textContent = brief.summary || "";
  els.keyClaims.innerHTML = (brief.keyClaims || [])
    .map((claim) => `<li>${escapeHtml(claim)}</li>`)
    .join("");
  els.vocabularyList.innerHTML = (brief.usefulVocabulary || [])
    .map((word) => `<span class="chip">${escapeHtml(word)}</span>`)
    .join("");
}

function renderSetup() {
  const motions = state.sourceBrief?.debateMotions?.length
    ? state.sourceBrief.debateMotions
    : fallbackMotions;

  if (!state.selectedMotion || !motions.includes(state.selectedMotion)) {
    state.selectedMotion = motions[0];
  }

  els.motionList.innerHTML = motions
    .map(
      (motion) => `
        <button class="motion-chip ${motion === state.selectedMotion ? "active" : ""}" type="button" data-motion="${escapeHtml(motion)}">
          ${escapeHtml(motion)}
        </button>
      `,
    )
    .join("");

  els.motionList.querySelectorAll("[data-motion]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMotion = button.dataset.motion;
      persistState();
      renderSetup();
    });
  });

  els.personaList.innerHTML = personas
    .map(
      (persona) => `
        <button class="persona-button ${persona.id === state.personaId ? "active" : ""}" type="button" data-persona="${persona.id}">
          <span class="persona-name">${persona.name}</span>
          <span class="persona-label">${persona.label}</span>
        </button>
      `,
    )
    .join("");

  els.personaList.querySelectorAll("[data-persona]").forEach((button) => {
    button.addEventListener("click", () => {
      state.personaId = button.dataset.persona;
      persistState();
      renderSetup();
    });
  });

  els.activeMotion.textContent = getActiveMotion();
  els.stanceLine.textContent = `You ${state.stance}. AI ${getAiStance()}.`;
}

function renderConversation() {
  const turnPairs = Math.floor(state.turns.length / 2);
  els.turnCount.textContent = `${turnPairs} ${turnPairs === 1 ? "turn" : "turns"}`;
  els.summarizeBtn.disabled = state.turns.length < 2 || state.isBusy;

  if (!state.turns.length) {
    els.conversationList.innerHTML = '<p class="empty-text">Your debate turns will appear here.</p>';
    return;
  }

  els.conversationList.innerHTML = state.turns
    .map((turn) => {
      const title = turn.role === "agent" ? turn.personaName || "Debate Agent" : "You";
      const phase = turn.role === "agent" && turn.phase ? ` <span>${escapeHtml(turn.phase)}</span>` : "";
      const context = turn.role === "agent" ? renderSourceContext(turn.sourceContext || []) : "";
      return `
        <article class="turn-card ${turn.role}">
          <div class="turn-meta"><span>${escapeHtml(title)}</span>${phase}</div>
          <p class="turn-text">${escapeHtml(turn.text)}</p>
          ${context}
        </article>
      `;
    })
    .join("");
}

function renderSourceContext(items) {
  if (!items.length) {
    return "";
  }

  return `
    <div class="source-box">
      <h4>Source Used</h4>
      ${items
        .slice(0, 2)
        .map((item) => `<p>${escapeHtml(item.preview || "")}</p>`)
        .join("")}
    </div>
  `;
}

function renderFeedback() {
  const feedback = state.feedback || initialFeedback;
  const metrics = [
    ["Clarity", feedback.clarity || 0],
    ["Structure", feedback.structure || 0],
    ["Evidence", feedback.evidence || 0],
    ["Source use", feedback.sourceUse || 0],
  ];

  els.feedbackView.innerHTML = `
    ${metrics.map(([label, value]) => renderMetric(label, value)).join("")}
    <div class="feedback-note">
      <h4>Fluency Tip</h4>
      <p>${escapeHtml(feedback.tip || initialFeedback.tip)}</p>
    </div>
    ${
      feedback.argumentTip
        ? `<div class="feedback-note"><h4>Argument</h4><p>${escapeHtml(feedback.argumentTip)}</p></div>`
        : ""
    }
    ${
      feedback.revisedSentence
        ? `<div class="feedback-note"><h4>Natural English</h4><p>${escapeHtml(feedback.revisedSentence)}</p></div>`
        : ""
    }
    ${
      feedback.sourceMove
        ? `<div class="feedback-note"><h4>Source Move</h4><p>${escapeHtml(feedback.sourceMove)}</p></div>`
        : ""
    }
  `;
}

function renderMetric(label, value) {
  const score = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return `
    <div class="metric">
      <div class="metric-top"><span>${label}</span><span>${score}/100</span></div>
      <div class="meter"><span class="meter-fill" style="width: ${score}%"></span></div>
    </div>
  `;
}

function renderSummary() {
  els.summaryPanel.hidden = !state.summary;
  if (!state.summary) {
    els.summaryView.innerHTML = "";
    return;
  }

  const summary = state.summary;
  els.summaryView.innerHTML = `
    <p class="body-copy">${escapeHtml(summary.summary || "")}</p>
    ${renderSummaryItem("Strongest Point", summary.strongestUserPoint)}
    ${renderSummaryItem("Weakest Point", summary.weakestUserPoint)}
    ${renderSummaryItem("Language Focus", summary.languageFocus)}
    ${renderSummaryItem("Next Drill", summary.nextDrill)}
  `;
}

function renderSummaryItem(label, value) {
  return `<div class="summary-item"><h4>${label}</h4><p>${escapeHtml(value || "")}</p></div>`;
}

function renderLatency() {
  if (!state.latency.length) {
    els.latencyView.innerHTML = '<p class="empty-text">No trace yet.</p>';
    return;
  }

  els.latencyView.innerHTML = state.latency
    .map(
      (item) => `
        <div class="latency-row">
          <span>${escapeHtml(item.label)}</span>
          <span>${Number(item.ms) || 0} ms</span>
        </div>
      `,
    )
    .join("");
}

async function request(path, options) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

function speakReply(text) {
  if (!state.speakReplies || !("speechSynthesis" in window) || !text) {
    return;
  }

  const persona = getPersona();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = persona.speech.rate;
  utterance.pitch = persona.speech.pitch;
  window.speechSynthesis.speak(utterance);
}

function setBusy(isBusy, label = "Ready") {
  state.isBusy = isBusy;
  els.createSourceBtn.disabled = isBusy;
  els.sendArgumentBtn.disabled = isBusy;
  els.summarizeBtn.disabled = isBusy || state.turns.length < 2;
  setStatus(isBusy ? label : "Ready", isBusy ? "warn" : "neutral");
}

function setStatus(label, tone = "neutral") {
  els.turnStatus.textContent = label;
  els.turnStatus.className = `status-pill ${tone}`;
}

function showSourceError(message) {
  els.sourceError.textContent = message;
  els.sourceError.hidden = false;
}

function hideSourceError() {
  els.sourceError.textContent = "";
  els.sourceError.hidden = true;
}

function getActiveMotion() {
  return state.selectedMotion || state.sourceBrief?.debateMotions?.[0] || fallbackMotions[0];
}

function getAiStance() {
  return state.stance === "support" ? "oppose" : "support";
}

function getPersona() {
  return personas.find((persona) => persona.id === state.personaId) || personas[0];
}

function persistState() {
  const payload = {
    sourceBrief: state.sourceBrief,
    selectedMotion: state.selectedMotion,
    stance: state.stance,
    level: state.level,
    personaId: state.personaId,
    turns: state.turns,
    feedback: state.feedback,
    latency: state.latency,
    summary: state.summary,
    speakReplies: state.speakReplies,
  };
  localStorage.setItem("voice-debate-pwa-v1", JSON.stringify(payload));
}

function loadState() {
  try {
    const raw = localStorage.getItem("voice-debate-pwa-v1");
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);
    state.sourceBrief = saved.sourceBrief || null;
    state.selectedMotion = saved.selectedMotion || "";
    state.stance = saved.stance === "oppose" ? "oppose" : "support";
    state.level = saved.level || "intermediate";
    state.personaId = saved.personaId || "maya";
    state.turns = Array.isArray(saved.turns) ? saved.turns.slice(-24) : [];
    state.feedback = saved.feedback || initialFeedback;
    state.latency = Array.isArray(saved.latency) ? saved.latency : [];
    state.summary = saved.summary || null;
    state.speakReplies = saved.speakReplies !== false;
  } catch {
    localStorage.removeItem("voice-debate-pwa-v1");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.location.protocol.startsWith("http")) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
