const BOARD_SIZE = 5;
const BOARD_CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const FREE_COORDINATE = Object.freeze({ row: 2, col: 2 });
const FREE_TEXT = "Free";

function ensureArrayOfStrings(words) {
  if (!Array.isArray(words)) {
    throw new TypeError("Word list must be an array of strings.");
  }

  return words.map((word, index) => {
    if (typeof word !== "string") {
      throw new TypeError(`Word at index ${index} is not a string.`);
    }

    const trimmed = word.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  });
}

function createUniqueWordPool(words) {
  const normalized = ensureArrayOfStrings(words);
  const seen = new Set();
  const pool = [];

  for (const entry of normalized) {
    if (!entry) {
      continue;
    }

    const signature = entry.toLocaleLowerCase("en-US");
    if (!seen.has(signature)) {
      seen.add(signature);
      pool.push(entry);
    }
  }

  return pool;
}

function shuffleInPlace(values, rng) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
  return values;
}

function defaultRng() {
  return Math.random();
}

export function createEmptyBoard() {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const isFree = row === FREE_COORDINATE.row && col === FREE_COORDINATE.col;
      cells.push({
        row,
        col,
        text: isFree ? FREE_TEXT : "",
        marked: isFree,
      });
    }
  }

  return {
    size: BOARD_SIZE,
    free: { ...FREE_COORDINATE },
    cells,
  };
}

export function createBoardFromWords(words, options = {}) {
  const { rng = defaultRng } = options;
  const pool = createUniqueWordPool(words);

  if (pool.length < BOARD_CELL_COUNT - 1) {
    throw new Error(
      `At least ${BOARD_CELL_COUNT - 1} unique words are required to generate a board.`
    );
  }

  const shuffled = shuffleInPlace([...pool], rng);
  const selected = shuffled.slice(0, BOARD_CELL_COUNT - 1);
  const board = createEmptyBoard();
  let cursor = 0;

  board.cells = board.cells.map((cell) => {
    if (cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col) {
      return cell;
    }

    return {
      ...cell,
      text: selected[cursor++],
      marked: false,
    };
  });

  return board;
}

function cloneBoard(board) {
  return {
    size: board.size,
    free: { ...board.free },
    cells: board.cells.map((cell) => ({ ...cell })),
  };
}

function getCellIndex(row, col) {
  return row * BOARD_SIZE + col;
}

export function toggleCell(board, row, col) {
  if (!board || typeof board !== "object") {
    throw new TypeError("Board object is required.");
  }

  if (row === FREE_COORDINATE.row && col === FREE_COORDINATE.col) {
    return cloneBoard(board);
  }

  const index = getCellIndex(row, col);
  const nextBoard = cloneBoard(board);
  const target = nextBoard.cells[index];

  if (!target) {
    throw new RangeError("Cell coordinates are out of bounds.");
  }

  if (target.row !== row || target.col !== col) {
    // Guard against malformed cell ordering.
    nextBoard.cells = nextBoard.cells.map((cell) => {
      if (cell.row === row && cell.col === col) {
        return { ...cell, marked: !cell.marked };
      }
      return cell;
    });
    return nextBoard;
  }

  nextBoard.cells[index] = { ...target, marked: !target.marked };
  return nextBoard;
}

export function clearMarks(board) {
  if (!board || typeof board !== "object") {
    throw new TypeError("Board object is required.");
  }

  const nextBoard = cloneBoard(board);
  nextBoard.cells = nextBoard.cells.map((cell) => {
    if (cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col) {
      return { ...cell, marked: true };
    }

    return { ...cell, marked: false };
  });

  return nextBoard;
}

export function regenerateBoard(words, options = {}) {
  return createBoardFromWords(words, options);
}

export function needsBootstrap(board) {
  if (!board || typeof board !== "object" || !Array.isArray(board.cells)) {
    return true;
  }

  return board.cells.some((cell) => {
    if (cell.row === FREE_COORDINATE.row && cell.col === FREE_COORDINATE.col) {
      return false;
    }
    return !cell.text;
  });
}

export { BOARD_SIZE, BOARD_CELL_COUNT, FREE_COORDINATE, FREE_TEXT };
