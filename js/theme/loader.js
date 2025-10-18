const DEFAULT_THEME = Object.freeze({
  id: "default",
  name: "Default (Light)",
  version: "1.0.0",
  description: "Baseline styling packaged with the application.",
});

const DEFAULT_THEME_ROOT = "./themes";
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

async function fetchThemeMetadata(fetchImpl, url, themeId) {
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

function sanitizeMetadata(metadata, themeId) {
  if (metadata === null || typeof metadata !== "object") {
    throw new Error(`Theme "${themeId}" metadata must be an object.`);
  }

  const name = isNonEmptyString(metadata.name) ? metadata.name.trim() : "";
  const css = isNonEmptyString(metadata.css) ? metadata.css.trim() : "";
  const version = isNonEmptyString(metadata.version) ? metadata.version.trim() : "";
  const description = isNonEmptyString(metadata.description) ? metadata.description.trim() : "";

  if (!name) {
    throw new Error(`Theme "${themeId}" metadata is missing a name.`);
  }
  if (!css) {
    throw new Error(`Theme "${themeId}" metadata is missing a CSS file reference.`);
  }
  if (!version) {
    throw new Error(`Theme "${themeId}" metadata is missing a version.`);
  }

  return { name, css, version, description };
}

function normalizeThemeId(themeId) {
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
