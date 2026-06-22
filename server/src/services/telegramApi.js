class TelegramApi {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.fileBaseUrl = `https://api.telegram.org/file/bot${token}`;
  }

  async getUpdates({ offset, timeout = 30 }) {
    return this.call("getUpdates", {
      offset,
      timeout,
      allowed_updates: ["message", "callback_query"],
    });
  }

  async sendMessage(chatId, text, options = {}) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text: limitText(text, 3900),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...options,
    });
  }

  async sendChatAction(chatId, action) {
    return this.call("sendChatAction", {
      chat_id: chatId,
      action,
    });
  }

  async answerCallbackQuery(callbackQueryId, text = "") {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  async sendAudio(chatId, buffer, options = {}) {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("audio", new Blob([buffer], { type: "audio/mpeg" }), "debate-reply.mp3");
    if (options.caption) {
      form.append("caption", limitText(options.caption, 1000));
    }

    const response = await fetch(`${this.baseUrl}/sendAudio`, {
      method: "POST",
      body: form,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(`Telegram sendAudio failed: ${response.status} ${JSON.stringify(payload).slice(0, 180)}`);
    }

    return payload.result;
  }

  async getFile(fileId) {
    return this.call("getFile", {
      file_id: fileId,
    });
  }

  async downloadFile(filePath) {
    const response = await fetch(`${this.fileBaseUrl}/${filePath}`);
    if (!response.ok) {
      throw new Error(`Telegram file download failed: ${response.status}`);
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  async call(method, payload) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(`Telegram ${method} failed: ${response.status} ${JSON.stringify(result).slice(0, 180)}`);
    }

    return result.result;
  }
}

function limitText(text, limit) {
  const value = String(text || "");
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

module.exports = {
  TelegramApi,
};
