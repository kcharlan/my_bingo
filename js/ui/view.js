import { store } from "../state/store.js";
import {
  BOARD_SIZE,
  FREE_COORDINATE,
  createBoardFromWords,
  toggleCell,
  clearMarks,
  regenerateBoard,
  needsBootstrap,
} from "../logic/board.js";
import { evaluateBoardForBingo } from "../logic/bingo.js";
import { createModalController } from "./modals.js";
import { createAccessibilityManager } from "./a11y.js";
import { createThemeLoader } from "../theme/loader.js";
import { loadWordListFromFile, WordListError } from "../io/wordlist.js";

const PLACEHOLDER_WORDS = Object.freeze([
  "Innovation",
  "Synergy",
  "Alignment",
  "Momentum",
  "Resilience",
  "Focus",
  "Strategy",
  "Iteration",
  "Velocity",
  "Vision",
  "Execution",
  "Clarity",
  "Empathy",
  "Curiosity",
  "Growth",
  "Balance",
  "Insight",
  "Impact",
  "Harmony",
  "Catalyst",
  "Purpose",
  "Drive",
  "Integrity",
  "Collaboration",
]);

const REQUIRED_UNIQUE_WORDS = BOARD_SIZE * BOARD_SIZE - 1;
const WORD_LIST_SOURCES = Object.freeze({
  PLACEHOLDER: "placeholder",
  FILE: "file",
  RESTORED: "restored",
});

const THEME_CATALOG = Object.freeze([
  { id: "default", label: "Default (Light)" },
  { id: "high_contrast", label: "High Contrast" },
]);

const boardElement = document.getElementById("bingo-board");
const indicatorElement = document.querySelector(".bingo-indicator");
const indicatorHiddenCopy = indicatorElement?.querySelector(".visually-hidden");
const liveRegion = document.getElementById("sr-live-region");
const modalRoot = document.getElementById("modal-root");
const toolbar = document.querySelector(".toolbar");
const themeSelect = document.querySelector('.toolbar__select[data-action="theme-select"]');
const accessibility = createAccessibilityManager({
  boardElement,
  liveRegion,
  boardSize: BOARD_SIZE,
});
const themeLoader = createThemeLoader();

let appState = null;
let activeWordList = [...PLACEHOLDER_WORDS];
let activeWordListMetadata = null;
let activeWordListSource = WORD_LIST_SOURCES.PLACEHOLDER;
let hasShownMissingWordListModal = false;
let hasAttachedHandlers = false;
let modalController = null;
let lastGoodThemeId = themeLoader.getDefaultTheme().id;

function renderApp(options = {}) {
  const { preserveFocus = true } = options;

  if (boardElement && appState?.board) {
    renderBoard(boardElement, appState.board);
    accessibility.refresh({ preserveFocus });
  }

  updateIndicator();
}

function renderBoard(element, board) {
  element.setAttribute("aria-rowcount", String(BOARD_SIZE));
  element.setAttribute("aria-colcount", String(BOARD_SIZE));
  element.replaceChildren(...board.cells.map((cell) => createCell(cell)));
}

function createCell(cell) {
  const isFree = cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col;

  const node = document.createElement("button");
  node.type = "button";
  node.className = "board__cell";
  node.dataset.row = String(cell.row);
  node.dataset.col = String(cell.col);
  node.dataset.state = cell.marked ? "marked" : "unmarked";
  node.dataset.free = String(isFree);
  node.setAttribute("role", "gridcell");
  node.setAttribute("aria-rowindex", String(cell.row + 1));
  node.setAttribute("aria-colindex", String(cell.col + 1));
  node.setAttribute("aria-selected", cell.marked ? "true" : "false");
  node.title = isFree ? "Free space (always marked)" : cell.text;
  node.textContent = cell.text;

  if (isFree) {
    node.setAttribute("aria-disabled", "true");
  }

  return node;
}

function updateIndicator() {
  if (!indicatorElement || !appState?.bingo) {
    return;
  }

  const { hasBingo = false } = appState.bingo;
  indicatorElement.dataset.state = hasBingo ? "active" : "inactive";
  if (indicatorHiddenCopy) {
    indicatorHiddenCopy.textContent = hasBingo
      ? "Bingo indicator: at least one bingo is active."
      : "Bingo indicator: no bingo yet.";
  }
}

