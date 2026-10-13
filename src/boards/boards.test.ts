import { describe, expect, it } from 'vitest';
import {
  addCategory,
  createBlankBoard,
  duplicateBoard,
  MAX_CATEGORIES,
  MIN_CATEGORIES,
  moveCategory,
  removeCategory,
  resetValues,
  rowCount,
  setCategoryName,
  setFixedCheese,
  fixedCheeseAt,
  addPlatterAnswer,
  addPlatterPrompt,
  platterPromptProblems,
  removePlatterAnswer,
  removePlatterPrompt,
  setPlatterPotMultiplier,
  setPlatterQuestion,
  updatePlatterAnswer,
  setRandomCheeseCount,
  toggleCheeseInPool,
  setRowCount,
  summarizeWarnings,
  updateClue,
  validateBoard,
} from './boardOps';
import { BOARD_FILE_FORMAT, exportBoard, exportFileName, importBoard } from './boardJson';
import { LIBRARY_KEY, loadLibrary, saveLibrary, upsertBoard } from './library';
import { SAMPLE_BOARD } from '../game/sampleBoard';
import type { KeyValueStore } from '../game/persistence';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe('board operations', () => {
  it('creates a blank 6×5 board with default values', () => {
    const b = createBlankBoard('x');
    expect(b.categories).toHaveLength(6);
    expect(rowCount(b)).toBe(5);
    expect(b.categories[0].clues.map((c) => c.value)).toEqual([200, 400, 600, 800, 1000]);
  });

  it('adds and removes categories within 3–8', () => {
    let b = createBlankBoard('x', MAX_CATEGORIES, 3);
    expect(addCategory(b)).toBe(b);
    b = createBlankBoard('x', MIN_CATEGORIES, 3);
    expect(removeCategory(b, 0)).toBe(b);
    const grown = addCategory(b);
    expect(grown.categories).toHaveLength(4);
    expect(grown.categories[3].clues).toHaveLength(3);
  });

  it('removes the chosen category and keeps the others', () => {
    let b = createBlankBoard('x', 4, 3);
    b = setCategoryName(setCategoryName(b, 1, 'Keep'), 2, 'Drop');
    expect(removeCategory(b, 2).categories.map((c) => c.name)).toEqual(['', 'Keep', '']);
  });

  it('moves categories left and right', () => {
    let b = createBlankBoard('x', 3, 3);
    b = setCategoryName(setCategoryName(b, 0, 'A'), 1, 'B');
    expect(moveCategory(b, 0, 1).categories.map((c) => c.name)).toEqual(['B', 'A', '']);
    expect(moveCategory(b, 0, -1)).toBe(b);
  });

  it('resizes rows, keeping existing clues and clamping to 3–6', () => {
    let b = updateClue(createBlankBoard('x', 3, 3), 0, 1, { clue: 'kept' });
    b = setRowCount(b, 6);
    expect(rowCount(b)).toBe(6);
    expect(b.categories[0].clues[1].clue).toBe('kept');
    expect(b.categories[0].clues[5].value).toBe(1200);
    expect(rowCount(setRowCount(b, 99))).toBe(6);
    expect(rowCount(setRowCount(b, 1))).toBe(3);
  });

  it('resets values to the defaults', () => {
    const b = resetValues(updateClue(createBlankBoard('x'), 2, 4, { value: 5 }));
    expect(b.categories[2].clues[4].value).toBe(1000);
  });

  it('duplicates with a new id and an independent copy', () => {
    const copy = duplicateBoard(SAMPLE_BOARD, 'new');
    expect(copy.id).toBe('new');
    expect(copy.title).toBe('Sample Board (copy)');
    copy.categories[0].name = 'changed';
    expect(SAMPLE_BOARD.categories[0].name).toBe('Geography');
  });

  it('flags empty fields and bad values', () => {
    let b = createBlankBoard('x', 3, 3);
    b = { ...b, title: ' ' };
    b = updateClue(b, 0, 0, { value: 0 });
    const w = validateBoard(b);
    expect(w.filter((x) => x.kind === 'emptyClue')).toHaveLength(9);
    expect(w.filter((x) => x.kind === 'emptyAnswer')).toHaveLength(9);
    expect(w.filter((x) => x.kind === 'emptyCategory')).toHaveLength(3);
    expect(summarizeWarnings(w)).toEqual([
      'The board has no title',
      '3 categories have no name',
      '9 clues are empty',
      '9 answers are empty',
      '1 value is not a positive number',
    ]);
    expect(validateBoard(SAMPLE_BOARD)).toEqual([]);
  });
});

