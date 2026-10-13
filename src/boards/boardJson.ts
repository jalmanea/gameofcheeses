// JSON import/export for sharing boards. Imports are untrusted input, so they are
// checked field by field and rebuilt from scratch rather than trusted as-is.
import type { Board, CheeseId, Clue, PlatterPrompt } from '../game/types';
import {
  DEFAULT_CHEESE_SETTINGS,
  MAX_CATEGORIES,
  MAX_ROWS,
  MAX_TITLE_LENGTH,
  MIN_CATEGORIES,
  MIN_ROWS,
} from './boardOps';

export const BOARD_FILE_FORMAT = 'game-of-cheeses/board';
export const BOARD_FILE_VERSION = 1;
const MAX_TEXT = 1000;

const CHEESE_IDS: readonly CheeseId[] = [
  'gouda', 'swiss', 'parmesan', 'limburger', 'brie', 'mozzarella', 'blue', 'wheel', 'feta', 'platter',
];

export interface BoardFile {
  format: typeof BOARD_FILE_FORMAT;
  version: number;
  board: Board;
}

export function exportBoard(board: Board): string {
  const file: BoardFile = { format: BOARD_FILE_FORMAT, version: BOARD_FILE_VERSION, board };
  return JSON.stringify(file, null, 2);
}

/** A safe file name like "my-quiz-night.board.json". */
export function exportFileName(board: Board): string {
  const slug = board.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'board'}.board.json`;
}

export type ImportResult = { ok: true; board: Board } | { ok: false; error: string };

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function text(v: unknown, where: string, max = MAX_TEXT): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') fail(`${where} must be text`);
  return v.slice(0, max);
}

function parseClue(v: unknown, where: string): Clue {
  if (!isObject(v)) fail(`${where} is not a clue`);
  const value = v.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${where} needs a numeric value`);
  const clue: Clue = { value: Math.round(value), clue: text(v.clue, `${where} clue`), answer: text(v.answer, `${where} answer`) };
  const imageUrl = text(v.imageUrl, `${where} image`);
  if (imageUrl) clue.imageUrl = imageUrl;
  return clue;
}

function parsePlatterPrompts(v: unknown): PlatterPrompt[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail('platterPrompts must be a list');
  return v.map((p, i) => {
    if (!isObject(p) || !Array.isArray(p.answers)) fail(`Platter prompt ${i + 1} is malformed`);
    return {
      prompt: text(p.prompt, `Platter prompt ${i + 1}`),
      answers: p.answers.map((a, j) => {
        if (!isObject(a) || typeof a.points !== 'number' || !Number.isFinite(a.points)) {
          fail(`Platter prompt ${i + 1}, answer ${j + 1} is malformed`);
        }
        return { text: text(a.text, `Platter answer ${j + 1}`), points: a.points };
      }),
    };
  });
}

function parseCheeseSettings(v: unknown, categories: number, rows: number): Board['cheeseSettings'] {
  if (v === undefined) return { ...DEFAULT_CHEESE_SETTINGS };
  if (!isObject(v)) fail('cheeseSettings is malformed');
  const isCheese = (c: unknown): c is CheeseId => typeof c === 'string' && (CHEESE_IDS as string[]).includes(c);
  const pool = Array.isArray(v.pool) ? v.pool.filter(isCheese) : [];
  const fixed = Array.isArray(v.fixed)
    ? v.fixed.flatMap((f) =>
        isObject(f) &&
        Number.isInteger(f.categoryIndex) &&
        Number.isInteger(f.clueIndex) &&
        (f.categoryIndex as number) >= 0 &&
        (f.categoryIndex as number) < categories &&
        (f.clueIndex as number) >= 0 &&
        (f.clueIndex as number) < rows &&
        isCheese(f.cheese)
          ? [{ categoryIndex: f.categoryIndex as number, clueIndex: f.clueIndex as number, cheese: f.cheese }]
          : [],
      )
    : [];
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : d);
  return {
    randomCount: Math.floor(num(v.randomCount, 0)),
    pool,
    fixed,
    platterPotMultiplier: num(v.platterPotMultiplier, DEFAULT_CHEESE_SETTINGS.platterPotMultiplier),
  };
}

/**
 * Parses an exported board file (or a bare Board object). The imported board
 * always gets `newId`, so it never overwrites a board already in the library.
 */
export function importBoard(json: string, newId: string): ImportResult {
  try {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      fail("This file isn't valid JSON.");
    }
    if (isObject(data) && data.format === BOARD_FILE_FORMAT) {
      if (typeof data.version !== 'number' || data.version > BOARD_FILE_VERSION) {
        fail('This board was made with a newer version of Game of Cheeses.');
      }
      data = data.board;
    }
    if (!isObject(data) || !Array.isArray(data.categories)) fail("This file doesn't contain a board.");

    const cats = data.categories;
    if (cats.length < MIN_CATEGORIES || cats.length > MAX_CATEGORIES) {
      fail(`A board needs ${MIN_CATEGORIES}–${MAX_CATEGORIES} categories (this one has ${cats.length}).`);
    }
    const categories = cats.map((c, ci) => {
      if (!isObject(c) || !Array.isArray(c.clues)) fail(`Category ${ci + 1} is malformed.`);
      return {
        name: text(c.name, `Category ${ci + 1} name`, 80),
        clues: c.clues.map((clue, ri) => parseClue(clue, `Category ${ci + 1}, clue ${ri + 1}`)),
      };
    });
    const rows = categories[0].clues.length;
    if (rows < MIN_ROWS || rows > MAX_ROWS) fail(`A board needs ${MIN_ROWS}–${MAX_ROWS} clues per category.`);
    if (categories.some((c) => c.clues.length !== rows)) fail('Every category needs the same number of clues.');

    return {
      ok: true,
      board: {
        id: newId,
        title: text(data.title, 'Title', MAX_TITLE_LENGTH).trim() || 'Imported board',
        categories,
        platterPrompts: parsePlatterPrompts(data.platterPrompts),
        cheeseSettings: parseCheeseSettings(data.cheeseSettings, categories.length, rows),
      },
    };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    throw e;
  }
}
