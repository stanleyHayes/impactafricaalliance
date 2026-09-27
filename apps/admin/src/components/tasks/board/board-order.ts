import {
  boardOrderBetween,
  type TaskBoard,
  type TaskBoardColumn,
  type TaskListItem,
  type TaskStatus,
} from '@iaa/shared';

/**
 * Where a card lands on the board, worked out from where it was dropped or
 * which button was pressed. Only the moved card gets a new `boardOrder`, the
 * midpoint of its new neighbours (plan D13), so a move is one idempotent
 * request whatever happens to the rest of the column.
 */

export interface BoardPosition {
  status: TaskStatus;
  boardOrder: number;
}

/** Drop targets carry this prefix so a column is never mistaken for a card. */
export const COLUMN_ID_PREFIX = 'column:';

export const columnDropId = (status: TaskStatus): string => `${COLUMN_ID_PREFIX}${status}`;

const columnOfCard = (board: TaskBoard, cardId: string): TaskBoardColumn | undefined =>
  board.columns.find((column) => column.items.some((item) => item.id === cardId));

/** The position between the cards either side of `index` in a column (the moved card left out). */
export const orderAt = (items: readonly TaskListItem[], index: number): number =>
  boardOrderBetween(items[index - 1]?.boardOrder, items[index]?.boardOrder);

/**
 * The position for a card dropped on another card or on a column.
 *
 * Dropped on a card in its own column, it takes that card's place, going
 * below it when moving down and above it when moving up, which is where the
 * list showed the gap while dragging. Dropped on a card in another column, it
 * goes above that card; dropped on a column, at the bottom of what is shown.
 * Null when the card would end up exactly where it started.
 */
export const planDrop = (
  board: TaskBoard,
  cardId: string,
  overId: string,
): BoardPosition | null => {
  const source = columnOfCard(board, cardId);
  // Over itself: picked up and put straight back down.
  if (!source || overId === cardId) return null;
  const sourceIndex = source.items.findIndex((item) => item.id === cardId);

  const target = overId.startsWith(COLUMN_ID_PREFIX)
    ? board.columns.find((column) => columnDropId(column.status) === overId)
    : columnOfCard(board, overId);
  if (!target) return null;

  const others = target.items.filter((item) => item.id !== cardId);
  let index = others.length;
  if (!overId.startsWith(COLUMN_ID_PREFIX)) {
    const overIndex = others.findIndex((item) => item.id === overId);
    const overOriginal = target.items.findIndex((item) => item.id === overId);
    const movingDown = target.status === source.status && sourceIndex < overOriginal;
    index = movingDown ? overIndex + 1 : overIndex;
  }
  if (target.status === source.status && index === sourceIndex) return null;
  return { status: target.status, boardOrder: orderAt(others, index) };
};

/** One place up or down within the card's column, or null at either end. */
export const planStep = (
  board: TaskBoard,
  cardId: string,
  direction: -1 | 1,
): BoardPosition | null => {
  const column = columnOfCard(board, cardId);
  if (!column) return null;
  const index = column.items.findIndex((item) => item.id === cardId);
  const next = index + direction;
  if (next < 0 || next >= column.items.length) return null;
  const others = column.items.filter((item) => item.id !== cardId);
  return { status: column.status, boardOrder: orderAt(others, next) };
};

/**
 * The top of another column, for "Move to…": where the person who moved it
 * will look, and where a column capped at 100 cards still shows it.
 */
export const planMoveTo = (
  board: TaskBoard,
  cardId: string,
  status: TaskStatus,
): BoardPosition | null => {
  const target = board.columns.find((column) => column.status === status);
  if (!target || target.items.some((item) => item.id === cardId)) return null;
  return { status, boardOrder: orderAt(target.items, 0) };
};
