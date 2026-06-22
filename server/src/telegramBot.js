const { createSessionSummary } = require("./agents/sessionAgent");
const { createSource } = require("./agents/sourceAgent");
const { config } = require("./config");
const { getDebatePersona } = require("./agents/debatePersonas");
const { createDebateTurn } = require("./services/debateTurn");
const { transcribeAudio } = require("./services/openai");
const { TelegramApi } = require("./services/telegramApi");

const sessions = new Map();
const levels = ["beginner", "intermediate", "advanced"];
const personaIds = ["maya", "theo"];

if (!config.telegramBotToken) {
  console.error("TELEGRAM_BOT_TOKEN is required to run the Telegram bot.");
  process.exit(1);
}

const telegram = new TelegramApi(config.telegramBotToken);

runPollingLoop().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function runPollingLoop() {
  console.log("Voice Debate Telegram bot is running with long polling.");

  let offset = 0;
  while (true) {
    try {
      const updates = await telegram.getUpdates({ offset, timeout: config.telegramPollTimeoutSeconds });
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error(`Telegram polling error: ${error.message}`);
      await wait(1500);
    }
  }
}

async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }

  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  if (!isAllowed(message.from)) {
    await telegram.sendMessage(chatId, "This bot is private.");
    return;
  }

  const session = getSession(chatId);
  const text = cleanText(message.text || message.caption || "");

  try {
    if (text.startsWith("/")) {
      await handleCommand({ chatId, session, text });
      return;
    }

    if (message.voice || message.audio) {
      await handleAudioMessage({ chatId, session, message });
      return;
    }

    if (session.expectingSource || shouldTreatAsSource(text, session)) {
      await createSourceFromText({ chatId, session, text });
      return;
    }

    await handleArgument({ chatId, session, argument: text || "" });
  } catch (error) {
    console.error(error);
    await telegram.sendMessage(chatId, `Sorry, something failed: ${escapeHtml(error.message)}`);
  }
}

async function handleCommand({ chatId, session, text }) {
  const [command, ...parts] = text.split(/\s+/);
  const arg = parts.join(" ").trim();

  if (command === "/start" || command === "/help") {
    await telegram.sendMessage(chatId, createHelpText(), {
      reply_markup: createSetupKeyboard(session),
    });
    return;
  }

  if (command === "/new") {
    sessions.set(chatId, createDefaultSession());
    await telegram.sendMessage(chatId, "New debate session started. Paste an article, prompt, transcript, or notes.");
    return;
  }

  if (command === "/paste") {
    session.expectingSource = true;
    await telegram.sendMessage(chatId, "Paste the source text in your next message. Use at least 80 characters.");
    return;
  }

  if (command === "/state") {
    await telegram.sendMessage(chatId, formatState(session), {
      reply_markup: createSetupKeyboard(session),
    });
    return;
  }

  if (command === "/summary") {
    await handleSummary({ chatId, session });
    return;
  }

  if (command === "/stance") {
    setStance(session, arg);
    await telegram.sendMessage(chatId, `User stance set to <b>${session.stance}</b>. AI stance: <b>${getAiStance(session)}</b>.`);
    return;
  }

  if (command === "/level") {
    setLevel(session, arg);
    await telegram.sendMessage(chatId, `Level set to <b>${session.level}</b>.`);
    return;
  }

  if (command === "/persona") {
    setPersona(session, arg);
    await telegram.sendMessage(chatId, `Opponent set to <b>${escapeHtml(getDebatePersona(session.personaId).name)}</b>.`);
    return;
  }

  await telegram.sendMessage(chatId, createHelpText(), {
    reply_markup: createSetupKeyboard(session),
  });
}

async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const session = getSession(chatId);
  const data = String(callbackQuery.data || "");

  if (!isAllowed(callbackQuery.from)) {
    await telegram.answerCallbackQuery(callbackQuery.id, "This bot is private.");
    return;
  }

  if (data.startsWith("motion:")) {
    const index = Number(data.replace("motion:", ""));
    const motion = session.sourceBrief?.debateMotions?.[index];
    if (motion) {
      session.selectedMotion = motion;
      await telegram.answerCallbackQuery(callbackQuery.id, "Motion selected.");
      await telegram.sendMessage(chatId, `Motion selected:\n<b>${escapeHtml(motion)}</b>`, {
        reply_markup: createSetupKeyboard(session),
      });
      return;
    }
  }

  if (data.startsWith("stance:")) {
    setStance(session, data.replace("stance:", ""));
    await telegram.answerCallbackQuery(callbackQuery.id, "Stance updated.");
    await telegram.sendMessage(chatId, `You: <b>${session.stance}</b>\nAI: <b>${getAiStance(session)}</b>`);
    return;
  }

  if (data.startsWith("level:")) {
    setLevel(session, data.replace("level:", ""));
    await telegram.answerCallbackQuery(callbackQuery.id, "Level updated.");
    await telegram.sendMessage(chatId, `Level: <b>${session.level}</b>`);
    return;
  }

  if (data.startsWith("persona:")) {
    setPersona(session, data.replace("persona:", ""));
    await telegram.answerCallbackQuery(callbackQuery.id, "Persona updated.");
    await telegram.sendMessage(chatId, `Opponent: <b>${escapeHtml(getDebatePersona(session.personaId).name)}</b>`);
    return;
  }

  await telegram.answerCallbackQuery(callbackQuery.id);
}