function primeLiveRegion(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
}

function setActiveWordList(words, metadata, source = WORD_LIST_SOURCES.PLACEHOLDER) {
  const sanitized = Array.isArray(words) ? words : [];
  const unique = [];
  const seen = new Set();

  for (const entry of sanitized) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLocaleLowerCase("en-US");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(trimmed);
  }

  if (unique.length < REQUIRED_UNIQUE_WORDS) {
    activeWordList = [...PLACEHOLDER_WORDS];
    activeWordListMetadata = null;
    activeWordListSource = WORD_LIST_SOURCES.PLACEHOLDER;
    return false;
  }

  activeWordList = unique;
  activeWordListMetadata =
    metadata && typeof metadata === "object"
      ? {
          filename: typeof metadata.filename === "string" ? metadata.filename : "",
          hash: typeof metadata.hash === "string" ? metadata.hash : "",
        }
      : null;
  activeWordListSource = source;
  if (source === WORD_LIST_SOURCES.FILE) {
    hasShownMissingWordListModal = false;
  }
  return true;
}

function deriveWordListFromBoard(board) {
  if (!board || !Array.isArray(board.cells)) {
    return [];
  }

  const candidates = [];
  for (const cell of board.cells) {
    if (!cell || typeof cell.text !== "string") {
      continue;
    }

    if (cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col) {
      continue;
    }
    candidates.push(cell.text);
  }
  return candidates;
}

function populateThemeOptions() {
  if (!themeSelect) {
    return;
  }

  const persistedThemeId = appState?.theme?.id ?? themeLoader.getDefaultTheme().id;
  const catalogEntries = [...THEME_CATALOG];

  if (!catalogEntries.some((entry) => entry.id === persistedThemeId)) {
    catalogEntries.push({
      id: persistedThemeId,
      label: `Saved theme (${persistedThemeId})`,
    });
  }

  const options = catalogEntries.map((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.label;
    return option;
  });

  themeSelect.replaceChildren(...options);
  themeSelect.value = persistedThemeId;
}

function launchWordListPicker() {
  console.info("[ui/view] Launching word list picker");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt,text/plain";
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  Object.assign(input.style, {
    position: "absolute",
    top: "-9999px",
    left: "-9999px",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });

  const handleChange = (event) => {
    handleWordListFileSelection(event);
    window.setTimeout(() => {
      input.removeEventListener("change", handleChange, false);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    }, 0);
  };

  input.addEventListener("change", handleChange, false);
  document.body.appendChild(input);

  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  } catch (error) {
    console.warn("[ui/view] showPicker threw, falling back to click", error);
    input.click();
  }
}

function ensureThemeSelectValue(themeId) {
  if (!themeSelect) {
    return;
  }
  themeSelect.value = themeId;
}

function ensureThemeOption(theme) {
  if (!themeSelect || !theme || !theme.id) {
    return;
  }

  let option = Array.from(themeSelect.options).find((item) => item.value === theme.id);

  if (!option) {
    option = document.createElement("option");
    option.value = theme.id;
    themeSelect.appendChild(option);
  }

  const label = theme.name && theme.name.trim().length > 0 ? theme.name : theme.id;
  option.textContent = label;
  ensureThemeSelectValue(theme.id);
}

async function handleWordListFileSelection(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const files = input.files;

  if (!files || files.length === 0) {
    console.info("[ui/view] No files selected from picker");
    accessibility.announce("No word list selected. Board unchanged.");
    return;
  }

  const [file] = files;
  try {
    console.info("[ui/view] Reading word list", file?.name ?? "(unknown)");
    const { words, metadata } = await loadWordListFromFile(file);
    applyLoadedWordList(words, metadata);
  } catch (error) {
    showWordListLoadError(error);
  } finally {
    input.value = "";
  }
}

