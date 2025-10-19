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
let hasAttachedHandlers = false;
let modalController = null;

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
  const { announce = false } = options;
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

  if (announce) {
    accessibility.announce(`Theme switched to ${appliedTheme.name}.`);
  }

  return appliedTheme;
}

function handleThemeSelection(themeId) {
  const previousThemeId = appState?.theme?.id ?? themeLoader.getDefaultTheme().id;

  loadThemeById(themeId, { announce: true })
    .then((theme) => {
      ensureThemeSelectValue(theme.id);
    })
    .catch((error) => {
      console.error(`[ui/view] Failed to load theme "${themeId}".`, error);
      ensureThemeSelectValue(previousThemeId);
      showThemeError(
        `The theme "${themeId}" could not be loaded. The previous theme has been restored.`
      );
      accessibility.announce("Theme selection failed. Previous theme restored.");
    });
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
}

function hydrateStateStore() {
  try {
    return store.load();
  } catch (error) {
    console.error("[ui/view] Failed to hydrate initial state store.", error);
    return { state: store.getDefaultState(), status: "reset" };
  }
}

function bootstrapBoard() {
  try {
    const board = createBoardFromWords(activeWordList);
    updateState((draft) => {
      draft.board = board;
      applyBingoEvaluation(draft);
      draft.wordList = {
        filename: draft.wordList?.filename || "placeholder.txt",
        hash: draft.wordList?.hash || "placeholder-list",
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
  const target = event.target;
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
  const actionTarget = event.target;
  if (!(actionTarget instanceof HTMLElement)) {
    return;
  }

  const action = actionTarget.dataset.action;
  if (!action) {
    return;
  }

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
      const nextBoard = regenerateBoard(activeWordList);
      updateState((draft) => {
        draft.board = nextBoard;
        applyBingoEvaluation(draft);
      });
      renderApp();
      accessibility.announce("Board regenerated with the current word list.");
    } catch (error) {
      console.error("[ui/view] Unable to regenerate board.", error);
    }
    return;
  }

  if (action === "load-list") {
    accessibility.announce(
      "Loading a new list will be available once the file handling flow is implemented."
    );
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
