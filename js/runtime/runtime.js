const SNAPSHOT_VERSION = "1.0.0";

const globalScope =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : typeof self !== "undefined"
        ? self
        : undefined;

const seedInfo = resolveSeed(globalScope);
const runtimeSeed = seedInfo.value;
const hasDeterministicSeed = typeof runtimeSeed === "number";
const runtimeConfig = Object.freeze({
  deterministic: hasDeterministicSeed,
  seed: hasDeterministicSeed ? runtimeSeed : null,
  seedSource: seedInfo.source,
});

const seededGenerator = hasDeterministicSeed ? createSeededGenerator(runtimeSeed) : null;
const randomGenerator = seededGenerator ?? Math.random;

let latestSnapshot = deepFreeze({
  version: SNAPSHOT_VERSION,
  deterministic: runtimeConfig.deterministic,
  seed: runtimeConfig.seed,
  seedSource: runtimeConfig.seedSource,
  state: null,
  wordList: null,
  ui: null,
  meta: null,
});

if (globalScope && typeof globalScope === "object" && !hasSnapshotDescriptor(globalScope)) {
  Object.defineProperty(globalScope, "__bingo__", {
    configurable: true,
    enumerable: false,
    get() {
      return latestSnapshot;
    },
  });
}

export function getRandomGenerator() {
  return randomGenerator;
}

export function getRuntimeConfig() {
  return runtimeConfig;
}

export function publishSnapshot(state, extra = {}) {
  const payload = {
    version: SNAPSHOT_VERSION,
    deterministic: runtimeConfig.deterministic,
    seed: runtimeConfig.seed,
    seedSource: runtimeConfig.seedSource,
    state: cloneAndStrip(state),
  };

  if (extra && typeof extra === "object") {
    if (Object.prototype.hasOwnProperty.call(extra, "wordList")) {
      payload.wordList = cloneAndStrip(extra.wordList);
    }
    if (Object.prototype.hasOwnProperty.call(extra, "ui")) {
      payload.ui = cloneAndStrip(extra.ui);
    }
    if (Object.prototype.hasOwnProperty.call(extra, "meta")) {
      payload.meta = cloneAndStrip(extra.meta);
    }
  }

  latestSnapshot = deepFreeze(payload);
  return latestSnapshot;
}

function hasSnapshotDescriptor(scope) {
  const descriptor = Object.getOwnPropertyDescriptor(scope, "__bingo__");
  return Boolean(descriptor);
}

function resolveSeed(scope) {
  if (!scope || typeof scope !== "object") {
    return { value: null, source: null };
  }

  const candidates = [
    { raw: scope.BINGO_SEED, source: "globalThis.BINGO_SEED" },
    { raw: scope?.process?.env?.BINGO_SEED, source: "process.env.BINGO_SEED" },
  ];

  for (const candidate of candidates) {
    if (typeof candidate.raw === "undefined" || candidate.raw === null) {
      continue;
    }

    const seed = coerceSeed(candidate.raw);
    if (seed !== null) {
      return { value: seed, source: candidate.source };
    }
  }

  return { value: null, source: null };
}

function coerceSeed(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return toUint32(raw);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    const numericValue = parseStringSeed(trimmed);
    if (numericValue !== null) {
      return toUint32(numericValue);
    }

    return hashString(trimmed);
  }

  return null;
}

function parseStringSeed(value) {
  const radix = value.startsWith("0x") || value.startsWith("0X") ? 16 : 10;
  const parsed = Number.parseInt(value, radix);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function toUint32(value) {
  return value >>> 0;
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash >>> 0;
}

function createSeededGenerator(seed) {
  let state = seed >>> 0;
  return function seededRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneAndStrip(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON-based cloning.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function deepFreeze(value) {
  if (!isObjectLike(value)) {
    return value;
  }

  const seen = new WeakSet();
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!isObjectLike(current) || seen.has(current)) {
      continue;
    }

    seen.add(current);
    Object.freeze(current);

    const keys = Object.keys(current);
    for (const key of keys) {
      stack.push(current[key]);
    }
  }

  return value;
}

function isObjectLike(value) {
  return value !== null && typeof value === "object";
}
