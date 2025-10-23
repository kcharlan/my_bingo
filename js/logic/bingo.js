import { BOARD_SIZE } from "./board.js";

function createLineDefinitions(size) {
  const lines = [];

  for (let row = 0; row < size; row += 1) {
    lines.push({
      id: `row-${row}`,
      type: "row",
      index: row,
      cells: Array.from({ length: size }, (_, col) => Object.freeze({ row, col })),
    });
  }

  for (let col = 0; col < size; col += 1) {
    lines.push({
      id: `column-${col}`,
      type: "column",
      index: col,
      cells: Array.from({ length: size }, (_, row) => Object.freeze({ row, col })),
    });
  }

  lines.push({
    id: "diagonal-0",
    type: "diagonal",
    index: 0,
    cells: Array.from({ length: size }, (_, i) => Object.freeze({ row: i, col: i })),
  });

  lines.push({
    id: "diagonal-1",
    type: "diagonal",
    index: 1,
    cells: Array.from({ length: size }, (_, i) => Object.freeze({ row: i, col: size - 1 - i })),
  });

  return lines.map((line) =>
    Object.freeze({
      ...line,
      cells: Object.freeze(line.cells),
    })
  );
}

const LINE_DEFINITIONS = Object.freeze(createLineDefinitions(BOARD_SIZE));

function createMarkedMatrix(board) {
  if (!board || typeof board !== "object" || !Array.isArray(board.cells)) {
    throw new TypeError("A board with a cells array is required to evaluate bingo.");
  }

  const matrix = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );

  for (const cell of board.cells) {
    if (!cell || typeof cell !== "object") {
      continue;
    }

    const { row, col } = cell;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE
    ) {
      continue;
    }

    matrix[row][col] = Boolean(cell.marked);
  }

  return matrix;
}

function cloneLineCells(line) {
  return line.cells.map((coord) => ({ row: coord.row, col: coord.col }));
}

function isLineComplete(markMatrix, line) {
  return line.cells.every(({ row, col }) => markMatrix[row]?.[col] === true);
}

export function evaluateBoardForBingo(board) {
  const markMatrix = createMarkedMatrix(board);
  const completed = [];

  for (const line of LINE_DEFINITIONS) {
    if (isLineComplete(markMatrix, line)) {
      completed.push({
        id: line.id,
        type: line.type,
        index: line.index,
        cells: cloneLineCells(line),
      });
    }
  }

  return {
    hasBingo: completed.length > 0,
    lineCount: completed.length,
    lines: completed,
  };
}

export function hasBingo(board) {
  return evaluateBoardForBingo(board).hasBingo;
}

export { LINE_DEFINITIONS };