function applyLoadedWordList(words, metadata) {
  const applied = setActiveWordList(words, metadata, WORD_LIST_SOURCES.FILE);
  if (!applied) {
    showWordListLoadError(
      new WordListError(
        "INSUFFICIENT_ENTRIES",
        "Selected word list does not contain enough unique entries."
      )
    );
    return;
  }

  try {
    const nextBoard = createBoardFromWords(activeWordList);
    updateState((draft) => {
      draft.board = nextBoard;
      applyBingoEvaluation(draft);
      draft.wordList = {
        filename: activeWordListMetadata?.filename ?? metadata?.filename ?? "",
        hash: activeWordListMetadata?.hash ?? metadata?.hash ?? "",
      };
    });
    renderApp({ preserveFocus: false });
    console.info(
      "[ui/view] Word list loaded",
      metadata?.filename ?? "word list",
      "entries:",
      metadata?.uniqueCount ?? activeWordList.length
    );
    accessibility.announce(
      `Loaded word list "${metadata?.filename ?? "word list"}" with ${metadata?.uniqueCount ?? activeWordList.length} entries.`
    );
  } catch (error) {
    console.error("[ui/view] Failed to regenerate board after word list load.", error);
    showWordListLoadError(error);
  }
}

function showWordListLoadError(error) {
  const message = describeWordListError(error);
  const title =
    error instanceof WordListError && error.code === "INVALID_ENCODING"
      ? "Invalid file encoding"
      : "Word list could not be loaded";

  console.warn("[ui/view] Word list load failed", { error });
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }

  if (modalController && typeof modalController.open === "function") {
    modalController.open({
      id: "modal-wordlist-error",
      title,
      body: message,
      primary: {
        label: "Choose Another File",
        onSelect: () => {
          launchWordListPicker();
          if (liveRegion) {
            liveRegion.textContent = "";
          }
        },
      },
      secondary: {
        label: "Cancel",
      },
      onClose: () => {
        if (liveRegion) {
          liveRegion.textContent = "";
        }
      },
    });
  }

  accessibility.announce("Unable to load the selected word list. Board remains unchanged.");
}

function describeWordListError(error) {
  if (error instanceof WordListError) {
    switch (error.code) {
      case "INVALID_SOURCE":
        return "The selected file could not be read. Please choose a valid text file.";
      case "READ_FAILED":
        return "We couldn't read that file. Make sure it is accessible and try again.";
      case "INVALID_ENCODING":
        return "Word lists must be saved as UTF-8 text files.";
      case "INVALID_CONTENT":
        return "The word list contains invalid content. Provide a plain text file with one entry per line.";
      case "INVALID_CHARACTERS":
        return "Word list entries must not include emoji or control characters. Edit the file and try again.";
      case "INSUFFICIENT_ENTRIES":
        return `Word lists must contain at least ${REQUIRED_UNIQUE_WORDS} unique entries.`;
      default:
        return "The word list could not be processed. Please review the file and try again.";
    }
  }

  return "An unexpected error occurred while loading the word list. Please try again.";
}

function showMissingWordListModal() {
  if (hasShownMissingWordListModal) {
    return;
  }
  if (!modalController || typeof modalController.open !== "function") {
    return;
  }

  const filename =
    activeWordListMetadata?.filename?.trim().length > 0 ? activeWordListMetadata.filename : null;
  if (!filename) {
    return;
  }

  hasShownMissingWordListModal = true;

  modalController.open({
    id: "modal-wordlist-missing",
    title: "Word list needs attention",
    body: `We couldn't automatically reload "${filename}". You can keep playing with the current board, but choose the file again to regenerate new boards.`,
    primary: {
      label: "Choose File",
      onSelect: () => {
        launchWordListPicker();
        if (liveRegion) {
          liveRegion.textContent = "";
        }
      },
    },
    secondary: {
      label: "Not Now",
    },
    onClose: () => {
      if (liveRegion) {
        liveRegion.textContent = "";
      }
    },
  });

  if (liveRegion) {
    liveRegion.textContent =
      "Saved word list could not be restored automatically. Prompt opened to choose the file again.";
  }

  accessibility.announce(
    `Saved word list "${filename}" needs to be re-selected to regenerate boards.`
  );
}

