const layerDefinitions = [
  {
    id: "mic",
    title: "Mic Input",
    detail: "Browser microphone",
    path: "fast",
  },
  {
    id: "stt",
    title: "Speech to Text",
    detail: "Browser recognition",
    path: "fast",
  },
  {
    id: "debate",
    title: "Debate Agent",
    detail: "Counterargument",
    path: "fast",
  },
  {
    id: "tts",
    title: "Text to Speech",
    detail: "Browser voice",
    path: "fast",
  },
  {
    id: "coach",
    title: "English Coach",
    detail: "Background feedback",
    path: "background",
  },
  {
    id: "memory",
    title: "Session Memory",
    detail: "Local session notes",
    path: "background",
  },
];

const initialFeedback = {
  clarity: 0,
  structure: 0,
  evidence: 0,
  tip: "Feedback appears after your first argument.",
};

const state = {
  topic: "Should AI be used in education?",
  stance: "support",
  tempo: 92,
  listening: false,
  submitting: false,
  history: [],
  feedback: initialFeedback,
  latency: [],
  layerStatus: Object.fromEntries(
    layerDefinitions.map((layer) => [layer.id, { status: "idle", detail: layer.detail }]),
  ),
  server: {
    ready: false,
    model: null,
    hasApiKey: false,
  },
  deferredInstallPrompt: null,
};

const els = {
  serverStatus: document.querySelector("#serverStatus"),
  installAppBtn: document.querySelector("#installAppBtn"),
  clearSessionBtn: document.querySelector("#clearSessionBtn"),
  topicSelect: document.querySelector("#topicSelect"),
  tempoRange: document.querySelector("#tempoRange"),
  activeTopic: document.querySelector("#activeTopic"),
  activeMode: document.querySelector("#activeMode"),
  pipelineView: document.querySelector("#pipelineView"),
  latencyView: document.querySelector("#latencyView"),
  layerList: document.querySelector("#layerList"),
  feedbackView: document.querySelector("#feedbackView"),
  memoryView: document.querySelector("#memoryView"),
  micButton: document.querySelector("#micButton"),
  micButtonText: document.querySelector("#micButtonText"),
  voiceMeter: document.querySelector("#voiceMeter"),
  transcriptStatus: document.querySelector("#transcriptStatus"),
  liveTranscript: document.querySelector("#liveTranscript"),
  typedArgument: document.querySelector("#typedArgument"),
  sendTextBtn: document.querySelector("#sendTextBtn"),
  conversationList: document.querySelector("#conversationList"),
  turnCount: document.querySelector("#turnCount"),
};

const storage = {
  key: "voice-debate-lab-session-v1",
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save() {
    const payload = {
      history: state.history.slice(-20),
      topic: state.topic,
      stance: state.stance,
      feedback: state.feedback,
      latency: state.latency.slice(-6),
    };
    localStorage.setItem(this.key, JSON.stringify(payload));
  },
  clear() {
    localStorage.removeItem(this.key);
  },
};

class SpeechInputService {
  constructor({ onInterim, onFinal, onStatus, onError }) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.SpeechRecognition = SpeechRecognition;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onStatus = onStatus;
    this.onError = onError;
    this.recognition = null;
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.submitted = false;
  }

  get supported() {
    return Boolean(this.SpeechRecognition);
  }

  start() {
    if (!this.supported) {
      this.onError("Speech recognition is unavailable in this browser.");
      return;
    }

    this.finalTranscript = "";
    this.interimTranscript = "";
    this.submitted = false;

    const recognition = new this.SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => this.onStatus("Listening");
    recognition.onerror = (event) => {
      this.onError(event.error || "Speech recognition error");
    };
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (final) {
        this.finalTranscript = `${this.finalTranscript} ${final}`.trim();
      }

      this.interimTranscript = interim.trim();
      this.onInterim([this.finalTranscript, this.interimTranscript].filter(Boolean).join(" "));
    };
    recognition.onend = () => {
      this.onStatus("Stopped");
      const transcript = (this.finalTranscript || this.interimTranscript).trim();
      if (transcript && !this.submitted) {
        this.submitted = true;
        this.onFinal(transcript);
      }
    };

    this.recognition = recognition;
    recognition.start();
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

class VoiceOutputService {
  constructor() {
    this.supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  speak(text, rate) {
    if (!this.supported || !text) {
      return Promise.resolve();
    }

    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = Math.max(0.75, Math.min(1.15, rate / 100));
      utterance.pitch = 1;
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    });
  }
}

