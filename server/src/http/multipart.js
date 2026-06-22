const { config } = require("../config");

async function readRequestBuffer(req) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > config.maxAudioBytes) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function parseMultipartForm(contentType, body) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];

  if (!boundary) {
    throw new Error("Missing multipart boundary");
  }

  const fields = {};
  const files = {};
  const raw = body.toString("latin1");
  const segments = raw.split(`--${boundary}`);

  for (const segment of segments) {
    const clean = segment.replace(/^\r\n/, "").replace(/\r\n$/, "");

    if (!clean || clean === "--") {
      continue;
    }

    const headerEnd = clean.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      continue;
    }

    const headerText = clean.slice(0, headerEnd);
    const contentText = clean.slice(headerEnd + 4).replace(/\r\n--$/, "");
    const headers = parseHeaders(headerText);
    const disposition = headers["content-disposition"] || "";
    const name = getDispositionValue(disposition, "name");
    const filename = getDispositionValue(disposition, "filename");

    if (!name) {
      continue;
    }

    if (filename) {
      files[name] = {
        filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: Buffer.from(contentText, "latin1"),
      };
    } else {
      fields[name] = Buffer.from(contentText, "latin1").toString("utf8").trim();
    }
  }

  return { fields, files };
}

function parseHeaders(headerText) {
  return Object.fromEntries(
    headerText
      .split("\r\n")
      .map((line) => {
        const index = line.indexOf(":");
        if (index === -1) {
          return null;
        }
        return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
      })
      .filter(Boolean),
  );
}

function getDispositionValue(disposition, key) {
  const match = new RegExp(`${key}="([^"]*)"`).exec(disposition);
  return match?.[1] || "";
}

module.exports = {
  parseMultipartForm,
  readRequestBuffer,
};
