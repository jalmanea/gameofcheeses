import { describe, expect, it } from 'vitest';
import { boardCheeses, placeCheeses, PLAYABLE_CHEESES } from './cheeses';
import { canCancel, createGame, escapeAction, fetaSteal, gameReducer, maxWager } from './reducer';
import { SAMPLE_BOARD } from './sampleBoard';
import { timeLeft } from './timer';
import type { Board, CheeseId, GameAction, GameState } from './types';

const PLAYERS = [
  { name: 'Ann', color: '#f00' },
  { name: 'Bo', color: '#0f0' },
  { name: 'Cy', color: '#00f' },
];

/** Deterministic pseudo-random numbers (mulberry32). */
function seeded(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withCheeses(settings: Partial<Board['cheeseSettings']>): Board {
  return { ...SAMPLE_BOARD, cheeseSettings: { ...SAMPLE_BOARD.cheeseSettings, randomCount: 0, pool: [], fixed: [], ...settings } };
}

/** A game where Geography 200 (tile 0,0) hides `cheese`. */
function gameWith(cheese: CheeseId, timerSeconds: number | null = null): GameState {
  const board = withCheeses({ fixed: [{ categoryIndex: 0, clueIndex: 0, cheese }] });
  return createGame(board, PLAYERS, { timerSeconds, cheeses: [cheese] });
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

const pick = { type: 'selectTile', categoryIndex: 0, clueIndex: 0, at: 0 } as const;
const dismiss = { type: 'dismissCheese', at: 0 } as const;
const sel = (playerId: string | null, at = 0) => ({ type: 'selectPlayer', playerId, at }) as const;
const correct = { type: 'markCorrect', at: 0 } as const;
const wrong = { type: 'markWrong', at: 0 } as const;
const reveal = { type: 'revealAnswer', at: 0 } as const;
const score = (s: GameState, id: string) => s.players.find((p) => p.id === id)!.score;
const allTiles = (tiles: GameState['tiles']) => tiles.flat();

describe('cheese placement', () => {
  it('places the requested number of random cheeses from the active pool', () => {
    const board = withCheeses({ randomCount: 4, pool: ['swiss', 'brie'] });
    const tiles = placeCheeses(board, ['swiss', 'brie'], seeded(1));
    const placed = allTiles(tiles).filter((t) => t.cheese);
    expect(placed).toHaveLength(4);
    expect(placed.every((t) => t.cheese === 'swiss' || t.cheese === 'brie')).toBe(true);
    // Both pool cheeses are used before either repeats.
    expect(placed.filter((t) => t.cheese === 'swiss')).toHaveLength(2);
  });

  it('is deterministic for the same random source', () => {
    const board = withCheeses({ randomCount: 3, pool: PLAYABLE_CHEESES });
    expect(placeCheeses(board, PLAYABLE_CHEESES, seeded(7))).toEqual(placeCheeses(board, PLAYABLE_CHEESES, seeded(7)));
  });

  it('honours fixed tiles and keeps random cheeses off them', () => {
    const board = withCheeses({ randomCount: 29, pool: ['swiss'], fixed: [{ categoryIndex: 2, clueIndex: 3, cheese: 'gouda' }] });
    const tiles = placeCheeses(board, ['swiss', 'gouda'], seeded(3));
    expect(tiles[2][3].cheese).toBe('gouda');
    expect(allTiles(tiles).filter((t) => t.cheese === 'swiss')).toHaveLength(29);
  });

  it('skips cheeses the host switched off and cheeses not playable yet', () => {
    const board = withCheeses({
      randomCount: 5,
      pool: ['swiss', 'platter'],
      fixed: [
        { categoryIndex: 0, clueIndex: 0, cheese: 'gouda' },
        { categoryIndex: 0, clueIndex: 1, cheese: 'blue' },
      ],
    });
    const tiles = placeCheeses(board, ['swiss', 'platter', 'blue'], seeded(5));
    expect(tiles[0][0].cheese).toBeUndefined();
    expect(tiles[0][1].cheese).toBeUndefined();
    expect(allTiles(tiles).filter((t) => t.cheese).every((t) => t.cheese === 'swiss')).toBe(true);
  });

  it('places nothing with an empty pool or a zero count, and caps at the free tiles', () => {
    expect(allTiles(placeCheeses(withCheeses({ randomCount: 3, pool: [] }), PLAYABLE_CHEESES, seeded(1))).some((t) => t.cheese)).toBe(false);
    expect(allTiles(placeCheeses(withCheeses({ randomCount: 0, pool: ['swiss'] }), ['swiss'], seeded(1))).some((t) => t.cheese)).toBe(false);
    expect(allTiles(placeCheeses(withCheeses({ randomCount: 99, pool: ['swiss'] }), ['swiss'], seeded(1))).every((t) => t.cheese)).toBe(true);
  });

  it('lists the cheeses a board can use', () => {
    const board = withCheeses({ randomCount: 2, pool: ['feta', 'wheel'], fixed: [{ categoryIndex: 0, clueIndex: 0, cheese: 'swiss' }] });
    expect(boardCheeses(board)).toEqual(['swiss', 'feta']);
    expect(boardCheeses(withCheeses({ randomCount: 0, pool: ['feta'] }))).toEqual([]);
  });

  it('places no cheeses unless the game switches them on', () => {
    const board = withCheeses({ randomCount: 5, pool: PLAYABLE_CHEESES });
    expect(allTiles(createGame(board, PLAYERS).tiles).some((t) => t.cheese)).toBe(false);
  });
});

describe('cheese reveal', () => {
  it('shows the splash first, then the clue (and starts the timer then)', () => {
    let s = run(gameWith('swiss', 10), pick);
    expect(s.active).toMatchObject({ cheese: 'swiss', stage: 'cheese', timer: null });
    expect(gameReducer(s, { type: 'buzz', at: 0 })).toBe(s);
    expect(gameReducer(s, reveal)).toBe(s);
    s = run(s, { type: 'dismissCheese', at: 5000 });
    expect(s.active?.stage).toBe('clue');
    expect(timeLeft(s.active!.timer!, 6000)).toBe(9000);
  });

  it('can be backed out of from the splash', () => {
    const s = run(gameWith('swiss'), pick, { type: 'cancelTile' });
    expect(s.phase).toBe('board');
    expect(s.tiles[0][0]).toEqual({ played: false, cheese: 'swiss' });
  });

  it('plays a normal tile without a splash', () => {
    const s = run(gameWith('swiss'), { type: 'selectTile', categoryIndex: 1, clueIndex: 0, at: 0 });
    expect(s.active).toMatchObject({ cheese: null, stage: 'clue' });
  });
});

describe('Golden Gouda (wager)', () => {
  const opened = () => run(gameWith('gouda'), pick, dismiss);

  it('asks for a wager, then the picker answers alone', () => {
    let s = opened();
    expect(s.active?.stage).toBe('wager');
    s = run(s, { type: 'setWager', amount: 750, at: 0 });
    expect(s.active).toMatchObject({ stage: 'clue', value: 750, soloPlayerId: 'p1', selectedPlayerId: 'p1' });
    expect(gameReducer(s, sel('p2'))).toBe(s);
    expect(gameReducer(s, { type: 'buzz', at: 0 })).toBe(s);
    expect(score(run(s, correct), 'p1')).toBe(750);
  });

  it('limits the wager to max(score, highest clue value)', () => {
    let s = opened();
    expect(maxWager(s)).toBe(1000);
    expect(gameReducer(s, { type: 'setWager', amount: 1001, at: 0 })).toBe(s);
    expect(gameReducer(s, { type: 'setWager', amount: -5, at: 0 })).toBe(s);
    expect(run(s, { type: 'setWager', amount: 0, at: 0 }).active?.value).toBe(0);
    s = run(gameWith('gouda'), { type: 'adjustScore', playerId: 'p1', delta: 2500 }, pick, dismiss);
    expect(maxWager(s)).toBe(2500);
  });

  it('a wrong wager costs the wager; then the host reveals and closes', () => {
    let s = run(opened(), { type: 'setWager', amount: 600, at: 0 }, wrong);
    expect(score(s, 'p1')).toBe(-600);
    expect(s.phase).toBe('clue');
    expect(gameReducer(s, sel('p2'))).toBe(s); // nobody else may answer
    s = run(s, reveal, { type: 'noOne' });
    expect(s.tiles[0][0].played).toBe(true);
    expect(s.controlPlayerId).toBe('p1');
  });

  it('Esc backs out before the clue is answered', () => {
    const s = run(opened(), { type: 'setWager', amount: 600, at: 0 });
    expect(escapeAction(s.active!, 0)?.label).toBe('back to board');
  });
});

describe('Swiss (holes)', () => {
  it('wrong answers cost nothing but still lock the player out', () => {
    const s = run(gameWith('swiss'), pick, dismiss, sel('p2'), wrong);
    expect(score(s, 'p2')).toBe(0);
    expect(gameReducer(s, sel('p2'))).toBe(s);
  });
});

describe('Limburger (stink bomb)', () => {
  const opened = () => run(gameWith('limburger'), pick, dismiss);

  it('the picker hands the clue to another player, who answers alone', () => {
    let s = opened();
    expect(s.active?.stage).toBe('handoff');
    expect(gameReducer(s, { type: 'handOff', playerId: 'p1', at: 0 })).toBe(s); // not the picker
    s = run(s, { type: 'handOff', playerId: 'p3', at: 0 });
    expect(s.active).toMatchObject({ stage: 'clue', soloPlayerId: 'p3', selectedPlayerId: 'p3' });
    expect(gameReducer(s, sel('p2'))).toBe(s);
    s = run(s, correct);
    expect(score(s, 'p3')).toBe(200);
    expect(s.controlPlayerId).toBe('p3');
  });

  it('a wrong answer costs the receiver and control stays with the picker', () => {
    const s = run(opened(), { type: 'handOff', playerId: 'p2', at: 0 }, wrong, reveal, { type: 'noOne' });
    expect(score(s, 'p2')).toBe(-200);
    expect(s.controlPlayerId).toBe('p1');
  });
});

describe('Brie (spread)', () => {
  const opened = () => run(gameWith('brie', 10), pick, dismiss);

  it('several players can be marked correct and all score', () => {
    let s = run(opened(), sel('p2'), correct);
    expect(s.phase).toBe('clue');
    expect(s.controlPlayerId).toBe('p2');
    expect(gameReducer(s, sel('p2'))).toBe(s); // already scored
    s = run(s, sel('p3'), correct);
    expect(score(s, 'p2')).toBe(200);
    expect(score(s, 'p3')).toBe(200);
    expect(s.controlPlayerId).toBe('p2'); // first correct keeps control
    expect(escapeAction(s.active!, 0)?.label).toBe('done');
    s = run(s, { type: 'noOne' });
    expect(s.tiles[0][0].played).toBe(true);
  });

  it('wrong answers still cost', () => {
    const s = run(opened(), sel('p1'), wrong);
    expect(score(s, 'p1')).toBe(-200);
  });

  it('cannot back out once someone has scored', () => {
    const s = run(opened(), sel('p1'), correct);
    expect(canCancel(s.active!)).toBe(false);
  });

  it('resumes the timer for the others after a correct answer', () => {
    const s = run(opened(), sel('p1', 2000), { type: 'markCorrect', at: 9000 });
    expect(s.active?.timer?.runningSince).toBe(9000);
  });
});

describe('Mozzarella (stretch)', () => {
  it('doubles the value', () => {
    let s = run(gameWith('mozzarella'), pick);
    expect(s.active?.value).toBe(400);
    s = run(s, dismiss, sel('p2'), correct);
    expect(score(s, 'p2')).toBe(400);
  });
});

describe('Feta (crumble)', () => {
  const lead = (s: GameState) =>
    run(s, { type: 'adjustScore', playerId: 'p1', delta: 1000 }, { type: 'adjustScore', playerId: 'p2', delta: 300 });

  it("a correct answer also steals 10% of the leader's score", () => {
    const s = run(lead(gameWith('feta')), pick, dismiss, sel('p3'), correct);
    expect(score(s, 'p1')).toBe(900);
    expect(score(s, 'p3')).toBe(300); // 200 + 100 stolen
  });

  it('steals nothing when the answerer is the leader', () => {
    const s = run(lead(gameWith('feta')), pick, dismiss, sel('p1'), correct);
    expect(score(s, 'p1')).toBe(1200);
    expect(score(s, 'p2')).toBe(300);
  });

  it('tied leaders each lose 10%, and non-positive leads give nothing', () => {
    const players = [
      { id: 'a', name: 'A', color: '', score: 500 },
      { id: 'b', name: 'B', color: '', score: 500 },
      { id: 'c', name: 'C', color: '', score: 0 },
    ];
    expect(fetaSteal(players, 'c').map((p) => p.score)).toEqual([450, 450, 100]);
    const allZero = players.map((p) => ({ ...p, score: 0 }));
    expect(fetaSteal(allZero, 'c')).toBe(allZero);
  });

  it('a wrong answer is a normal penalty', () => {
    const s = run(gameWith('feta'), pick, dismiss, sel('p2'), wrong);
    expect(score(s, 'p2')).toBe(-200);
  });
});
