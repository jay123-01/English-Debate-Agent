const { config } = require("../config");

async function createMessage({ system, input, maxOutputTokens = 220 }) {
  if (!config.anthropicApiKey) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: maxOutputTokens,
      system,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic generation failed: ${response.status} ${errorText.slice(0, 180)}`);
  }

  const payload = await response.json();
  return extractText(payload);
}

function extractText(payload) {
  if (!Array.isArray(payload.content)) {
    return "";
  }

  return payload.content
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join(" ")
    .trim();
}

module.exports = {
  createMessage,
};