async function createSourceFromText({ chatId, session, text }) {
  if (text.length < 80) {
    await telegram.sendMessage(chatId, "Please paste at least 80 characters for the source.");
    return;
  }

  await telegram.sendChatAction(chatId, "typing");
  const sourceBrief = await createSource({
    sourceType: "text",
    title: "Telegram source",
    text,
  });

  session.sourceBrief = sourceBrief;
  session.selectedMotion = sourceBrief.debateMotions?.[0] || "";
  session.turns = [];
  session.expectingSource = false;

  await telegram.sendMessage(chatId, formatSourceBrief(sourceBrief), {
    reply_markup: createSetupKeyboard(session),
  });
}

async function handleAudioMessage({ chatId, session, message }) {
  const voice = message.voice || message.audio;
  if (!voice?.file_id) {
    await telegram.sendMessage(chatId, "I could not read that audio message.");
    return;
  }

  await telegram.sendChatAction(chatId, "typing");
  const file = await telegram.getFile(voice.file_id);
  const download = await telegram.downloadFile(file.file_path);
  const transcription = await transcribeAudio({
    buffer: download.buffer,
    contentType: download.contentType,
    filename: file.file_path?.split("/").pop() || "telegram-audio.ogg",
  });

  await handleArgument({
    chatId,
    session,
    argument: transcription.text,
    transcriptPrefix: transcription.warning ? `${transcription.warning}\n\n` : "",
  });
}

async function handleArgument({ chatId, session, argument, transcriptPrefix = "" }) {
  const cleanArgument = cleanText(argument);
  if (!cleanArgument) {
    await telegram.sendMessage(chatId, "Send a text argument, voice message, or /paste a source first.");
    return;
  }

  await telegram.sendChatAction(chatId, "typing");
  const result = await createDebateTurn(
    {
      topic: getActiveMotion(session),
      stance: session.stance,
      sourceId: session.sourceBrief?.sourceId,
      motion: getActiveMotion(session),
      userStance: session.stance,
      aiStance: getAiStance(session),
      level: session.level,
      personaId: session.personaId,
      argument: cleanArgument,
      history: session.turns.slice(-6),
    },
    { audioMode: "buffer" },
  );

  session.turns = [
    ...session.turns,
    {
      id: `${Date.now()}-user`,
      role: "user",
      text: cleanArgument,
    },
    {
      id: `${Date.now()}-agent`,
      role: "agent",
      text: result.reply,
      personaName: result.persona?.name,
      phase: result.phase,
      sourceContext: result.sourceContext,
    },
  ].slice(-20);

  await telegram.sendMessage(chatId, `${transcriptPrefix}${formatTurnResult(result)}`, {
    reply_markup: createSetupKeyboard(session),
  });

  if (result.audioBuffer) {
    await telegram.sendChatAction(chatId, "upload_voice");
    await telegram.sendAudio(chatId, result.audioBuffer, {
      caption: `${result.persona?.name || "Debate agent"} voice reply`,
    });
  }
}

async function handleSummary({ chatId, session }) {
  if (session.turns.length < 2) {
    await telegram.sendMessage(chatId, "Debate for at least one exchange before asking for a summary.");
    return;
  }

  await telegram.sendChatAction(chatId, "typing");
  const summary = await createSessionSummary({
    motion: getActiveMotion(session),
    userStance: session.stance,
    aiStance: getAiStance(session),
    sourceTitle: session.sourceBrief?.title,
    turns: session.turns,
  });

  await telegram.sendMessage(chatId, formatSummary(summary));
}

function createDefaultSession() {
  return {
    sourceBrief: null,
    selectedMotion: "",
    stance: "support",
    level: "intermediate",
    personaId: "maya",
    turns: [],
    expectingSource: false,
  };
}

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, createDefaultSession());
  }
  return sessions.get(chatId);
}

function isAllowed(user) {
  if (config.telegramAllowedUserIds.length === 0) {
    return true;
  }

  return config.telegramAllowedUserIds.includes(String(user?.id || ""));
}

