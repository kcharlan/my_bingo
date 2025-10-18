const DEFAULT_BOARD_SIZE = 5;
const CELL_SELECTOR = "button.board__cell";
const ARROW_KEY_TO_DELTAS = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

export function createAccessibilityManager({
  boardElement,
  liveRegion,
  boardSize = DEFAULT_BOARD_SIZE,
} = {}) {
  if (!boardElement) {
    return createNoopManager(liveRegion);
  }

  const state = {
    boardSize: Number.isInteger(boardSize) && boardSize > 0 ? boardSize : DEFAULT_BOARD_SIZE,
    boardElement,
    liveRegion: liveRegion ?? null,
    focus: { row: 0, col: 0 },
    announceTimeout: null,
  };

  boardElement.addEventListener("focusin", (event) => {
    const coords = extractCoordinates(event.target);
    if (coords) {
      state.focus = coords;
      applyRovingTabindex(state);
    }
  });

  boardElement.addEventListener("click", (event) => {
    const coords = extractCoordinates(event.target);
    if (coords) {
      state.focus = coords;
      applyRovingTabindex(state);
    }
  });

  boardElement.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const delta = ARROW_KEY_TO_DELTAS[event.key];
    if (!delta) {
      return;
    }

    const coords = extractCoordinates(event.target);
    if (!coords) {
      return;
    }

    const next = {
      row: clamp(coords.row + delta.row, 0, state.boardSize - 1),
      col: clamp(coords.col + delta.col, 0, state.boardSize - 1),
    };

    if (next.row === coords.row && next.col === coords.col) {
      return;
    }

    event.preventDefault();
    focusCell(state, next);
  });

  return {
    refresh(options = {}) {
      applyRovingTabindex(state);
      syncAriaSelected(state);

      if (options.preserveFocus !== true) {
        return;
      }

      if (!state.boardElement.contains(document.activeElement)) {
        return;
      }

      focusCell(state, state.focus, { preventScroll: true, resume: true });
    },

    focusCell(row, col, options = {}) {
      focusCell(state, { row, col }, options);
    },

    announce(message) {
      announce(state, message);
    },
  };
}

function createNoopManager(liveRegion) {
  return {
    refresh() {},
    focusCell() {},
    announce: (message) => {
      if (!(liveRegion instanceof HTMLElement) || !message) {
        return;
      }

      liveRegion.textContent = "";
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 50);
    },
  };
}

function extractCoordinates(node) {
  if (!(node instanceof HTMLElement)) {
    return null;
  }

  if (!node.matches(CELL_SELECTOR)) {
    return null;
  }

  const row = Number.parseInt(node.dataset.row ?? "", 10);
  const col = Number.parseInt(node.dataset.col ?? "", 10);

  if (Number.isNaN(row) || Number.isNaN(col)) {
    return null;
  }

  return { row, col };
}

function applyRovingTabindex(state) {
  const cells = getCells(state.boardElement);
  if (cells.length === 0) {
    return;
  }

  let activeCell = null;
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (activeElement && state.boardElement.contains(activeElement)) {
    const coords = extractCoordinates(activeElement);
    if (coords) {
      state.focus = coords;
    }
  }

  cells.forEach((cell) => {
    cell.tabIndex = -1;
    if (!activeCell) {
      const coords = extractCoordinates(cell);
      if (coords && coords.row === state.focus.row && coords.col === state.focus.col) {
        activeCell = cell;
      }
    }
  });

  if (!activeCell) {
    activeCell = cells[0];
    const coords = extractCoordinates(activeCell);
    if (coords) {
      state.focus = coords;
    }
  }

  activeCell.tabIndex = 0;
}

function focusCell(state, coordinate, options = {}) {
  if (!coordinate) {
    return;
  }

  const row = clamp(coordinate.row, 0, state.boardSize - 1);
  const col = clamp(coordinate.col, 0, state.boardSize - 1);
  const target = state.boardElement.querySelector(
    `${CELL_SELECTOR}[data-row="${row}"][data-col="${col}"]`
  );

  if (!(target instanceof HTMLElement)) {
    return;
  }

  state.focus = { row, col };
  applyRovingTabindex(state);

  try {
    target.focus({ preventScroll: options.preventScroll === true || options.resume === true });
  } catch {
    target.focus();
  }
}

function syncAriaSelected(state) {
  for (const cell of getCells(state.boardElement)) {
    const isMarked = cell.dataset.state === "marked";
    cell.setAttribute("aria-selected", isMarked ? "true" : "false");
  }
}

function announce(state, message) {
  if (!state.liveRegion || !(state.liveRegion instanceof HTMLElement) || !message) {
    return;
  }

  if (state.announceTimeout !== null) {
    clearTimeout(state.announceTimeout);
  }

  state.liveRegion.textContent = "";
  state.announceTimeout = setTimeout(() => {
    state.liveRegion.textContent = message;
    state.announceTimeout = null;
  }, 50);
}

function getCells(boardElement) {
  return boardElement ? Array.from(boardElement.querySelectorAll(CELL_SELECTOR)) : [];
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
