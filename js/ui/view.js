import { store } from "../state/store.js";

const BOARD_SIZE = 5;
const FREE_COORDINATE = Object.freeze({ row: 2, col: 2 });
const REQUIRED_NON_FREE_CELLS = BOARD_SIZE * BOARD_SIZE - 1;

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

function renderBoard(element) {
  if (!element) {
    return;
  }

  element.setAttribute("aria-rowcount", String(BOARD_SIZE));
  element.setAttribute("aria-colcount", String(BOARD_SIZE));
  element.replaceChildren();

  const words = preparePlaceholderWords();
  let wordIndex = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const isFree = row === FREE_COORDINATE.row && col === FREE_COORDINATE.col;
      const text = isFree ? "Free" : words[wordIndex++];
      const cell = createCell({ row, col, text, isFree });
      element.appendChild(cell);
    }
  }
}

function preparePlaceholderWords() {
  if (PLACEHOLDER_WORDS.length >= REQUIRED_NON_FREE_CELLS) {
    return PLACEHOLDER_WORDS.slice(0, REQUIRED_NON_FREE_CELLS);
  }

  const fallbackWords = [];
  for (let index = 0; index < REQUIRED_NON_FREE_CELLS; index += 1) {
    fallbackWords.push(`Cell ${index + 1}`);
  }
  return fallbackWords;
}

function createCell({ row, col, text, isFree }) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "board__cell";
  cell.dataset.row = String(row);
  cell.dataset.col = String(col);
  cell.dataset.state = isFree ? "marked" : "unmarked";
  cell.dataset.free = String(isFree);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-rowindex", String(row + 1));
  cell.setAttribute("aria-colindex", String(col + 1));
  cell.setAttribute("aria-selected", isFree ? "true" : "false");
  cell.title = isFree ? "Free space (always marked)" : text;
  cell.textContent = text;

  if (isFree) {
    cell.setAttribute("aria-disabled", "true");
  }

  return cell;
}

function primeIndicator(element) {
  if (!element) {
    return;
  }

  element.dataset.state = "inactive";
  if (indicatorHiddenCopy) {
    indicatorHiddenCopy.textContent = "Bingo indicator: no bingo yet.";
  }
}

function primeLiveRegion(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
}

function init() {
  hydrateStateStore();
  setupCorruptionHandler(modalRoot, liveRegion);
  renderBoard(boardElement);
  primeIndicator(indicatorElement);
  primeLiveRegion(liveRegion);
}

function hydrateStateStore() {
  try {
    store.load();
  } catch (error) {
    console.error("[ui/view] Failed to hydrate initial state store.", error);
  }
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
    if (dismissButton) {
      dismissButton.focus();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
