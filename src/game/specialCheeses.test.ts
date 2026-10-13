// Milestone 4: Aged Parmesan, Blue cheese, Cheese Wheel and Cheese Platter.
import { describe, expect, it } from 'vitest';
import { blueValue, parmesanValue, placeCheeses, randomWheelSegment, WHEEL_SEGMENTS } from './cheeses';
import { createSession, sessionReducer } from './history';
import { platterSlots } from './platter';
import { canCancel, createGame, escapeAction, gameReducer, stakeValue } from './reducer';
import { SAMPLE_BOARD } from './sampleBoard';
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

const PICNIC = SAMPLE_BOARD.platterPrompts[1];

function withCheeses(settings: Partial<Board['cheeseSettings']>, platterPrompts = [PICNIC]): Board {
  return {
    ...SAMPLE_BOARD,
    platterPrompts,
    cheeseSettings: { ...SAMPLE_BOARD.cheeseSettings, randomCount: 0, pool: [], fixed: [], ...settings },
  };
}

/** A game where Geography 200 (tile 0,0) holds `cheese`. */
function gameWith(cheese: CheeseId, timerSeconds: number | null = null): GameState {
  const board = withCheeses({ fixed: [{ categoryIndex: 0, clueIndex: 0, cheese }] });
  return createGame(board, PLAYERS, { timerSeconds, cheeses: [cheese] });
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

const pick = (categoryIndex = 0, clueIndex = 0, at = 0) => ({ type: 'selectTile', categoryIndex, clueIndex, at }) as const;
const dismiss = (at = 0) => ({ type: 'dismissCheese', at }) as const;
const sel = (playerId: string | null, at = 0) => ({ type: 'selectPlayer', playerId, at }) as const;
const correct = (at = 0) => ({ type: 'markCorrect', at }) as const;
const wrong = (at = 0) => ({ type: 'markWrong', at }) as const;
const reveal = { type: 'revealAnswer', at: 0 } as const;
const noOne = { type: 'noOne' } as const;
const score = (s: GameState, id: string) => s.players.find((p) => p.id === id)!.score;
/** Plays some other tile and closes it, so a turn passes. */
const passTurn = (ci: number, ri: number): GameAction[] => [pick(ci, ri), reveal, noOne];

describe('Aged Parmesan (ages)', () => {
  it('is never placed at random, only where the author puts it', () => {
    const random = withCheeses({ randomCount: 10, pool: ['parmesan'] });
    expect(placeCheeses(random, ['parmesan'], seeded(1)).flat().some((t) => t.cheese)).toBe(false);
    const fixed = placeCheeses(gameWith('parmesan').board, ['parmesan'], seeded(1));
    expect(fixed[0][0]).toEqual({ played: false, cheese: 'parmesan', agedTurns: 0 });
  });

  it('grows 10% of its value each turn it stays unpicked, up to triple', () => {
    expect(parmesanValue(200, 0)).toBe(200);
    expect(parmesanValue(200, 3)).toBe(260);
    expect(parmesanValue(200, 20)).toBe(600);
    expect(parmesanValue(200, 50)).toBe(600);
  });

  it('ages when other tiles close, but not when one is backed out of', () => {
    let s = run(gameWith('parmesan'), ...passTurn(1, 0), ...passTurn(1, 1));
    expect(s.tiles[0][0].agedTurns).toBe(2);
    s = run(s, pick(1, 2), { type: 'cancelTile' });
    expect(s.tiles[0][0].agedTurns).toBe(2);
    s = run(s, ...passTurn(1, 2), pick(), dismiss(), sel('p2'), correct());
    expect(score(s, 'p2')).toBe(260);
    expect(s.tiles[0][0]).toMatchObject({ played: true, agedTurns: 3 });
  });
});

describe('Blue cheese (moldy)', () => {
  const opened = (at = 0) => run(gameWith('blue', 15), pick(), dismiss(at));

  it('loses 5% of its value per full second, down to a fifth', () => {
    expect(blueValue(200, 999)).toBe(200);
    expect(blueValue(200, 1000)).toBe(190);
    expect(blueValue(1000, 4500)).toBe(800);
    expect(blueValue(1000, 60_000)).toBe(200);
  });

  it('decays from when the clue appears and freezes when someone buzzes', () => {
    let s = opened(10_000);
    expect(stakeValue(s.active!, 13_000)).toBe(170);
    s = run(s, { type: 'buzz', at: 13_000 }, sel('p2', 14_000));
    expect(stakeValue(s.active!, 99_000)).toBe(170);
    s = run(s, correct(20_000));
    expect(score(s, 'p2')).toBe(170);
  });

  it('a wrong answer costs the decayed value, then decay carries on for the others', () => {
    let s = run(opened(0), sel('p1', 2000), wrong(5000));
    expect(score(s, 'p1')).toBe(-180);
    expect(stakeValue(s.active!, 7000)).toBe(160); // 4 seconds of decay in all
    s = run(s, sel('p2', 7000), correct(8000));
    expect(score(s, 'p2')).toBe(160);
  });

  it('stops decaying when the answer is shown, and cancelling a buzz resumes it', () => {
    let s = run(opened(0), { type: 'buzz', at: 1000 }, sel(null, 3000));
    expect(stakeValue(s.active!, 4000)).toBe(180);
    s = run(s, { type: 'revealAnswer', at: 4000 });
    expect(stakeValue(s.active!, 50_000)).toBe(180);
  });

  it("doesn't decay on the reveal splash", () => {
    const s = run(gameWith('blue'), pick(), dismiss(60_000));
    expect(stakeValue(s.active!, 60_500)).toBe(200);
  });
});

describe('Cheese Wheel (spin)', () => {
  const opened = () => run(gameWith('wheel', 10), pick(), dismiss());

  it('spins for a multiplier before the clue', () => {
    let s = opened();
    expect(s.active).toMatchObject({ stage: 'spin', wheelSegment: null, timer: null });
    expect(gameReducer(s, { type: 'beginClue', at: 0 })).toBe(s); // must spin first
    s = run(s, { type: 'spinWheel', segment: WHEEL_SEGMENTS.indexOf(1.5) });
    expect(s.active).toMatchObject({ stage: 'spin', value: 300 });
    expect(gameReducer(s, { type: 'spinWheel', segment: 0 })).toBe(s); // one spin only
    s = run(s, { type: 'beginClue', at: 1000 }, sel('p3'), correct());
    expect(score(s, 'p3')).toBe(300);
  });

  it('can halve the value', () => {
    const s = run(opened(), { type: 'spinWheel', segment: WHEEL_SEGMENTS.indexOf(0.5) }, { type: 'beginClue', at: 0 }, sel('p2'), wrong());
    expect(score(s, 'p2')).toBe(-100);
  });

  it('ignores segments that are not on the wheel', () => {
    const s = opened();
    expect(gameReducer(s, { type: 'spinWheel', segment: 5 })).toBe(s);
    expect(gameReducer(s, { type: 'spinWheel', segment: -1 })).toBe(s);
  });

  it('picks every segment with the given random source', () => {
    expect(randomWheelSegment(() => 0)).toBe(0);
    expect(randomWheelSegment(() => 0.999999)).toBe(WHEEL_SEGMENTS.length - 1);
  });

  it('can be backed out of before the clue is answered', () => {
    const s = run(opened(), { type: 'spinWheel', segment: 4 });
    expect(escapeAction(s.active!, 0)?.label).toBe('back to board');
    expect(run(s, { type: 'cancelTile' }).phase).toBe('board');
  });
});

describe('Cheese Platter (survey)', () => {
  // The picnic prompt, most popular first: Sandwiches 34, A blanket 26, Drinks 15, Fruit 11, Chips 8, A basket 6.
  const slots = platterSlots(PICNIC);
  const flip = (slot: number) => ({ type: 'platterReveal', answerIndex: slots[slot] }) as const;
  const strike = { type: 'platterStrike' } as const;
  const opened = () => run(gameWith('platter'), { type: 'setControl', playerId: 'p2' }, pick(), dismiss());

  it('gives every Platter its own prompt, and places no more Platters than there are prompts', () => {
    const board = withCheeses({ randomCount: 10, pool: ['platter'] }, SAMPLE_BOARD.platterPrompts);
    const platters = placeCheeses(board, ['platter'], seeded(2)).flat().filter((t) => t.cheese === 'platter');
    expect(platters).toHaveLength(3);
    expect(new Set(platters.map((t) => t.platterPrompt)).size).toBe(3);
    const none = withCheeses({ fixed: [{ categoryIndex: 0, clueIndex: 0, cheese: 'platter' }] }, []);
    expect(placeCheeses(none, ['platter'], seeded(2))[0][0].cheese).toBeUndefined();
  });

  it('starts a survey round with the picker, for a pot of twice the tile value', () => {
    const s = opened();
    expect(s.active).toMatchObject({ stage: 'platter', value: 400, timer: null });
    expect(s.active?.platter).toMatchObject({ found: [], turnPlayerId: 'p2', finished: false });
    expect(slots.map((i) => PICNIC.answers[i].points)).toEqual([34, 26, 15, 11, 8, 6]);
  });

  it('pays each answer its share of the pot, and play goes round the table', () => {
    let s = run(opened(), flip(0));
    expect(score(s, 'p2')).toBe(136); // 34% of 400
    expect(s.active?.platter?.turnPlayerId).toBe('p3');
    s = run(s, flip(4), flip(1));
    expect(score(s, 'p3')).toBe(32);
    expect(score(s, 'p1')).toBe(104);
    expect(s.active?.platter?.turnPlayerId).toBe('p2');
    expect(gameReducer(s, flip(0))).toBe(s); // already flipped
  });

  it('a pot multiplier from the board changes the payouts', () => {
    const board = { ...gameWith('platter').board, cheeseSettings: { ...gameWith('platter').board.cheeseSettings, platterPotMultiplier: 3 } };
    const s = run(createGame(board, PLAYERS, { timerSeconds: null, cheeses: ['platter'] }), pick(), dismiss(), flip(0));
    expect(score(s, 'p1')).toBe(204); // 34% of 600
  });

  it('two strikes and a player is out; the round ends when everyone is out', () => {
    let s = run(opened(), strike); // p2: 1
    expect(s.active?.platter?.turnPlayerId).toBe('p3');
    s = run(s, strike, strike, strike); // p3: 1, p1: 1, p2: 2 (out)
    expect(s.active?.platter?.turnPlayerId).toBe('p3');
    s = run(s, flip(2), strike); // p3 scores, p1 out
    expect(s.active?.platter?.turnPlayerId).toBe('p3'); // only p3 is left
    s = run(s, strike);
    expect(s.active?.platter).toMatchObject({ finished: true, turnPlayerId: null });
    expect(score(s, 'p3')).toBe(60);
    expect(gameReducer(s, flip(0))).toBe(s);
  });

  it('ends when every answer is found, and closing leaves control with the picker', () => {
    let s = run(opened(), ...slots.map((_, i) => flip(i)));
    expect(s.active?.platter?.finished).toBe(true);
    expect(escapeAction(s.active!, 0)?.label).toBe('done');
    s = run(s, noOne);
    expect(s.phase).toBe('board');
    expect(s.tiles[0][0].played).toBe(true);
    expect(s.controlPlayerId).toBe('p2');
    expect(s.players.reduce((sum, p) => sum + p.score, 0)).toBe(400);
  });

  it('the host can end the round early, which shows the remaining answers', () => {
    let s = opened();
    expect(escapeAction(s.active!, 0)?.label).toBe('back to board');
    s = run(s, flip(1));
    expect(canCancel(s.active!)).toBe(false);
    expect(escapeAction(s.active!, 0)?.label).toBe('end round');
    expect(gameReducer(s, noOne)).toBe(s); // not over yet
    s = run(s, { type: 'platterEnd' });
    expect(s.active?.platter?.finished).toBe(true);
    expect(run(s, noOne).phase).toBe('board');
  });

  it('can be undone one answer at a time', () => {
    let session = createSession(opened());
    session = sessionReducer(session, flip(0));
    session = sessionReducer(session, strike);
    session = sessionReducer(session, { type: 'undo' });
    expect(session.present.active?.platter?.strikes).toEqual({});
    session = sessionReducer(session, { type: 'undo' });
    expect(score(session.present, 'p2')).toBe(0);
  });
});
