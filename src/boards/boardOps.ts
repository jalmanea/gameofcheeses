// Pure helpers for creating, resizing and checking boards. No React, no storage.
import { isPlayable } from '../game/cheeses';
import type { Board, Category, CheeseId, CheeseSettings, Clue } from '../game/types';

export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 8;
export const MIN_ROWS = 3;
export const MAX_ROWS = 6;
export const MAX_TITLE_LENGTH = 60;

export const DEFAULT_CHEESE_SETTINGS: CheeseSettings = {
  randomCount: 0,
  pool: [],
  fixed: [],
  platterPotMultiplier: 2,
};

/** Default value for a row: 200, 400, 600, ... */
export function defaultValue(rowIndex: number): number {
  return (rowIndex + 1) * 200;
}

function blankClue(rowIndex: number): Clue {
  return { value: defaultValue(rowIndex), clue: '', answer: '' };
}

function blankCategory(rows: number): Category {
  return { name: '', clues: Array.from({ length: rows }, (_, i) => blankClue(i)) };
}

export function createBlankBoard(id: string, categories = 6, rows = 5): Board {
  return {
    id,
    title: 'Untitled board',
    categories: Array.from({ length: categories }, () => blankCategory(rows)),
    platterPrompts: [],
    cheeseSettings: { ...DEFAULT_CHEESE_SETTINGS },
  };
}

export function rowCount(board: Board): number {
  return board.categories[0]?.clues.length ?? 0;
}

export function addCategory(board: Board): Board {
  if (board.categories.length >= MAX_CATEGORIES) return board;
  return { ...board, categories: [...board.categories, blankCategory(rowCount(board))] };
}

export const MAX_RANDOM_CHEESES = 10;

type Fixed = CheeseSettings['fixed'];

function withFixed(board: Board, fixed: Fixed): Board {
  return { ...board, cheeseSettings: { ...board.cheeseSettings, fixed } };
}

export function removeCategory(board: Board, index: number): Board {
  if (board.categories.length <= MIN_CATEGORIES) return board;
  // Fixed cheeses in the removed column go with it; later columns shift left.
  const fixed = board.cheeseSettings.fixed
    .filter((f) => f.categoryIndex !== index)
    .map((f) => (f.categoryIndex > index ? { ...f, categoryIndex: f.categoryIndex - 1 } : f));
  return withFixed({ ...board, categories: board.categories.filter((_, i) => i !== index) }, fixed);
}

export function moveCategory(board: Board, index: number, delta: -1 | 1): Board {
  const target = index + delta;
  if (target < 0 || target >= board.categories.length) return board;
  const categories = [...board.categories];
  [categories[index], categories[target]] = [categories[target], categories[index]];
  // Fixed cheeses move with their category.
  const fixed = board.cheeseSettings.fixed.map((f) =>
    f.categoryIndex === index
      ? { ...f, categoryIndex: target }
      : f.categoryIndex === target
        ? { ...f, categoryIndex: index }
        : f,
  );
  return withFixed({ ...board, categories }, fixed);
}

/** Grows or shrinks every category to `rows` clues; new rows get default values. */
export function setRowCount(board: Board, rows: number): Board {
  const n = Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows));
  return withFixed(
    {
      ...board,
      categories: board.categories.map((c) => ({
        ...c,
        clues: Array.from({ length: n }, (_, i) => c.clues[i] ?? blankClue(i)),
      })),
    },
    board.cheeseSettings.fixed.filter((f) => f.clueIndex < n),
  );
}

/** The cheese the author fixed on this tile, if any. */
export function fixedCheeseAt(board: Board, categoryIndex: number, clueIndex: number): CheeseId | null {
  return board.cheeseSettings.fixed.find((f) => f.categoryIndex === categoryIndex && f.clueIndex === clueIndex)?.cheese ?? null;
}

/** Sets (or with null, clears) the fixed cheese on one tile. */
export function setFixedCheese(board: Board, categoryIndex: number, clueIndex: number, cheese: CheeseId | null): Board {
  const others = board.cheeseSettings.fixed.filter((f) => !(f.categoryIndex === categoryIndex && f.clueIndex === clueIndex));
  return withFixed(board, cheese ? [...others, { categoryIndex, clueIndex, cheese }] : others);
}

export function setRandomCheeseCount(board: Board, count: number): Board {
  const randomCount = Math.min(MAX_RANDOM_CHEESES, Math.max(0, Math.floor(count)));
  return { ...board, cheeseSettings: { ...board.cheeseSettings, randomCount } };
}