function initializeTheme() {
  const desiredThemeId = appState?.theme?.id ?? themeLoader.getDefaultTheme().id;
  return loadThemeById(desiredThemeId, { announce: false }).catch((error) => {
    console.error(`[ui/view] Failed to apply saved theme "${desiredThemeId}".`, error);

    if (desiredThemeId !== themeLoader.getDefaultTheme().id) {
      showThemeError(
        `The saved theme "${desiredThemeId}" could not be loaded. The default theme has been applied instead.`
      );
      accessibility.announce("Default theme restored after failing to load the saved theme.");
    }

    ensureThemeSelectValue(themeLoader.getDefaultTheme().id);
    return loadThemeById(themeLoader.getDefaultTheme().id, { announce: false }).catch(
      (fallbackError) => {
        console.error("[ui/view] Failed to apply the default theme.", fallbackError);
        return themeLoader.getDefaultTheme();
      }
    );
  });
}

async function loadThemeById(themeId, options = {}) {
  const { announce = false, recordAsLastGood = true } = options;
  const requestedThemeId =
    typeof themeId === "string" && themeId.trim().length > 0
      ? themeId.trim()
      : themeLoader.getDefaultTheme().id;

  const appliedTheme = await themeLoader.load(requestedThemeId);
  ensureThemeOption(appliedTheme);

  const currentTheme = appState?.theme ?? null;
  if (
    !currentTheme ||
    currentTheme.id !== appliedTheme.id ||
    currentTheme.version !== appliedTheme.version
  ) {
    updateState((draft) => {
      draft.theme = {
        id: appliedTheme.id,
        version: appliedTheme.version,
      };
    });
  }

  if (recordAsLastGood) {
    lastGoodThemeId = appliedTheme.id;
  }

  if (announce) {
    accessibility.announce(`Theme switched to ${appliedTheme.name}.`);
  }

  return appliedTheme;
}

async function handleThemeSelection(themeId) {
  const previousThemeId = appState?.theme?.id ?? lastGoodThemeId;

  try {
    const theme = await loadThemeById(themeId, { announce: true });
    ensureThemeSelectValue(theme.id);
  } catch (error) {
    console.error(`[ui/view] Failed to load theme "${themeId}".`, error);
    ensureThemeSelectValue(previousThemeId);
    showThemeError(
      `The theme "${themeId}" could not be loaded. The previous theme has been restored.`
    );
    accessibility.announce("Theme selection failed. Previous theme restored.");

    try {
      if (previousThemeId) {
        await loadThemeById(previousThemeId, { announce: false });
        ensureThemeSelectValue(previousThemeId);
        return;
      }
    } catch (restoreError) {
      console.error(
        `[ui/view] Failed to restore previous theme "${previousThemeId}".`,
        restoreError
      );
    }

    const fallback = themeLoader.reset();
    lastGoodThemeId = fallback.id;
    ensureThemeOption(fallback);
    ensureThemeSelectValue(fallback.id);
    updateState((draft) => {
      draft.theme = { id: fallback.id, version: fallback.version };
    });
    accessibility.announce("Default theme restored after theme load failure.");
  }
}

function showThemeError(message) {
  if (modalController && typeof modalController.open === "function") {
    modalController.open({
      id: "modal-theme-error",
      title: "Theme failed to load",
      body: message,
      primary: {
        label: "Continue",
        onSelect: () => {
          if (liveRegion) {
            liveRegion.textContent = "";
          }
        },
      },
      onClose: () => {
        if (liveRegion) {
          liveRegion.textContent = "";
        }
      },
    });
    return;
  }

  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
}

function init() {
  modalController = createModalController({ container: modalRoot });
  setupCorruptionHandler(modalController, liveRegion);
  const loadResult = hydrateStateStore();
  appState = loadResult.state;
  synchronizeBingoState();

  populateThemeOptions();
  initializeTheme().catch((error) => {
    console.error("[ui/view] Theme initialization failed.", error);
  });

  if (loadResult.status === "fresh" || needsBootstrap(appState.board)) {
    bootstrapBoard();
  }

  renderApp({ preserveFocus: false });
  primeLiveRegion(liveRegion);
  attachEventHandlers();
  restoreWordListPrompt(loadResult.status);
}

function hydrateStateStore() {
  try {
    const result = store.load();
    restoreWordListContext(result.state);
    return result;
  } catch (error) {
    console.error("[ui/view] Failed to hydrate initial state store.", error);
    const fallback = store.getDefaultState();
    restoreWordListContext(fallback);
    return { state: fallback, status: "reset" };
  }
}