class DebateAgentClient {
  async respond({ topic, stance, argument, history }) {
    const startedAt = performance.now();
    const canCallServer = window.location.protocol.startsWith("http");

    if (canCallServer) {
      try {
        const response = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, stance, argument, history: history.slice(-6) }),
        });

        if (!response.ok) {
          throw new Error(`Agent server returned ${response.status}`);
        }

        const data = await response.json();
        return {
          text: data.text,
          mode: data.mode || "server",
          model: data.model || null,
          elapsedMs: data.elapsedMs || Math.round(performance.now() - startedAt),
          warning: data.warning || null,
        };
      } catch (error) {
        return {
          ...createLocalDebateResponse({ topic, stance, argument }),
          elapsedMs: Math.round(performance.now() - startedAt),
          warning: error.message,
        };
      }
    }

    return {
      ...createLocalDebateResponse({ topic, stance, argument }),
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  }
}

class CoachAgent {
  analyze({ argument }) {
    const words = tokenize(argument);
    const hasReason = /\b(because|since|therefore|as a result|for example)\b/i.test(argument);
    const hasContrast = /\b(however|although|but|on the other hand)\b/i.test(argument);
    const sentenceCount = Math.max(1, argument.split(/[.!?]+/).filter(Boolean).length);
    const averageSentenceLength = words.length / sentenceCount;

    const clarity = clampScore(45 + Math.min(35, words.length * 1.5) - Math.max(0, averageSentenceLength - 24));
    const structure = clampScore(42 + (hasReason ? 24 : 0) + (hasContrast ? 16 : 0));
    const evidence = clampScore(34 + (/\b(data|research|study|example|evidence|case)\b/i.test(argument) ? 34 : 0));

    let tip = "Add a concrete example to make your argument easier to challenge and defend.";
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
      tip,
    };
  }
}

const speechInput = new SpeechInputService({
  onInterim: (text) => {
    els.liveTranscript.textContent = text || "Listening";
  },
  onFinal: (text) => {
    stopListeningUi();
    submitArgument(text, "voice");
  },
  onStatus: (label) => {
    els.transcriptStatus.textContent = label;
  },
  onError: (message) => {
    stopListeningUi();
    setLayer("stt", "error", message);
    els.transcriptStatus.textContent = message;
  },
});

const voiceOutput = new VoiceOutputService();
const debateAgent = new DebateAgentClient();
const coachAgent = new CoachAgent();

function init() {
  const saved = storage.load();
  if (saved) {
    state.history = Array.isArray(saved.history) ? saved.history : [];
    state.topic = saved.topic || state.topic;
    state.stance = saved.stance || state.stance;
    state.feedback = saved.feedback || initialFeedback;
    state.latency = Array.isArray(saved.latency) ? saved.latency : [];
  }

  els.topicSelect.value = state.topic;
  const stanceInput = document.querySelector(`input[name="stance"][value="${state.stance}"]`);
  if (stanceInput) {
    stanceInput.checked = true;
  }

  els.tempoRange.value = String(state.tempo);
  bindEvents();
  setupInstallPrompt();
  registerServiceWorker();
  renderAll();
  checkServer();

  if (!speechInput.supported) {
    els.transcriptStatus.textContent = "Speech recognition unavailable";
    setLayer("stt", "error", "Use the text fallback");
  }

  if (!voiceOutput.supported) {
    setLayer("tts", "error", "Speech synthesis unavailable");
  }
}

function bindEvents() {
  els.topicSelect.addEventListener("change", () => {
    state.topic = els.topicSelect.value;
    storage.save();
    renderAll();
  });

  document.querySelectorAll('input[name="stance"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.stance = input.value;
      storage.save();
    });
  });

  els.tempoRange.addEventListener("input", () => {
    state.tempo = Number(els.tempoRange.value);
  });

  els.micButton.addEventListener("click", () => {
    if (state.listening) {
      speechInput.stop();
      return;
    }
    startListening();
  });

  els.sendTextBtn.addEventListener("click", () => {
    const text = els.typedArgument.value.trim();
    if (!text) {
      els.typedArgument.focus();
      return;
    }
    els.typedArgument.value = "";
    submitArgument(text, "typed");
  });

  els.typedArgument.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      els.sendTextBtn.click();
    }
  });

  els.clearSessionBtn.addEventListener("click", () => {
    window.speechSynthesis?.cancel();
    storage.clear();
    state.history = [];
    state.latency = [];
    state.feedback = initialFeedback;
    resetLayers();
    renderAll();
  });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installAppBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    els.installAppBtn.hidden = true;
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.location.protocol.startsWith("http")) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      setServerStatus(false, "App cache off");
    });
  });
}

async function checkServer() {
  if (!window.location.protocol.startsWith("http")) {
    setServerStatus(false, "Static preview");
    return;
  }

  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    state.server = data;
    setServerStatus(true, data.hasApiKey ? `OpenAI ${data.model}` : "Mock agent");
  } catch {
    setServerStatus(false, "Local only");
  }
}

function setServerStatus(ready, label) {
  els.serverStatus.textContent = label;
  els.serverStatus.className = ready ? "status-pill" : "status-pill warning";
}