describe('cheese settings in the editor', () => {
  const withFixed = () => {
    let b = createBlankBoard('x', 4, 4);
    b = setFixedCheese(b, 1, 3, 'swiss');
    b = setFixedCheese(b, 2, 0, 'gouda');
    return b;
  };

  it('sets, replaces and clears a fixed cheese', () => {
    let b = withFixed();
    expect(fixedCheeseAt(b, 1, 3)).toBe('swiss');
    b = setFixedCheese(b, 1, 3, 'brie');
    expect(b.cheeseSettings.fixed.filter((f) => f.categoryIndex === 1)).toEqual([{ categoryIndex: 1, clueIndex: 3, cheese: 'brie' }]);
    b = setFixedCheese(b, 1, 3, null);
    expect(fixedCheeseAt(b, 1, 3)).toBeNull();
  });

  it('keeps fixed cheeses with their clue when categories move or are removed', () => {
    const moved = moveCategory(withFixed(), 1, 1);
    expect(fixedCheeseAt(moved, 2, 3)).toBe('swiss');
    expect(fixedCheeseAt(moved, 1, 0)).toBe('gouda');
    const removed = removeCategory(withFixed(), 1);
    expect(removed.cheeseSettings.fixed).toEqual([{ categoryIndex: 1, clueIndex: 0, cheese: 'gouda' }]);
  });

  it('drops fixed cheeses on removed rows', () => {
    const b = setRowCount(withFixed(), 3);
    expect(b.cheeseSettings.fixed).toEqual([{ categoryIndex: 2, clueIndex: 0, cheese: 'gouda' }]);
  });

  it('clamps the random count and toggles the pool', () => {
    let b = setRandomCheeseCount(createBlankBoard('x'), 50);
    expect(b.cheeseSettings.randomCount).toBe(10);
    b = toggleCheeseInPool(toggleCheeseInPool(b, 'feta', true), 'swiss', true);
    expect(b.cheeseSettings.pool).toEqual(['feta', 'swiss']);
    b = toggleCheeseInPool(b, 'feta', false);
    expect(b.cheeseSettings.pool).toEqual(['swiss']);
  });

  it('warns about an empty pool (Aged Parmesan alone does not count, since it is never random)', () => {
    const b = { ...SAMPLE_BOARD, cheeseSettings: { ...SAMPLE_BOARD.cheeseSettings, randomCount: 2, pool: [] } };
    expect(summarizeWarnings(validateBoard(b))).toEqual(['Random cheeses are on, but no cheeses are picked for the pool']);
    const parmesanOnly = { ...b, cheeseSettings: { ...b.cheeseSettings, pool: ['parmesan' as const] } };
    expect(summarizeWarnings(validateBoard(parmesanOnly))).toEqual(['Random cheeses are on, but no cheeses are picked for the pool']);
  });

  it('sets the Platter pot multiplier', () => {
    expect(setPlatterPotMultiplier(SAMPLE_BOARD, 3).cheeseSettings.platterPotMultiplier).toBe(3);
    expect(setPlatterPotMultiplier(SAMPLE_BOARD, 0)).toBe(SAMPLE_BOARD);
  });
});

describe('Platter prompts in the editor', () => {
  const blank = () => createBlankBoard('x');

  it('adds, edits and removes prompts and answers (4–8 answers)', () => {
    let b = addPlatterPrompt(blank());
    expect(b.platterPrompts).toEqual([{ prompt: '', answers: Array(4).fill({ text: '', points: 0 }) }]);
    b = setPlatterQuestion(b, 0, 'Name a cheese');
    b = updatePlatterAnswer(b, 0, 1, { text: 'Brie', points: 30 });
    expect(b.platterPrompts[0].prompt).toBe('Name a cheese');
    expect(b.platterPrompts[0].answers[1]).toEqual({ text: 'Brie', points: 30 });
    expect(removePlatterAnswer(b, 0, 0)).toBe(b); // already at the minimum
    for (let i = 0; i < 6; i++) b = addPlatterAnswer(b, 0);
    expect(b.platterPrompts[0].answers).toHaveLength(8);
    b = removePlatterAnswer(b, 0, 1);
    expect(b.platterPrompts[0].answers).toHaveLength(7);
    expect(b.platterPrompts[0].answers.some((a) => a.text === 'Brie')).toBe(false);
    expect(removePlatterPrompt(b, 0).platterPrompts).toEqual([]);
  });

  it('describes what is wrong with a prompt', () => {
    expect(platterPromptProblems({ prompt: '', answers: [{ text: 'A', points: 0 }] })).toEqual([
      'no question',
      'needs 4–8 answers',
      'an answer has no points',
    ]);
    expect(SAMPLE_BOARD.platterPrompts.flatMap(platterPromptProblems)).toEqual([]);
  });

  it('warns about bad prompts and too few prompts for the Platters', () => {
    let b = setFixedCheese(blank(), 0, 0, 'platter');
    expect(summarizeWarnings(validateBoard(b))).toContain('Not enough Platter prompts for the Cheese Platters');
    b = addPlatterPrompt(b);
    expect(summarizeWarnings(validateBoard(b))).toContain('1 Platter prompt needs fixing');
    // An unusable prompt doesn't count towards the Platters.
    expect(summarizeWarnings(validateBoard(b))).toContain('Not enough Platter prompts for the Cheese Platters');
    const sampleWithPlatters = { ...SAMPLE_BOARD, cheeseSettings: { ...SAMPLE_BOARD.cheeseSettings, randomCount: 3, pool: ['platter' as const] } };
    expect(summarizeWarnings(validateBoard(sampleWithPlatters))).toEqual([]);
    const noPrompts = { ...sampleWithPlatters, platterPrompts: [] };
    expect(summarizeWarnings(validateBoard(noPrompts))).toEqual(['Not enough Platter prompts for the Cheese Platters']);
  });
});

