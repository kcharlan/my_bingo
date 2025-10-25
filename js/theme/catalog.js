import {
  DEFAULT_THEME_ROOT,
  fetchThemeMetadata,
  normalizeThemeId,
  sanitizeMetadata,
} from "./loader.js";

const DIRECTORY_LISTING_QUERY = "catalog";
const DIRECTORY_LINK_PATTERN = /href\s*=\s*"([^"]+)"/gi;

export function createThemeCatalog(options = {}) {
  const fetchImpl = resolveFetch(options.fetch);
  const basePath = resolveBasePath(options.basePath);

  let cachedEntries = [];
  const warnedIds = new Set();

  async function refresh() {
    if (!fetchImpl) {
      cachedEntries = [];
      return getEntries();
    }

    const discovered = await discoverThemes(fetchImpl, basePath, warnedIds);
    cachedEntries = dedupeById(discovered);
    return getEntries();
  }

  function getEntries() {
    return cachedEntries.map((entry) => ({ ...entry }));
  }

  return {
    refresh,
    getEntries,
  };
}

function resolveFetch(fetchOverride) {
  if (typeof fetchOverride === "function") {
    return fetchOverride;
  }

  if (typeof fetch === "function") {
    return fetch.bind(globalThis);
  }

  return null;
}

function resolveBasePath(basePath) {
  if (typeof basePath === "string" && basePath.trim().length > 0) {
    return basePath.trim();
  }
  return DEFAULT_THEME_ROOT;
}

async function discoverThemes(fetchImpl, basePath, warnedIds) {
  const themeIds = await listThemeIds(fetchImpl, basePath);
  const entries = [];

  for (const themeId of themeIds) {
    const metadataUrl = buildThemeMetadataUrl(basePath, themeId);

    try {
      const metadata = await fetchThemeMetadata(fetchImpl, metadataUrl, themeId);
      const sanitized = sanitizeMetadata(metadata, themeId);
      entries.push({
        id: themeId,
        label: sanitized.name,
        version: sanitized.version,
        description: sanitized.description ?? "",
      });
    } catch (error) {
      if (
        typeof console !== "undefined" &&
        typeof console.warn === "function" &&
        warnedIds &&
        !warnedIds.has(themeId)
      ) {
        console.warn(`[theme/catalog] Skipping theme "${themeId}".`, error);
        warnedIds.add(themeId);
      }
    }
  }

  return entries;
}

async function listThemeIds(fetchImpl, basePath) {
  const idsFromManifest = await tryReadManifest(fetchImpl, basePath);
  if (idsFromManifest.length > 0) {
    return idsFromManifest;
  }

  return await tryReadDirectoryListing(fetchImpl, basePath);
}

async function tryReadManifest(fetchImpl, basePath) {
  const manifestUrl = `${stripTrailingSlash(basePath)}/manifest.json`;
  let response;
  try {
    response = await fetchImpl(manifestUrl, { cache: "no-store" });
  } catch {
    return [];
  }

  if (!response || !response.ok) {
    return [];
  }

  try {
    const payload = await response.json();
    const themes = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.themes)
        ? payload.themes
        : [];
    return normalizeThemeIdList(themes);
  } catch {
    return [];
  }
}

async function tryReadDirectoryListing(fetchImpl, basePath) {
  const query = `${DIRECTORY_LISTING_QUERY}=${Date.now()}`;
  const target = `${ensureTrailingSlash(basePath)}?${query}`;
  let response;
  try {
    response = await fetchImpl(target, { cache: "no-store" });
  } catch {
    return [];
  }

  if (!response || !response.ok) {
    return [];
  }

  try {
    const listing = await response.text();
    return parseDirectoryListing(listing, basePath);
  } catch {
    return [];
  }
}

function parseDirectoryListing(markup, basePath) {
  const ids = new Set();
  const addCandidate = (href) => {
    const name = deriveChildNameFromHref(href, basePath);
    if (!name) {
      return;
    }
    try {
      ids.add(normalizeThemeId(name));
    } catch {
      // Ignore invalid folder names.
    }
  };

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(markup), "text/html");
      const anchors = Array.from(doc.querySelectorAll("a[href]"));
      anchors.forEach((anchor) => {
        addCandidate(anchor.getAttribute("href"));
      });
      return Array.from(ids);
    } catch {
      // Fall through to regex-based parsing.
    }
  }

  let match;
  while ((match = DIRECTORY_LINK_PATTERN.exec(String(markup)))) {
    addCandidate(match[1]);
  }

  return Array.from(ids);
}

function deriveChildNameFromHref(rawHref, basePath) {
  if (typeof rawHref !== "string") {
    return null;
  }

  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith("#") || /^[a-zA-Z]+:/.test(trimmed)) {
    return null;
  }

  // Remove hash/query
  let href = trimmed.split("#")[0].split("?")[0];
  if (!href) {
    return null;
  }

  // Compute absolute base path for strict filtering of absolute links
  const absBase = toAbsoluteBasePath(basePath);
  const absBaseWithSlash = ensureTrailingSlash(absBase);
  const baseDirName = absBaseWithSlash
    .split("/")
    .filter(Boolean)
    .slice(-1)[0] || "";

  // Absolute path: must be immediate child of absBase
  if (href.startsWith("/")) {
    if (!href.startsWith(absBaseWithSlash)) {
      return null;
    }
    let tail = href.slice(absBaseWithSlash.length);
    if (!tail) {
      return null;
    }
    if (tail.endsWith("/")) {
      tail = tail.slice(0, -1);
    }
    if (!tail || tail.includes("/")) {
      return null;
    }
    if (tail === "." || tail === "..") {
      return null;
    }
    if (baseDirName && tail === baseDirName) {
      return null;
    }
    return tail;
  }

  // Relative path: must be a single segment (optionally with trailing slash)
  href = href.replace(/^\.\/?/, "");
  if (!href) {
    return null;
  }
  if (href.endsWith("/")) {
    href = href.slice(0, -1);
  }
  if (!href || href.includes("/")) {
    return null;
  }
  if (href === "." || href === "..") {
    return null;
  }
  if (baseDirName && href === baseDirName) {
    return null;
  }
  return href;
}

function toAbsoluteBasePath(basePath) {
  try {
    if (typeof document !== "undefined" && document.baseURI) {
      const url = new URL(ensureTrailingSlash(basePath), document.baseURI);
      return url.pathname;
    }
  } catch {
    // fall through
  }
  // Fallback best effort: normalize ./themes -> /themes
  const normalized = String(basePath ?? "").replace(/^\.\//, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeThemeIdList(rawThemes) {
  if (!Array.isArray(rawThemes)) {
    return [];
  }

  const ids = [];
  for (const entry of rawThemes) {
    if (typeof entry !== "string") {
      continue;
    }
    try {
      ids.push(normalizeThemeId(entry));
    } catch {
      // Skip invalid IDs.
    }
  }
  return ids;
}

function buildThemeMetadataUrl(basePath, themeId) {
  const trimmedBase = stripTrailingSlash(basePath);
  return `${trimmedBase}/${themeId}/theme.json`;
}

function stripTrailingSlash(path) {
  if (typeof path !== "string" || path.length === 0) {
    return "";
  }
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function ensureTrailingSlash(path) {
  if (typeof path !== "string" || path.length === 0) {
    return "./";
  }
  return path.endsWith("/") ? path : `${path}/`;
}

function dedupeById(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string") {
      continue;
    }
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    result.push(entry);
  }
  return result;
}