export function toggleCheeseInPool(board: Board, cheese: CheeseId, on: boolean): Board {
  const pool = board.cheeseSettings.pool.filter((c) => c !== cheese);
  return { ...board, cheeseSettings: { ...board.cheeseSettings, pool: on ? [...pool, cheese] : pool } };
}

export function setCategoryName(board: Board, index: number, name: string): Board {
  return {
    ...board,
    categories: board.categories.map((c, i) => (i === index ? { ...c, name } : c)),
  };
}

export function updateClue(board: Board, categoryIndex: number, clueIndex: number, patch: Partial<Clue>): Board {
  return {
    ...board,
    categories: board.categories.map((c, ci) =>
      ci === categoryIndex
        ? { ...c, clues: c.clues.map((clue, ri) => (ri === clueIndex ? { ...clue, ...patch } : clue)) }
        : c,
    ),
  };
}

/** Resets every row to the default 200, 400, 600, ... values. */
export function resetValues(board: Board): Board {
  return {
    ...board,
    categories: board.categories.map((c) => ({
      ...c,
      clues: c.clues.map((clue, i) => ({ ...clue, value: defaultValue(i) })),
    })),
  };
}

export function duplicateBoard(board: Board, id: string): Board {
  const copy = structuredClone(board);
  return { ...copy, id, title: `${board.title} (copy)`.slice(0, MAX_TITLE_LENGTH) };
}

export type BoardWarning =
  | { kind: 'emptyTitle' }
  | { kind: 'emptyCategory'; categoryIndex: number }
  | { kind: 'emptyClue'; categoryIndex: number; clueIndex: number }
  | { kind: 'emptyAnswer'; categoryIndex: number; clueIndex: number }
  | { kind: 'badValue'; categoryIndex: number; clueIndex: number }
  | { kind: 'emptyCheesePool' }
  | { kind: 'unplayableCheese'; cheese: CheeseId };

/** Problems worth flagging before play. A board with warnings can still be played. */
export function validateBoard(board: Board): BoardWarning[] {
  const warnings: BoardWarning[] = [];
  if (!board.title.trim()) warnings.push({ kind: 'emptyTitle' });
  board.categories.forEach((c, ci) => {
    if (!c.name.trim()) warnings.push({ kind: 'emptyCategory', categoryIndex: ci });
    c.clues.forEach((clue, ri) => {
      if (!clue.clue.trim()) warnings.push({ kind: 'emptyClue', categoryIndex: ci, clueIndex: ri });
      if (!clue.answer.trim()) warnings.push({ kind: 'emptyAnswer', categoryIndex: ci, clueIndex: ri });
      if (!Number.isFinite(clue.value) || clue.value <= 0) {
        warnings.push({ kind: 'badValue', categoryIndex: ci, clueIndex: ri });
      }
    });
  });
  const cs = board.cheeseSettings;
  if (cs.randomCount > 0 && !cs.pool.some(isPlayable)) warnings.push({ kind: 'emptyCheesePool' });
  // Cheeses from a newer board file that this version can't play yet are skipped in games.
  const unplayable = new Set([...(cs.randomCount > 0 ? cs.pool : []), ...cs.fixed.map((f) => f.cheese)].filter((c) => !isPlayable(c)));
  unplayable.forEach((cheese) => warnings.push({ kind: 'unplayableCheese', cheese }));
  return warnings;
}

/** One short line per kind of problem, e.g. "4 clues are empty". */
export function summarizeWarnings(warnings: BoardWarning[]): string[] {
  const count = (kind: BoardWarning['kind']) => warnings.filter((w) => w.kind === kind).length;
  const lines: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (count('emptyTitle')) lines.push('The board has no title');
  const cats = count('emptyCategory');
  if (cats) lines.push(`${plural(cats, 'category has', 'categories have')} no name`);
  const clues = count('emptyClue');
  if (clues) lines.push(`${plural(clues, 'clue is', 'clues are')} empty`);
  const answers = count('emptyAnswer');
  if (answers) lines.push(`${plural(answers, 'answer is', 'answers are')} empty`);
  const values = count('badValue');
  if (values) lines.push(`${plural(values, 'value is', 'values are')} not a positive number`);
  if (count('emptyCheesePool')) lines.push('Random cheeses are on, but no cheeses are picked for the pool');
  const unplayable = count('unplayableCheese');
  if (unplayable) lines.push(`${plural(unplayable, 'cheese', 'cheeses')} can't be played yet and will be skipped`);
  return lines;
}