describe('JSON import/export', () => {
  it('round-trips a board under a new id', () => {
    const result = importBoard(exportBoard(SAMPLE_BOARD), 'fresh');
    expect(result).toEqual({ ok: true, board: { ...SAMPLE_BOARD, id: 'fresh' } });
  });

  it('accepts a bare board object and fills in missing optional parts', () => {
    const bare = { title: 'Bare', categories: SAMPLE_BOARD.categories.slice(0, 3) };
    const result = importBoard(JSON.stringify(bare), 'id1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.board.platterPrompts).toEqual([]);
      expect(result.board.cheeseSettings.platterPotMultiplier).toBe(2);
    }
  });

  it('rejects broken or unsupported files with a readable error', () => {
    const err = (json: string) => {
      const r = importBoard(json, 'x');
      return r.ok ? null : r.error;
    };
    expect(err('{nope')).toMatch(/valid JSON/);
    expect(err('[]')).toMatch(/doesn't contain a board/);
    expect(err(JSON.stringify({ categories: SAMPLE_BOARD.categories.slice(0, 2) }))).toMatch(/3–8 categories/);
    const ragged = structuredClone(SAMPLE_BOARD);
    ragged.categories[1].clues.pop();
    expect(err(JSON.stringify(ragged))).toMatch(/same number/);
    const badValue = structuredClone(SAMPLE_BOARD) as unknown as { categories: { clues: { value: unknown }[] }[] };
    badValue.categories[0].clues[0].value = 'lots';
    expect(err(JSON.stringify(badValue))).toMatch(/numeric value/);
    expect(err(JSON.stringify({ format: BOARD_FILE_FORMAT, version: 99, board: SAMPLE_BOARD }))).toMatch(/newer version/);
  });

  it('drops unknown fields and invalid cheese settings', () => {
    const input = {
      ...SAMPLE_BOARD,
      extra: 'ignored',
      cheeseSettings: { randomCount: 2, pool: ['swiss', 'stilton'], fixed: [{ categoryIndex: 99, clueIndex: 0, cheese: 'brie' }] },
    };
    const r = importBoard(JSON.stringify(input), 'x');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect('extra' in r.board).toBe(false);
      expect(r.board.cheeseSettings.pool).toEqual(['swiss']);
      expect(r.board.cheeseSettings.fixed).toEqual([]);
    }
  });

  it('makes safe file names', () => {
    expect(exportFileName({ ...SAMPLE_BOARD, title: 'Quiz Night: Round #1!' })).toBe('quiz-night-round-1.board.json');
    expect(exportFileName({ ...SAMPLE_BOARD, title: '???' })).toBe('board.board.json');
  });
});

describe('library storage', () => {
  it('starts with the sample board the first time', () => {
    expect(loadLibrary(memoryStore()).map((b) => b.id)).toEqual([SAMPLE_BOARD.id]);
  });

  it('saves and loads boards, and an emptied library stays empty', () => {
    const store = memoryStore();
    const board = createBlankBoard('mine');
    saveLibrary(store, [board]);
    expect(loadLibrary(store)).toEqual([board]);
    saveLibrary(store, []);
    expect(loadLibrary(store)).toEqual([]);
  });

  it('keeps unreadable data aside instead of overwriting it', () => {
    const store = memoryStore({ [LIBRARY_KEY]: '{corrupt' });
    expect(loadLibrary(store).map((b) => b.id)).toEqual([SAMPLE_BOARD.id]);
    expect(Object.values(store.data)).toContain('{corrupt');
  });

  it('upserts by id', () => {
    const a = createBlankBoard('a');
    const b = createBlankBoard('b');
    const edited = { ...a, title: 'Edited' };
    expect(upsertBoard([a, b], edited).map((x) => x.title)).toEqual(['Edited', 'Untitled board']);
    expect(upsertBoard([a], b)).toHaveLength(2);
  });
});
