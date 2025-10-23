const MIN_UNIQUE_ENTRIES = 24;
const CONTROL_CHAR_PATTERN = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/u;
let cachedEmojiPattern = undefined;

export class WordListError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WordListError";
    this.code = code;
    this.details = details;
  }
}

export async function loadWordListFromFile(source, options = {}) {
  if (!source || typeof source.arrayBuffer !== "function") {
    throw new WordListError("INVALID_SOURCE", "Word list source must be a File or Blob.");
  }

  let buffer;
  try {
    buffer = await source.arrayBuffer();
  } catch (error) {
    throw new WordListError("READ_FAILED", "Unable to read the selected word list file.", {
      cause: error,
    });
  }

  let textContent;
  try {
    textContent = decodeUtf8(buffer);
  } catch (error) {
    throw new WordListError("INVALID_ENCODING", "Word lists must be UTF-8 encoded.", {
      cause: error,
    });
  }

  const words = parseWordListText(textContent, options);
  const hash = await computeSha256(buffer);

  return {
    words,
    metadata: {
      filename:
        typeof source.name === "string" && source.name.trim().length > 0
          ? source.name
          : typeof options.filename === "string"
            ? options.filename
            : "wordlist.txt",
      size: typeof source.size === "number" ? source.size : buffer.byteLength,
      hash: hash ? `sha256:${hash}` : "",
      uniqueCount: words.length,
    },
  };
}

export function parseWordListText(content, options = {}) {
  if (typeof content !== "string") {
    throw new WordListError("INVALID_CONTENT", "Word list content must be a string.");
  }

  const minEntries =
    Number.isInteger(options.minEntries) && options.minEntries > 0
      ? options.minEntries
      : MIN_UNIQUE_ENTRIES;

  const lines = content.split(/\r?\n|\r/g);
  const unique = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (containsDisallowedCharacters(trimmed)) {
      throw new WordListError(
        "INVALID_CHARACTERS",
        "Word list entries must not contain emoji or control characters.",
        {
          line: index + 1,
          sample: trimmed.slice(0, 50),
        }
      );
    }

    const key = trimmed.toLocaleLowerCase();
    if (!unique.has(key)) {
      unique.set(key, trimmed);
    }
  }

  const entries = Array.from(unique.values());

  if (entries.length < minEntries) {
    throw new WordListError(
      "INSUFFICIENT_ENTRIES",
      `Word lists must contain at least ${minEntries} unique entries.`,
      { uniqueCount: entries.length }
    );
  }

  return entries;
}

async function computeSha256(buffer) {
  if (
    typeof crypto === "undefined" ||
    !crypto.subtle ||
    typeof crypto.subtle.digest !== "function"
  ) {
    return "";
  }

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(digest);
}

function decodeUtf8(buffer) {
  if (typeof TextDecoder !== "function") {
    throw new Error("TextDecoder is not available in this environment.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  return decoder.decode(buffer);
}

function containsDisallowedCharacters(value) {
  if (CONTROL_CHAR_PATTERN.test(value)) {
    return true;
  }

  const emojiPattern = getEmojiPattern();
  if (emojiPattern && emojiPattern.test(value)) {
    return true;
  }

  if (value.includes("\uFE0F") || value.includes("\uFE0E")) {
    return true;
  }

  return false;
}

function getEmojiPattern() {
  if (cachedEmojiPattern !== undefined) {
    return cachedEmojiPattern;
  }

  try {
    cachedEmojiPattern = new RegExp("\\p{Extended_Pictographic}", "u");
  } catch {
    try {
      cachedEmojiPattern = new RegExp(
        "[\\u{1F300}-\\u{1FAFF}\\u{1F900}-\\u{1F9FF}\\u{1FA70}-\\u{1FAFF}]",
        "u"
      );
    } catch {
      cachedEmojiPattern = null;
    }
  }

  return cachedEmojiPattern;
}

function bufferToHex(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  let hex = "";
  for (const byte of view) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export { MIN_UNIQUE_ENTRIES };
