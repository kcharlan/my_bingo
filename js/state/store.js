import { BOARD_CELL_COUNT, BOARD_SIZE, FREE_COORDINATE, createEmptyBoard } from "../logic/board.js";

const STATE_STORAGE_KEY = "bingo/state/v1";
const STATE_SCHEMA = "bingo.state.v1";

/**
 * Creates a resilient storage layer that prefers localStorage but falls back
 * to an in-memory Map when the browser APIs are unavailable (e.g., tests,
 * server-side rendering, or privacy-restricted environments).
 */
function resolveStorage(customStorage) {
  if (customStorage) {
    return customStorage;
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return createMemoryStorage();
  }

  try {
    const testKey = "__bingo_state_probe__";
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    console.warn("[state/store] Falling back to in-memory storage:", error);
    return createMemoryStorage();
  }
}

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function safeParse(jsonValue) {
  if (typeof jsonValue !== "string") {
    return { ok: false, error: new Error("Value is not a string.") };
  }

  try {
    return { ok: true, value: JSON.parse(jsonValue) };
  } catch (error) {
    return { ok: false, error };
  }
}

function cloneState(state) {
  if (typeof structuredClone === "function") {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state));
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createDefaultState(nowFn) {
  return {
    schema: STATE_SCHEMA,
    board: createEmptyBoard(),
    bingo: { hasBingo: false },
    theme: { id: "default", version: "1.0.0" },
    wordList: { filename: "", hash: "" },
    meta: { ts: typeof nowFn === "function" ? nowFn() : Date.now() },
  };
}

function validateStateCandidate(candidate) {
  const errors = [];

  if (candidate === null || typeof candidate !== "object") {
    errors.push("State must be an object.");
    return { valid: false, errors };
  }

  if (candidate.schema !== STATE_SCHEMA) {
    errors.push(`Invalid schema identifier (expected ${STATE_SCHEMA}).`);
  }

  const { board } = candidate;
  if (!board || typeof board !== "object") {
    errors.push("Missing board object.");
  } else {
    validateBoard(board, errors);
  }

  if (!candidate.bingo || typeof candidate.bingo !== "object") {
    errors.push("Missing bingo object.");
  } else if (!isBoolean(candidate.bingo.hasBingo)) {
    errors.push("bingo.hasBingo must be a boolean.");
  }

  if (!candidate.theme || typeof candidate.theme !== "object") {
    errors.push("Missing theme object.");
  } else {
    if (!isNonEmptyString(candidate.theme.id)) {
      errors.push("theme.id must be a non-empty string.");
    }
    if (!isNonEmptyString(candidate.theme.version)) {
      errors.push("theme.version must be a non-empty string.");
    }
  }

  if (!candidate.wordList || typeof candidate.wordList !== "object") {
    errors.push("Missing wordList object.");
  } else {
    const { filename, hash } = candidate.wordList;
    if (typeof filename !== "string") {
      errors.push("wordList.filename must be a string.");
    }
    if (typeof hash !== "string") {
      errors.push("wordList.hash must be a string.");
    }
  }

  if (!candidate.meta || typeof candidate.meta !== "object") {
    errors.push("Missing meta object.");
  } else if (!isNumber(candidate.meta.ts)) {
    errors.push("meta.ts must be a finite number timestamp.");
  }

  return { valid: errors.length === 0, errors };
}

function validateBoard(board, errors) {
  if (board.size !== BOARD_SIZE) {
    errors.push(`board.size must be ${BOARD_SIZE}.`);
  }

  if (!board.free || typeof board.free !== "object") {
    errors.push("board.free must be an object.");
  } else if (board.free.row !== FREE_COORDINATE.row || board.free.col !== FREE_COORDINATE.col) {
    errors.push("board.free must match the Free cell coordinates.");
  }

  if (!Array.isArray(board.cells)) {
    errors.push("board.cells must be an array.");
    return;
  }

  if (board.cells.length !== BOARD_CELL_COUNT) {
    errors.push(`board.cells must contain ${BOARD_CELL_COUNT} entries.`);
  }

  for (const cell of board.cells) {
    if (!cell || typeof cell !== "object") {
      errors.push("Each board cell must be an object.");
      break;
    }

    if (!Number.isInteger(cell.row) || !Number.isInteger(cell.col)) {
      errors.push("Cell row/col must be integers.");
      break;
    }

    if (cell.row < 0 || cell.row >= BOARD_SIZE || cell.col < 0 || cell.col >= BOARD_SIZE) {
      errors.push("Cell row/col out of bounds.");
      break;
    }

    if (!("text" in cell) || typeof cell.text !== "string") {
      errors.push("Cell text must be a string.");
      break;
    }

    if (!("marked" in cell) || !isBoolean(cell.marked)) {
      errors.push("Cell marked must be a boolean.");
      break;
    }
  }

  const freeCell = board.cells?.find(
    (cell) => cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col
  );

  if (!freeCell) {
    errors.push("Free cell missing from board.cells.");
  } else if (!freeCell.marked) {
    errors.push("Free cell must always be marked.");
  }
}

