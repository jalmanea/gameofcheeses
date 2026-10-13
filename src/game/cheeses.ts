// The cheese catalogue (SPEC.md §4) and how cheeses are placed on a board.
// Pure: randomness is passed in, so placement is testable and the reducer stays pure.
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
  /** False for cheeses that arrive in a later milestone; they're never placed. */
  playable: boolean;
}

export const CHEESES: Record<CheeseId, CheeseInfo> = {
  gouda: {
    id: 'gouda',
    name: 'Golden Gouda',
    ability: 'Wager',
    rule: 'The picker wagers up to their score (or the top clue value, if higher) and answers alone.',
    emoji: '🪙',
    color: '#e8a317',
    playable: true,
  },
  swiss: {
    id: 'swiss',
    name: 'Swiss',
    ability: 'Holes',
    rule: 'Wrong answers cost nothing.',
    emoji: '🕳️',
    color: '#f2d675',
    playable: true,
  },
  limburger: {
    id: 'limburger',
    name: 'Limburger',
    ability: 'Stink bomb',
    rule: "The picker can't answer: they hand the clue to another player, who answers alone.",
    emoji: '💨',
    color: '#9bb24a',
    playable: true,
  },
  brie: {
    id: 'brie',
    name: 'Brie',
    ability: 'Spread',
    rule: 'Several players can be marked correct, and all of them score.',
    emoji: '🧈',
    color: '#f6ead0',
    playable: true,
  },
  mozzarella: {
    id: 'mozzarella',
    name: 'Mozzarella',
    ability: 'Stretch',
    rule: 'Double value, but the answer has two parts.',
    emoji: '🫧',
    color: '#ffffff',
    playable: true,
  },
  feta: {
    id: 'feta',
    name: 'Feta',
    ability: 'Crumble',
    rule: "A correct answer also steals 10% of the leader's score (nothing extra if you're the leader).",
    emoji: '🧂',
    color: '#e9eef0',
    playable: true,
  },
  parmesan: {
    id: 'parmesan',
    name: 'Aged Parmesan',
    ability: 'Ages',
    rule: "The tile's value grows each turn it stays unpicked. Its location is visible.",
    emoji: '⏳',
    color: '#d9b26b',
    playable: false,
  },
  blue: {
    id: 'blue',
    name: 'Blue cheese',
    ability: 'Moldy',
    rule: 'The value decays every second until someone buzzes.',
    emoji: '🦠',
    color: '#8fa9c9',
    playable: false,
  },
  wheel: {
    id: 'wheel',
    name: 'Cheese Wheel',
    ability: 'Spin',
    rule: 'Spin a wheel for a multiplier: ×0.5, ×1, ×1.5, ×2 or ×3.',
    emoji: '🎡',
    color: '#f0b429',
    playable: false,
  },
  platter: {
    id: 'platter',
    name: 'Cheese Platter',
    ability: 'Survey',
    rule: 'The clue becomes a survey round: name the most popular answers.',
    emoji: '🍽️',
    color: '#c98b4a',
    playable: false,
  },
};

/** Guide order: playable cheeses first. */
export const CHEESE_ORDER: CheeseId[] = [
  'gouda', 'swiss', 'limburger', 'brie', 'mozzarella', 'feta', 'parmesan', 'blue', 'wheel', 'platter',
];

export const PLAYABLE_CHEESES: CheeseId[] = CHEESE_ORDER.filter((id) => CHEESES[id].playable);

export function isPlayable(id: CheeseId): boolean {
  return CHEESES[id]?.playable ?? false;
}

/** Cheeses a board can put into a game: its random pool plus any fixed tiles (playable only). */
export function boardCheeses(board: Board): CheeseId[] {
  const s = board.cheeseSettings;
  const used = new Set<CheeseId>([...(s.randomCount > 0 ? s.pool : []), ...s.fixed.map((f) => f.cheese)]);
  return CHEESE_ORDER.filter((id) => used.has(id) && isPlayable(id));
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
 * `active` (the host's choice for this game) and playable ones are used. The same
 * cheese only repeats once every cheese in the pool has been used.
 */
export function placeCheeses(board: Board, active: CheeseId[], random: () => number): TileState[][] {
  const allowed = (id: CheeseId) => active.includes(id) && isPlayable(id);
  const tiles: TileState[][] = board.categories.map((c) => c.clues.map(() => ({ played: false })));

  for (const f of board.cheeseSettings.fixed) {
    const tile = tiles[f.categoryIndex]?.[f.clueIndex];
    if (tile && allowed(f.cheese)) tile.cheese = f.cheese;
  }

  const pool = [...new Set(board.cheeseSettings.pool)].filter(allowed);
  const free = tiles.flatMap((col, ci) => col.flatMap((t, ri) => (t.cheese ? [] : [[ci, ri] as const])));
  const count = Math.min(Math.max(0, Math.floor(board.cheeseSettings.randomCount)), free.length);
  if (pool.length === 0 || count === 0) return tiles;

  const spots = shuffle(free, random).slice(0, count);
  let bag: CheeseId[] = [];
  for (const [ci, ri] of spots) {
    if (bag.length === 0) bag = shuffle(pool, random);
    tiles[ci][ri].cheese = bag.pop();
  }
  return tiles;
}

/** The highest clue value on the board (used for the Gouda wager limit). */
export function highestClueValue(board: Board): number {
  return Math.max(0, ...board.categories.flatMap((c) => c.clues.map((x) => x.value)));
}
