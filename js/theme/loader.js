const DEFAULT_THEME = Object.freeze({
  id: "default",
  name: "Default (Light)",
  version: "1.0.0",
  description: "Baseline styling packaged with the application.",
});

export const DEFAULT_THEME_ROOT = "./themes";
const STYLE_DATA_ATTRIBUTE = "data-bingo-theme";

export function createThemeLoader(options = {}) {
  const documentRef = options.document ?? (typeof document !== "undefined" ? document : null);
  const fetchImpl =
    typeof options.fetch === "function"
      ? options.fetch
      : typeof fetch === "function"
        ? fetch.bind(globalThis)
        : null;
  const themeRoot =
    typeof options.basePath === "string" && options.basePath.trim().length > 0
      ? options.basePath.trim()
      : DEFAULT_THEME_ROOT;

  if (!documentRef) {
    return createNoopLoader();
  }

  let activeTheme = { ...DEFAULT_THEME };
  let styleElement = null;

  ensureThemeAttribute(documentRef, DEFAULT_THEME.id);

  async function load(themeId) {
    const normalizedId = normalizeThemeId(themeId);
    if (normalizedId === DEFAULT_THEME.id) {
      removeStyleElement();
      ensureThemeAttribute(documentRef, DEFAULT_THEME.id);
      activeTheme = { ...DEFAULT_THEME };
      return getActiveTheme();
    }

    if (!fetchImpl) {
      throw new Error("Theme loading requires fetch support.");
    }

    const themeBase = `${themeRoot}/${normalizedId}`;
    const metadataUrl = `${themeBase}/theme.json`;
    const metadata = await fetchThemeMetadata(fetchImpl, metadataUrl, normalizedId);
    const sanitized = sanitizeMetadata(metadata, normalizedId);

    if (!isSafeRelativePath(sanitized.css)) {
      throw new Error(`Theme "${normalizedId}" CSS path must be relative.`);
    }

    const cssUrl = normalizePath(`${themeBase}/${sanitized.css}`);
    const cssText = await fetchCss(fetchImpl, cssUrl, normalizedId);
    ensureCssSecurity(cssText, normalizedId);

    const nextStyle = applyCss(documentRef, cssText);
    styleElement = nextStyle;
    activeTheme = {
      id: normalizedId,
      name: sanitized.name,
      version: sanitized.version,
      description: sanitized.description ?? "",
    };
    ensureThemeAttribute(documentRef, normalizedId);
    return getActiveTheme();
  }

  function getActiveTheme() {
    return { ...activeTheme };
  }

  function getDefaultTheme() {
    return { ...DEFAULT_THEME };
  }

  function reset() {
    removeStyleElement();
    ensureThemeAttribute(documentRef, DEFAULT_THEME.id);
    activeTheme = { ...DEFAULT_THEME };
    return getActiveTheme();
  }

  function removeStyleElement() {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      styleElement = null;
    }
  }

  function applyCss(doc, cssText) {
    if (!doc.head) {
      throw new Error("Cannot apply theme without a document head.");
    }

    const newStyle = doc.createElement("style");
    newStyle.setAttribute(STYLE_DATA_ATTRIBUTE, "active");
    newStyle.textContent = cssText;
    doc.head.appendChild(newStyle);

    if (styleElement && styleElement !== newStyle && styleElement.parentNode === doc.head) {
      styleElement.parentNode.removeChild(styleElement);
    }

    return newStyle;
  }

  return {
    load,
    getActiveTheme,
    getDefaultTheme,
    reset,
  };
}

function createNoopLoader() {
  let activeTheme = { ...DEFAULT_THEME };
  return {
    async load(themeId) {
      const normalizedId = normalizeThemeId(themeId);
      if (normalizedId !== DEFAULT_THEME.id) {
        throw new Error(`Theme "${normalizedId}" cannot be loaded in this environment.`);
      }
      activeTheme = { ...DEFAULT_THEME };
      return { ...activeTheme };
    },
    getActiveTheme() {
      return { ...activeTheme };
    },
    getDefaultTheme() {
      return { ...DEFAULT_THEME };
    },
    reset() {
      activeTheme = { ...DEFAULT_THEME };
      return { ...activeTheme };
    },
  };
}