function startListening() {
  if (state.submitting) {
    return;
  }

  resetFastPath();
  state.listening = true;
  setLayer("mic", "active", "Capturing voice");
  setLayer("stt", "active", "Building transcript");
  els.liveTranscript.textContent = "Listening";
  els.transcriptStatus.textContent = "Listening";
  els.micButton.classList.add("listening");
  els.voiceMeter.classList.add("active");
  els.micButtonText.textContent = "Stop listening";
  speechInput.start();
  renderLayers();
  renderPipeline();
}

function stopListeningUi() {
  state.listening = false;
  els.micButton.classList.remove("listening");
  els.voiceMeter.classList.remove("active");
  els.micButtonText.textContent = "Start speaking";
}

async function submitArgument(argument, source) {
  const cleanArgument = normalizeText(argument);
  if (!cleanArgument || state.submitting) {
    return;
  }

  state.submitting = true;
  const trace = new LatencyTrace();

  setLayer("mic", "done", source === "voice" ? "Voice captured" : "Typed input");
  setLayer("stt", "done", "Transcript ready");
  addTurn({ role: "user", text: cleanArgument, source });
  els.liveTranscript.textContent = cleanArgument;
  renderAll();

  try {
    setLayer("debate", "active", "Generating response");
    renderLayers();
    renderPipeline();

    const agentResult = await debateAgent.respond({
      topic: state.topic,
      stance: state.stance,
      argument: cleanArgument,
      history: state.history,
    });
    trace.add("Debate Agent", agentResult.elapsedMs);

    setLayer(
      "debate",
      agentResult.warning ? "done" : "done",
      agentResult.model ? `Model: ${agentResult.model}` : agentResult.mode,
    );

    addTurn({
      role: "ai",
      text: agentResult.text,
      source: agentResult.mode,
      warning: agentResult.warning,
    });

    setLayer("tts", "active", "Speaking response");
    renderAll();

    const ttsStarted = performance.now();
    await voiceOutput.speak(agentResult.text, state.tempo);
    trace.add("Text to Speech", Math.round(performance.now() - ttsStarted));
    setLayer("tts", "done", voiceOutput.supported ? "Response spoken" : "Text only");

    runBackgroundLayers(cleanArgument, trace);
  } catch (error) {
    setLayer("debate", "error", error.message);
  } finally {
    state.submitting = false;
    storage.save();
    renderAll();
  }
}

function runBackgroundLayers(argument, trace) {
  const coachStarted = performance.now();
  setLayer("coach", "active", "Analyzing argument");
  renderLayers();

  window.setTimeout(() => {
    state.feedback = coachAgent.analyze({ argument });
    trace.add("Coach Agent", Math.round(performance.now() - coachStarted));
    setLayer("coach", "done", "Feedback ready");

    const memoryStarted = performance.now();
    setLayer("memory", "active", "Updating notes");
    renderLayers();

    window.setTimeout(() => {
      trace.add("Memory Layer", Math.round(performance.now() - memoryStarted));
      state.latency = trace.items.slice(-6);
      setLayer("memory", "done", "Session saved");
      storage.save();
      renderAll();
    }, 120);
  }, 180);
}

function addTurn({ role, text, source, warning }) {
  state.history.push({
    id: createId(),
    role,
    text,
    source,
    warning: warning || null,
    createdAt: new Date().toISOString(),
  });
  state.history = state.history.slice(-30);
}

function resetFastPath() {
  ["mic", "stt", "debate", "tts"].forEach((id) => {
    const layer = layerDefinitions.find((item) => item.id === id);
    state.layerStatus[id] = { status: "idle", detail: layer.detail };
  });
}

function resetLayers() {
  layerDefinitions.forEach((layer) => {
    state.layerStatus[layer.id] = { status: "idle", detail: layer.detail };
  });
}

function setLayer(id, status, detail) {
  state.layerStatus[id] = { status, detail };
}

function renderAll() {
  els.activeTopic.textContent = state.topic;
  els.activeMode.textContent = state.server.hasApiKey ? "OpenAI agent" : "Mock agent";
  renderPipeline();
  renderLayers();
  renderLatency();
  renderConversation();
  renderFeedback();
  renderMemory();
}

function renderPipeline() {
  const fastLayers = layerDefinitions.filter((layer) => layer.path === "fast");
  els.pipelineView.innerHTML = fastLayers
    .map((layer) => {
      const layerState = state.layerStatus[layer.id];
      return `
        <div class="pipeline-step ${layerState.status}">
          <span class="step-title">${escapeHtml(layer.title)}</span>
          <span class="step-detail">${escapeHtml(layerState.detail)}</span>
        </div>
      `;
    })
    .join("");
}