function normalizeState(state, nowFn) {
  const clone = cloneState(state);
  clone.schema = STATE_SCHEMA;
  clone.meta = {
    ...(clone.meta && typeof clone.meta === "object" ? clone.meta : {}),
    ts: typeof nowFn === "function" ? nowFn() : Date.now(),
  };
  return clone;
}

function createEventRegistry() {
  const registry = new Map();

  return {
    on(eventName, handler) {
      if (typeof handler !== "function") {
        throw new TypeError("Event handler must be a function.");
      }

      const handlers = registry.get(eventName) ?? new Set();
      handlers.add(handler);
      registry.set(eventName, handlers);

      return () => handlers.delete(handler);
    },
    emit(eventName, payload) {
      const handlers = registry.get(eventName);
      if (!handlers || handlers.size === 0) {
        return;
      }

      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[state/store] Listener for "${eventName}" failed:`, error);
        }
      }
    },
  };
}

export function createStateStore(options = {}) {
  const { storage = null, storageKey = STATE_STORAGE_KEY, now = () => Date.now() } = options;

  const persistence = resolveStorage(storage);
  const events = createEventRegistry();

  function persistState(nextState) {
    const normalized = normalizeState(nextState, now);
    const validation = validateStateCandidate(normalized);

    if (!validation.valid) {
      const error = new Error(
        `Attempted to persist invalid state: ${validation.errors.join("; ")}`
      );
      error.details = validation.errors;
      throw error;
    }

    persistence.setItem(storageKey, JSON.stringify(normalized));
    events.emit("change", { state: cloneState(normalized) });
    return normalized;
  }

  function load() {
    const rawValue = persistence.getItem(storageKey);
    if (rawValue === null) {
      const defaultState = createDefaultState(now);
      persistence.setItem(storageKey, JSON.stringify(defaultState));
      return {
        state: cloneState(defaultState),
        status: "fresh",
      };
    }

    const parsed = safeParse(rawValue);
    if (!parsed.ok) {
      const fallback = resetToDefaultsInternal("parse_error", parsed.error);
      return { state: cloneState(fallback), status: "reset" };
    }

    const validation = validateStateCandidate(parsed.value);
    if (!validation.valid) {
      const fallback = resetToDefaultsInternal("schema_invalid", validation.errors);
      return { state: cloneState(fallback), status: "reset" };
    }

    return { state: cloneState(parsed.value), status: "loaded" };
  }

  function save(nextState) {
    const persisted = persistState(nextState);
    return cloneState(persisted);
  }

  function clear(reason = "manual_clear") {
    persistence.removeItem(storageKey);
    events.emit("corruption", { reason, state: cloneState(createDefaultState(now)) });
  }

  function resetToDefaultsInternal(reason, detail) {
    const fallback = createDefaultState(now);
    persistence.setItem(storageKey, JSON.stringify(fallback));
    events.emit("corruption", { reason, detail, state: cloneState(fallback) });
    return fallback;
  }

  function resetToDefaults(reason = "manual_reset") {
    const fallback = resetToDefaultsInternal(reason);
    return cloneState(fallback);
  }

  return {
    load,
    save,
    clear,
    resetToDefaults,
    getDefaultState: () => cloneState(createDefaultState(now)),
    subscribe(eventName, handler) {
      return events.on(eventName, handler);
    },
    get storageKey() {
      return storageKey;
    },
  };
}

export const store = createStateStore();
export { BOARD_SIZE, BOARD_CELL_COUNT, FREE_COORDINATE, STATE_SCHEMA, STATE_STORAGE_KEY };