function bootstrapBoard() {
  try {
    setActiveWordList(PLACEHOLDER_WORDS, null, WORD_LIST_SOURCES.PLACEHOLDER);
    const board = createBoardFromWords(activeWordList);
    updateState((draft) => {
      draft.board = board;
      applyBingoEvaluation(draft);
      draft.wordList = {
        filename: "",
        hash: "",
      };
    });
    accessibility.announce("A starter bingo board has been generated with placeholder content.");
  } catch (error) {
    console.error("[ui/view] Unable to bootstrap board.", error);
  }
}

function updateState(mutator) {
  if (!appState) {
    appState = store.getDefaultState();
  }

  const draft = {
    ...appState,
    board: {
      ...appState.board,
      cells: appState.board?.cells?.map((cell) => ({ ...cell })) ?? [],
    },
    bingo: { ...(appState.bingo ?? { hasBingo: false }) },
    wordList: { ...(appState.wordList ?? { filename: "", hash: "" }) },
  };

  mutator(draft);

  try {
    appState = store.save(draft);
  } catch (error) {
    console.error("[ui/view] Failed to persist state.", error);
  }
}

function attachEventHandlers() {
  if (hasAttachedHandlers) {
    return;
  }

  if (boardElement) {
    boardElement.addEventListener("click", handleBoardClick);
  }

  if (toolbar) {
    toolbar.addEventListener("click", handleToolbarClick);
    toolbar.addEventListener("change", handleToolbarChange);
  }

  hasAttachedHandlers = true;
}

function handleBoardClick(event) {
  const rawTarget = event.target;
  if (!(rawTarget instanceof HTMLElement)) {
    return;
  }

  const target = rawTarget.closest(".board__cell");
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const row = Number.parseInt(target.dataset.row ?? "", 10);
  const col = Number.parseInt(target.dataset.col ?? "", 10);
  const isFree = target.dataset.free === "true";

  if (Number.isNaN(row) || Number.isNaN(col) || isFree) {
    return;
  }

  const hadBingo = Boolean(appState?.bingo?.hasBingo);

  updateState((draft) => {
    draft.board = toggleCell(draft.board, row, col);
    applyBingoEvaluation(draft);
  });

  renderApp();
  accessibility.focusCell(row, col, { preventScroll: true });

  const refreshedCell = boardElement?.querySelector(
    `.board__cell[data-row="${row}"][data-col="${col}"]`
  );
  const cellState = refreshedCell?.dataset.state === "marked" ? "marked" : "unmarked";
  const cellLabel = refreshedCell?.textContent?.trim() || "cell";
  const hasBingo = Boolean(appState?.bingo?.hasBingo);
  let announcement = `Cell "${cellLabel}" ${cellState}.`;
  if (!hadBingo && hasBingo) {
    announcement += " Bingo achieved!";
  } else if (hadBingo && !hasBingo) {
    announcement += " Bingo cleared.";
  }
  accessibility.announce(announcement);
}

function handleToolbarClick(event) {
  const rawTarget = event.target;
  if (!(rawTarget instanceof HTMLElement)) {
    return;
  }

  const actionTarget = rawTarget.closest("[data-action]");
  if (!(actionTarget instanceof HTMLElement)) {
    return;
  }

  const action = actionTarget.dataset.action;
  if (!action) {
    return;
  }

  console.info("[ui/view] Toolbar click action:", action);

  if (action === "clear") {
    updateState((draft) => {
      draft.board = clearMarks(draft.board);
      applyBingoEvaluation(draft);
    });
    renderApp();
    accessibility.announce("All marks cleared. Free space remains marked.");
    return;
  }

  if (action === "regenerate") {
    try {
      if (activeWordListSource === WORD_LIST_SOURCES.RESTORED && !hasShownMissingWordListModal) {
        showMissingWordListModal();
      }

      const nextBoard = regenerateBoard(activeWordList);
      updateState((draft) => {
        draft.board = nextBoard;
        applyBingoEvaluation(draft);
      });
      renderApp();
      accessibility.announce("Board regenerated with the current word list.");
    } catch (error) {
      console.error("[ui/view] Unable to regenerate board.", error);
      if (!modalController?.isOpen || !modalController.isOpen()) {
        showWordListLoadError(error);
      }
    }
    return;
  }

  if (action === "load-list") {
    launchWordListPicker();
    accessibility.announce("File chooser opened. Select a text file with at least 24 entries.");
  }
}

function handleToolbarChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const isSelectElement =
    (typeof HTMLSelectElement !== "undefined" && target instanceof HTMLSelectElement) ||
    target.tagName === "SELECT";

  if (!isSelectElement) {
    return;
  }

  if (target.dataset.action !== "theme-select") {
    return;
  }

  const themeId =
    typeof target.value === "string" ? target.value : String(target.getAttribute("value") ?? "");
  handleThemeSelection(themeId);
}

function applyBingoEvaluation(draft) {
  try {
    draft.bingo = evaluateBoardForBingo(draft.board);
  } catch (error) {
    console.error("[ui/view] Failed to evaluate bingo state.", error);
    draft.bingo = { hasBingo: false, lineCount: 0, lines: [] };
  }
}

function restoreWordListContext(state) {
  if (!state) {
    setActiveWordList(PLACEHOLDER_WORDS, null, WORD_LIST_SOURCES.PLACEHOLDER);
    return;
  }

  const metadata =
    state.wordList && typeof state.wordList === "object"
      ? {
          filename: typeof state.wordList.filename === "string" ? state.wordList.filename : "",
          hash: typeof state.wordList.hash === "string" ? state.wordList.hash : "",
        }
      : null;

  const derived = deriveWordListFromBoard(state.board);
  if (derived.length >= REQUIRED_UNIQUE_WORDS && metadata && metadata.filename) {
    setActiveWordList(derived, metadata, WORD_LIST_SOURCES.RESTORED);
    return;
  }

  if (derived.length >= REQUIRED_UNIQUE_WORDS) {
    setActiveWordList(derived, null, WORD_LIST_SOURCES.PLACEHOLDER);
    return;
  }

  setActiveWordList(
    PLACEHOLDER_WORDS,
    metadata && metadata.filename ? metadata : null,
    WORD_LIST_SOURCES.PLACEHOLDER
  );
}

function restoreWordListPrompt(loadStatus) {
  if (loadStatus !== "loaded") {
    return;
  }

  const hasFilename = Boolean(activeWordListMetadata?.filename);
  if (activeWordListSource === WORD_LIST_SOURCES.RESTORED && hasFilename) {
    hasShownMissingWordListModal = false;
    showMissingWordListModal();
  }
}

function synchronizeBingoState() {
  if (!appState?.board) {
    return;
  }

  let evaluation;
  try {
    evaluation = evaluateBoardForBingo(appState.board);
  } catch (error) {
    console.error("[ui/view] Unable to evaluate bingo state during initialization.", error);
    return;
  }

  const currentLineCount = Array.isArray(appState.bingo?.lines) ? appState.bingo.lines.length : 0;

  if (
    !appState.bingo ||
    appState.bingo.hasBingo !== evaluation.hasBingo ||
    currentLineCount !== evaluation.lines.length
  ) {
    updateState((draft) => {
      draft.bingo = evaluation;
    });
    return;
  }

  appState = { ...appState, bingo: evaluation };
}

function setupCorruptionHandler(modals, liveRegionContainer) {
  store.subscribe("corruption", (event) => {
    const reason = event?.reason ? String(event.reason) : "unknown reason";

    if (liveRegionContainer) {
      liveRegionContainer.textContent =
        "Saved bingo data was reset due to corruption. The board has been restored to defaults.";
    }

    if (!modals || typeof modals.open !== "function") {
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(
          `Saved bingo data was reset due to corruption. (${reason}). Default settings have been restored.`
        );
      }
      return;
    }

    modals.open({
      id: "modal-corruption-reset",
      title: "Saved data reset",
      body: `The stored game state could not be read (${reason}). Default settings have been restored.`,
      primary: {
        label: "Continue",
        onSelect: () => {
          if (liveRegionContainer) {
            liveRegionContainer.textContent = "";
          }
        },
      },
      onClose: () => {
        if (liveRegionContainer) {
          liveRegionContainer.textContent = "";
        }
      },
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
