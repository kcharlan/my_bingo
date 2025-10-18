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
  renderBoard(boardElement);
  primeIndicator(indicatorElement);
  primeLiveRegion(liveRegion);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
