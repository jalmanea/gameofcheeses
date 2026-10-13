// The cheese catalogue (SPEC.md §4) and how cheeses are placed on a board.
// Pure: randomness is passed in, so placement is testable and the reducer stays pure.
import { usablePromptIndexes } from './platter';
import type { Board, CheeseId, TileState } from './types';

export interface CheeseInfo {
  id: CheeseId;
  name: string;
  ability: string;
  /** One line, shown on the reveal splash and in the Cheese Guide. */
  rule: string;
  emoji: string;
  /** Card colour for the splash and guide. */
  color: string;
}

export const CHEESES: Record<CheeseId, CheeseInfo> = {
  gouda: {
    id: 'gouda',
    name: 'Golden Gouda',
    ability: 'Wager',
    rule: 'The picker wagers up to their score (or the top clue value, if higher) and answers alone.',
    emoji: '🪙',
    color: '#e8a317',
  },
  swiss: {
    id: 'swiss',
    name: 'Swiss',
    ability: 'Holes',
    rule: 'Wrong answers cost nothing.',
    emoji: '🕳️',
    color: '#f2d675',
  },
  limburger: {
    id: 'limburger',
    name: 'Limburger',
    ability: 'Stink bomb',
    rule: "The picker can't answer: they hand the clue to another player, who answers alone.",
    emoji: '💨',
    color: '#9bb24a',
  },
  brie: {
    id: 'brie',
    name: 'Brie',
    ability: 'Spread',
    rule: 'Several players can be marked correct, and all of them score.',
    emoji: '🧈',
    color: '#f6ead0',
  },
  mozzarella: {
    id: 'mozzarella',
    name: 'Mozzarella',
    ability: 'Stretch',
    rule: 'Double value, but the answer has two parts.',
    emoji: '🫧',
    color: '#ffffff',
  },
  feta: {
    id: 'feta',
    name: 'Feta',
    ability: 'Crumble',
    rule: "A correct answer also steals 10% of the leader's score (nothing extra if you're the leader).",
    emoji: '🧂',
    color: '#e9eef0',
  },
  parmesan: {
    id: 'parmesan',
    name: 'Aged Parmesan',
    ability: 'Ages',
    rule: 'Always in plain sight. It gains 10% in value each turn nobody picks it, up to triple.',
    emoji: '⏳',
    color: '#d9b26b',
  },
  blue: {
    id: 'blue',
    name: 'Blue cheese',
    ability: 'Moldy',
    rule: 'The value drops every second until someone buzzes, down to a fifth.',
    emoji: '🦠',
    color: '#8fa9c9',
  },
  wheel: {
    id: 'wheel',
    name: 'Cheese Wheel',
    ability: 'Spin',
    rule: 'Spin the wheel for a multiplier: ×0.5, ×1, ×1.5, ×2 or ×3.',
    emoji: '🎡',
    color: '#f0b429',
  },
  platter: {
    id: 'platter',
    name: 'Cheese Platter',
    ability: 'Survey',
    rule: "A survey round: players take turns naming popular answers. Two strikes and you're out.",
    emoji: '🍽️',
    color: '#c98b4a',
  },
};

/** Guide and menu order. */
export const CHEESE_ORDER: CheeseId[] = [
  'gouda', 'swiss', 'limburger', 'brie', 'mozzarella', 'feta', 'parmesan', 'blue', 'wheel', 'platter',
];

/** Aged Parmesan is never placed at random: the author puts it on a clue, and everyone can see it. */
export function canBeRandom(id: CheeseId): boolean {
  return id !== 'parmesan';
}

/** Cheeses a board can put into a game: its random pool plus any fixed tiles. */
export function boardCheeses(board: Board): CheeseId[] {
  const s = board.cheeseSettings;
  const random = s.randomCount > 0 ? s.pool.filter(canBeRandom) : [];
  const used = new Set<CheeseId>([...random, ...s.fixed.map((f) => f.cheese)]);
  return CHEESE_ORDER.filter((id) => used.has(id));
}