function shouldTreatAsSource(text, session) {
  return text.length >= 500 && session.turns.length === 0 && !session.sourceBrief;
}

function setStance(session, value) {
  session.stance = value === "oppose" ? "oppose" : "support";
}

function setLevel(session, value) {
  if (levels.includes(value)) {
    session.level = value;
  }
}

function setPersona(session, value) {
  if (personaIds.includes(value)) {
    session.personaId = value;
  }
}

function getAiStance(session) {
  return session.stance === "support" ? "oppose" : "support";
}

function getActiveMotion(session) {
  return session.selectedMotion || session.sourceBrief?.debateMotions?.[0] || "Should AI be used in education?";
}

function createSetupKeyboard(session) {
  const motionButtons = (session.sourceBrief?.debateMotions || []).slice(0, 3).map((motion, index) => [
    {
      text: `${session.selectedMotion === motion ? "* " : ""}Motion ${index + 1}`,
      callback_data: `motion:${index}`,
    },
  ]);

  return {
    inline_keyboard: [
      ...motionButtons,
      [
        { text: session.stance === "support" ? "* Support" : "Support", callback_data: "stance:support" },
        { text: session.stance === "oppose" ? "* Oppose" : "Oppose", callback_data: "stance:oppose" },
      ],
      [
        { text: session.personaId === "maya" ? "* Maya" : "Maya", callback_data: "persona:maya" },
        { text: session.personaId === "theo" ? "* Theo" : "Theo", callback_data: "persona:theo" },
      ],
      levels.map((level) => ({
        text: session.level === level ? `* ${level}` : level,
        callback_data: `level:${level}`,
      })),
    ],
  };
}

function createHelpText() {
  return [
    "<b>Voice Debate Lab</b>",
    "",
    "1. Send /paste, then paste an article, prompt, transcript, or notes.",
    "2. Pick a motion, stance, level, and persona with the buttons.",
    "3. Send a text argument or Telegram voice message.",
    "",
    "Commands: /new /paste /state /summary /stance support /level intermediate /persona maya",
  ].join("\n");
}

function formatSourceBrief(sourceBrief) {
  return [
    `<b>${escapeHtml(sourceBrief.title)}</b>`,
    "",
    escapeHtml(sourceBrief.summary),
    "",
    "<b>Key claims</b>",
    ...sourceBrief.keyClaims.map((claim) => `- ${escapeHtml(claim)}`),
    "",
    "<b>Motions</b>",
    ...sourceBrief.debateMotions.map((motion, index) => `${index + 1}. ${escapeHtml(motion)}`),
    "",
    `<i>${sourceBrief.chunkCount} chunks indexed with ${escapeHtml(sourceBrief.ragBackend || "json")} RAG.</i>`,
  ].join("\n");
}

function formatTurnResult(result) {
  const sourceLine = result.sourceContext?.length
    ? `\n\n<b>Source used</b>\n${escapeHtml(result.sourceContext[0].preview)}`
    : "";
  const feedback = result.feedback || {};

  return [
    `<b>${escapeHtml(result.persona?.name || "Debate Agent")} - ${escapeHtml(result.phase || "turn")}</b>`,
    escapeHtml(result.reply),
    sourceLine,
    "",
    "<b>Coach</b>",
    `Clarity ${feedback.clarity || 0}/100 | Structure ${feedback.structure || 0}/100 | Evidence ${feedback.evidence || 0}/100 | Source ${feedback.sourceUse || 0}/100`,
    feedback.tip ? `\n${escapeHtml(feedback.tip)}` : "",
    feedback.revisedSentence ? `\n<b>Natural English</b>\n${escapeHtml(feedback.revisedSentence)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatSummary(summary) {
  return [
    "<b>Session summary</b>",
    escapeHtml(summary.summary),
    "",
    `<b>Strongest point</b>\n${escapeHtml(summary.strongestUserPoint)}`,
    `<b>Weakest point</b>\n${escapeHtml(summary.weakestUserPoint)}`,
    `<b>Language focus</b>\n${escapeHtml(summary.languageFocus)}`,
    `<b>Next drill</b>\n${escapeHtml(summary.nextDrill)}`,
  ].join("\n\n");
}

function formatState(session) {
  return [
    "<b>Current setup</b>",
    `Source: ${session.sourceBrief ? escapeHtml(session.sourceBrief.title) : "none"}`,
    `Motion: ${escapeHtml(getActiveMotion(session))}`,
    `You: ${session.stance}`,
    `AI: ${getAiStance(session)}`,
    `Level: ${session.level}`,
    `Opponent: ${escapeHtml(getDebatePersona(session.personaId).name)}`,
    `Turns: ${Math.floor(session.turns.length / 2)}`,
  ].join("\n");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