export async function fetchThemeMetadata(fetchImpl, url, themeId) {
  let response;
  try {
    response = await fetchImpl(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(`Theme "${themeId}" metadata request failed: ${error?.message ?? error}`);
  }

  if (!response || !response.ok) {
    throw new Error(
      `Theme "${themeId}" metadata request returned status ${response?.status ?? "?"}.`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Theme "${themeId}" metadata is not valid JSON.`);
  }
}

async function fetchCss(fetchImpl, url, themeId) {
  let response;
  try {
    response = await fetchImpl(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(`Theme "${themeId}" CSS request failed: ${error?.message ?? error}`);
  }

  if (!response || !response.ok) {
    throw new Error(`Theme "${themeId}" CSS request returned status ${response?.status ?? "?"}.`);
  }

  try {
    return await response.text();
  } catch {
    throw new Error(`Theme "${themeId}" CSS could not be read.`);
  }
}

export function sanitizeMetadata(metadata, themeId) {
  if (!isPlainObject(metadata)) {
    throw new Error(`Theme "${themeId}" metadata must be a plain object.`);
  }

  const name = sanitizeTextField(metadata.name, "name", themeId, { required: true });
  const css = sanitizeTextField(metadata.css, "css", themeId, { required: true });
  const version = sanitizeTextField(metadata.version, "version", themeId, { required: true });
  const description = sanitizeTextField(metadata.description, "description", themeId, {
    required: false,
  });

  const sanitized = { name, css, version };
  if (description) {
    sanitized.description = description;
  }
  return sanitized;
}

export function normalizeThemeId(themeId) {
  const candidate = typeof themeId === "string" ? themeId.trim() : "";
  if (!candidate) {
    return DEFAULT_THEME.id;
  }
  if (!/^[a-z0-9_-]+$/i.test(candidate)) {
    throw new Error(`Invalid theme identifier "${themeId}".`);
  }
  return candidate;
}

function isSafeRelativePath(path) {
  if (!isNonEmptyString(path)) {
    return false;
  }
  const trimmed = path.trim();
  if (/^[a-zA-Z]+:/.test(trimmed) || trimmed.startsWith("//")) {
    return false;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return false;
  }
  if (trimmed.includes("..")) {
    return false;
  }
  return true;
}

function normalizePath(path) {
  return path.replace(/\/{2,}/g, "/");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureThemeAttribute(doc, themeId) {
  if (!doc?.documentElement) {
    return;
  }
  doc.documentElement.setAttribute("data-theme", themeId);
}

function sanitizeTextField(value, fieldName, themeId, options = {}) {
  const required = options.required === true;
  if (!isNonEmptyString(value)) {
    if (required) {
      throw new Error(`Theme "${themeId}" metadata is missing a ${fieldName}.`);
    }
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new Error(`Theme "${themeId}" metadata ${fieldName} must not be empty.`);
    }
    return "";
  }

  if (containsControlCharacters(trimmed)) {
    throw new Error(
      `Theme "${themeId}" metadata ${fieldName} contains disallowed control characters.`
    );
  }

  return trimmed;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ensureCssSecurity(cssText, themeId) {
  if (typeof cssText !== "string") {
    throw new Error(`Theme "${themeId}" CSS could not be validated.`);
  }

  const stripped = stripCssComments(cssText);
  const lower = stripped.toLowerCase();

  if (lower.includes("<script")) {
    throw new Error(`Theme "${themeId}" CSS must not contain script tags.`);
  }

  const importPattern =
    /@import\s+(?:(["'])(.*?)\1|url\(\s*(?:(["'])(.*?)\3|([^)]*?))\s*\)|([^;\s]+))/gi;
  let importMatch;
  while ((importMatch = importPattern.exec(stripped))) {
    const target = importMatch[2] ?? importMatch[4] ?? importMatch[5] ?? importMatch[6] ?? "";
    validateCssReference(target, themeId, { kind: "import" });
  }

  const urlPattern = /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi;
  let urlMatch;
  while ((urlMatch = urlPattern.exec(stripped))) {
    const target = urlMatch[2] ?? urlMatch[3] ?? "";
    validateCssReference(target, themeId, { kind: "url" });
  }
}

function stripCssComments(cssText) {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, "");
}

function validateCssReference(rawTarget, themeId, options = {}) {
  const kind = options.kind ?? "url";
  const target = typeof rawTarget === "string" ? rawTarget.trim() : "";
  if (!target || target.startsWith("#")) {
    return;
  }

  if (/javascript:/i.test(target)) {
    throw new Error(`Theme "${themeId}" CSS must not reference javascript: URLs.`);
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith("//")) {
    throw new Error(`Theme "${themeId}" CSS ${kind} references must be local relative paths.`);
  }

  if (!isSafeRelativePath(target)) {
    throw new Error(`Theme "${themeId}" CSS ${kind} references must be local relative paths.`);
  }
}

function containsControlCharacters(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}