/** Fisher–Yates shuffle using the supplied random source (0 ≤ r < 1). */
function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Hides cheeses on the board for one game: the author's fixed tiles first, then
 * `randomCount` cheeses from the pool on other random tiles. Only cheeses in
 * `active` (the host's choice for this game) are used. The same
 * cheese only repeats once every cheese in the pool has been used.
 *
 * Each Platter tile is given its own Platter prompt; once the prompts run out, no
 * more Platters are placed. Aged Parmesan tiles start at age 0.
 */
export function placeCheeses(board: Board, active: CheeseId[], random: () => number): TileState[][] {
  const allowed = (id: CheeseId) => active.includes(id);
  const tiles: TileState[][] = board.categories.map((c) => c.clues.map(() => ({ played: false })));
  const prompts = shuffle(usablePromptIndexes(board), random);

  const place = (tile: TileState, cheese: CheeseId): boolean => {
    if (cheese === 'platter') {
      const prompt = prompts.pop();
      if (prompt === undefined) return false;
      tile.platterPrompt = prompt;
    }
    if (cheese === 'parmesan') tile.agedTurns = 0;
    tile.cheese = cheese;
    return true;
  };

  for (const f of board.cheeseSettings.fixed) {
    const tile = tiles[f.categoryIndex]?.[f.clueIndex];
    if (tile && !tile.cheese && allowed(f.cheese)) place(tile, f.cheese);
  }

  let pool = [...new Set(board.cheeseSettings.pool)].filter((c) => allowed(c) && canBeRandom(c));
  const free = tiles.flatMap((col, ci) => col.flatMap((t, ri) => (t.cheese ? [] : [[ci, ri] as const])));
  const count = Math.min(Math.max(0, Math.floor(board.cheeseSettings.randomCount)), free.length);
  const spots = shuffle(free, random).slice(0, count);
  let bag: CheeseId[] = [];
  for (const [ci, ri] of spots) {
    let placed = false;
    while (!placed && pool.length > 0) {
      if (bag.length === 0) bag = shuffle(pool, random);
      const cheese = bag.pop()!;
      placed = place(tiles[ci][ri], cheese);
      if (!placed) {
        // Out of Platter prompts: no more Platters this game.
        pool = pool.filter((c) => c !== cheese);
        bag = bag.filter((c) => c !== cheese);
      }
    }
  }
  return tiles;
}

/** Aged Parmesan grows by this share of its base value per turn... */
export const PARMESAN_GROWTH = 0.1;
/** ...up to this multiple of its base value. */
export const PARMESAN_MAX = 3;

export function parmesanValue(base: number, agedTurns: number): number {
  return Math.round(base * Math.min(PARMESAN_MAX, 1 + PARMESAN_GROWTH * agedTurns));
}

/** Blue cheese loses this share of its base value each full second... */
export const BLUE_DECAY_PER_SECOND = 0.05;
/** ...down to this share of it. */
export const BLUE_FLOOR = 0.2;
/** How long Blue cheese takes to reach its floor. */
export const BLUE_DECAY_MS = Math.round(((1 - BLUE_FLOOR) / BLUE_DECAY_PER_SECOND) * 1000);

/** Blue cheese's value after it has been decaying for `elapsedMs`. */
export function blueValue(base: number, elapsedMs: number): number {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return Math.round(base * Math.max(BLUE_FLOOR, 1 - BLUE_DECAY_PER_SECOND * seconds));
}

/** The Cheese Wheel's segments, clockwise from the top. */
export const WHEEL_SEGMENTS = [0.5, 1, 1.5, 2, 3] as const;

export function randomWheelSegment(random: () => number = Math.random): number {
  return Math.min(WHEEL_SEGMENTS.length - 1, Math.floor(random() * WHEEL_SEGMENTS.length));
}

/** The highest clue value on the board (used for the Gouda wager limit). */
export function highestClueValue(board: Board): number {
  return Math.max(0, ...board.categories.flatMap((c) => c.clues.map((x) => x.value)));
}