function renderLayers() {
  els.layerList.innerHTML = layerDefinitions
    .map((layer) => {
      const layerState = state.layerStatus[layer.id];
      const pathLabel = layer.path === "fast" ? "fast" : "background";
      return `
        <div class="layer-row ${layerState.status}">
          <span class="layer-name">${escapeHtml(layer.title)}</span>
          <span class="layer-detail">${escapeHtml(layerState.detail)} - ${pathLabel}</span>
        </div>
      `;
    })
    .join("");
}

function renderLatency() {
  if (!state.latency.length) {
    els.latencyView.innerHTML = '<div class="empty-state">No trace yet</div>';
    return;
  }

  const max = Math.max(...state.latency.map((item) => item.ms), 1);
  els.latencyView.innerHTML = state.latency
    .map((item) => {
      const width = Math.max(8, Math.round((item.ms / max) * 100));
      return `
        <div class="latency-row">
          <div class="metric-top">
            <span class="metric-label">${escapeHtml(item.label)}</span>
            <span class="latency-detail">${item.ms} ms</span>
          </div>
          <div class="latency-bar"><span style="width: ${width}%"></span></div>
        </div>
      `;
    })
    .join("");
}

function renderConversation() {
  const turnPairs = Math.floor(state.history.length / 2);
  els.turnCount.textContent = `${turnPairs} ${turnPairs === 1 ? "turn" : "turns"}`;

  if (!state.history.length) {
    els.conversationList.innerHTML = '<div class="empty-state">No debate turns yet</div>';
    return;
  }

  els.conversationList.innerHTML = state.history
    .map((turn) => {
      const role = turn.role === "ai" ? "Debate Agent" : "You";
      const detail = turn.warning ? `Fallback: ${turn.warning}` : turn.source || "";
      return `
        <article class="turn-card ${turn.role}">
          <div class="turn-meta">
            <span>${escapeHtml(role)}</span>
            <span>${escapeHtml(detail)}</span>
          </div>
          <p class="turn-text">${escapeHtml(turn.text)}</p>
        </article>
      `;
    })
    .join("");

  els.conversationList.scrollTop = els.conversationList.scrollHeight;
}

function renderFeedback() {
  const metrics = [
    ["Clarity", state.feedback.clarity],
    ["Structure", state.feedback.structure],
    ["Evidence", state.feedback.evidence],
  ];

  els.feedbackView.innerHTML = `
    ${metrics
      .map(
        ([label, value]) => `
          <div class="metric">
            <div class="metric-top">
              <span class="metric-label">${label}</span>
              <span class="layer-detail">${value}/100</span>
            </div>
            <div class="meter"><span style="width: ${value}%"></span></div>
          </div>
        `,
      )
      .join("")}
    <p class="feedback-tip">${escapeHtml(state.feedback.tip)}</p>
  `;
}

function renderMemory() {
  const userTurns = state.history.filter((turn) => turn.role === "user").slice(-3).reverse();
  const notes = [];

  if (state.history.length) {
    notes.push(`Current topic: ${state.topic}`);
    notes.push(`Recent user turns stored: ${userTurns.length}`);
  }

  if (state.feedback.tip !== initialFeedback.tip) {
    notes.push(state.feedback.tip);
  }

  if (!notes.length) {
    els.memoryView.innerHTML = '<div class="empty-state">No notes yet</div>';
    return;
  }

  els.memoryView.innerHTML = notes
    .map((note) => `<div class="memory-note">${escapeHtml(note)}</div>`)
    .join("");
}

function createLocalDebateResponse({ topic, stance, argument }) {
  const opposite = stance === "support" ? "against" : "in favor of";
  const angle = pickCounterAngle(argument);
  const text = [
    `I understand your point, but I would argue ${opposite} that position.`,
    `${angle}`,
    `On the topic of "${topic}", your claim needs stronger evidence, not only a reasonable opinion.`,
    "What specific example proves that your argument works in real life?",
  ].join(" ");

  return {
    text,
    mode: "mock",
    model: null,
  };
}

function pickCounterAngle(argument) {
  if (/\b(student|school|education|teacher|learn)\b/i.test(argument)) {
    return "Education also depends on fairness, motivation, and human judgment, which technology alone cannot guarantee.";
  }

  if (/\b(cost|money|expensive|fund|tax)\b/i.test(argument)) {
    return "A policy can look attractive in theory while still failing if the cost is higher than the public benefit.";
  }

  if (/\b(freedom|right|choice|privacy)\b/i.test(argument)) {
    return "Individual freedom matters, but society also has to consider harm, responsibility, and long-term consequences.";
  }

  return "The weaker part of your argument is that it assumes the benefit will happen automatically.";
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

class LatencyTrace {
  constructor() {
    this.items = [];
  }

  add(label, ms) {
    this.items.push({ label, ms: Math.max(0, Math.round(ms)) });
  }
}

init();
