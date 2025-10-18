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

const boardElement = document.getElementById("bingo-board");
const indicatorElement = document.querySelector(".bingo-indicator");
const indicatorHiddenCopy = indicatorElement?.querySelector(".visually-hidden");
const liveRegion = document.getElementById("sr-live-region");
const modalRoot = document.getElementById("modal-root");
const toolbar = document.querySelector(".toolbar");

let appState = null;
let activeWordList = [...PLACEHOLDER_WORDS];
let hasAttachedHandlers = false;

function renderApp() {
  if (boardElement && appState?.board) {
    renderBoard(boardElement, appState.board);
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

function init() {
  setupCorruptionHandler(modalRoot, liveRegion);

  const loadResult = hydrateStateStore();
  appState = loadResult.state;

  if (loadResult.status === "fresh" || needsBootstrap(appState.board)) {
    bootstrapBoard();
  }

  renderApp();
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
      draft.bingo = { hasBingo: false };
      draft.wordList = {
        filename: draft.wordList?.filename || "placeholder.txt",
        hash: draft.wordList?.hash || "placeholder-list",
      };
    });
    announce("A starter bingo board has been generated with placeholder content.");
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

  updateState((draft) => {
    draft.board = toggleCell(draft.board, row, col);
    draft.bingo = { hasBingo: false };
  });

  renderApp();
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
      draft.bingo = { hasBingo: false };
    });
    renderApp();
    announce("All marks cleared. Free space remains marked.");
    return;
  }

  if (action === "regenerate") {
    try {
      const nextBoard = regenerateBoard(activeWordList);
      updateState((draft) => {
        draft.board = nextBoard;
        draft.bingo = { hasBingo: false };
      });
      renderApp();
      announce("Board regenerated with the current word list.");
    } catch (error) {
      console.error("[ui/view] Unable to regenerate board.", error);
    }
    return;
  }

  if (action === "load-list") {
    announce("Loading a new list will be available once the file handling flow is implemented.");
  }
}

function announce(message) {
  if (!liveRegion) {
    return;
  }
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
}

function setupCorruptionHandler(modalContainer, liveRegionContainer) {
  store.subscribe("corruption", (event) => {
    if (liveRegionContainer) {
      liveRegionContainer.textContent =
        "Saved bingo data was reset due to corruption. The board has been restored to defaults.";
    }

    if (!modalContainer || modalContainer.querySelector("[data-modal='corruption-placeholder']")) {
      return;
    }

    const placeholderModal = document.createElement("div");
    placeholderModal.dataset.modal = "corruption-placeholder";
    placeholderModal.className = "modal-placeholder";
    placeholderModal.setAttribute("role", "alertdialog");
    placeholderModal.setAttribute("aria-live", "assertive");
    placeholderModal.setAttribute("aria-modal", "true");

    placeholderModal.innerHTML = `
      <div class="modal-placeholder__content">
        <h2 class="modal-placeholder__title">Saved data reset</h2>
        <p class="modal-placeholder__body">
          The stored game state could not be read (${event?.reason ?? "unknown reason"}).
          Default settings have been restored. This placeholder notice will be replaced
          with the full modal experience in a later task.
        </p>
        <button type="button" class="modal-placeholder__dismiss">Dismiss</button>
      </div>
    `;

    const dismissButton = placeholderModal.querySelector(".modal-placeholder__dismiss");
    if (dismissButton) {
      dismissButton.addEventListener("click", () => {
        placeholderModal.remove();
        if (liveRegionContainer) {
          liveRegionContainer.textContent = "";
        }
      });
    }

    modalContainer.appendChild(placeholderModal);
    if (dismissButton instanceof HTMLElement) {
      dismissButton.focus();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
