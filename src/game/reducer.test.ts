import { describe, expect, it } from 'vitest';
import { createGame, gameReducer, getStandings, getWinners } from './reducer';
import { canUndo, createSession, HISTORY_LIMIT, sessionReducer, type SessionAction } from './history';
import { parseSave, SAVE_VERSION, serializeSession } from './persistence';
import { SAMPLE_BOARD } from './sampleBoard';
import type { Board, GameAction, GameState } from './types';

const PLAYERS = [
  { name: 'Ann', color: '#f00' },
  { name: 'Bo', color: '#0f0' },
  { name: 'Cy', color: '#00f' },
];

function newGame(board: Board = SAMPLE_BOARD): GameState {
  return createGame(board, PLAYERS);
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function score(state: GameState, id: string): number {
  return state.players.find((p) => p.id === id)!.score;
}

/** A 1×2 board, handy for reaching the end of the game quickly. */
const TINY_BOARD: Board = {
  ...SAMPLE_BOARD,
  id: 'tiny',
  categories: [
    {
      name: 'Tiny',
      clues: [
        { value: 100, clue: 'a', answer: 'A' },
        { value: 200, clue: 'b', answer: 'B' },
      ],
    },
  ],
};

describe('createGame', () => {
  it('starts on the board with player 1 in control and zero scores', () => {
    const s = newGame();
    expect(s.phase).toBe('board');
    expect(s.controlPlayerId).toBe('p1');
    expect(s.players.map((p) => p.score)).toEqual([0, 0, 0]);
    expect(s.tiles).toHaveLength(6);
    expect(s.tiles.every((col) => col.length === 5 && col.every((t) => !t.played))).toBe(true);
  });

  it('rejects too few or too many players', () => {
    expect(() => createGame(SAMPLE_BOARD, PLAYERS.slice(0, 1))).toThrow();
    const seven = Array.from({ length: 7 }, (_, i) => ({ name: `P${i}`, color: '#000' }));
    expect(() => createGame(SAMPLE_BOARD, seven)).toThrow();
  });

  it('produces JSON-serializable state', () => {
    const s = run(newGame(), { type: 'selectTile', categoryIndex: 0, clueIndex: 0 });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('selecting a tile', () => {
  it('opens the clue with its value', () => {
    const s = run(newGame(), { type: 'selectTile', categoryIndex: 2, clueIndex: 3 });
    expect(s.phase).toBe('clue');
    expect(s.active).toMatchObject({ categoryIndex: 2, clueIndex: 3, value: 800, answerRevealed: false });
  });

  it('ignores played tiles and out-of-range tiles', () => {
    const played = run(
      newGame(),
      { type: 'selectTile', categoryIndex: 0, clueIndex: 0 },
      { type: 'revealAnswer' },
      { type: 'noOne' },
    );
    expect(gameReducer(played, { type: 'selectTile', categoryIndex: 0, clueIndex: 0 })).toBe(played);
    expect(gameReducer(played, { type: 'selectTile', categoryIndex: 9, clueIndex: 0 })).toBe(played);
  });

  it('reveals the answer', () => {
    const s = run(newGame(), { type: 'selectTile', categoryIndex: 0, clueIndex: 0 }, { type: 'revealAnswer' });
    expect(s.active?.answerRevealed).toBe(true);
  });
});

describe('judging', () => {
  const open = (s: GameState) => run(s, { type: 'selectTile', categoryIndex: 1, clueIndex: 1 }); // 400

  it('correct adds the value, gives board control and closes the tile', () => {
    const s = run(open(newGame()), { type: 'selectPlayer', playerId: 'p2' }, { type: 'markCorrect' });
    expect(score(s, 'p2')).toBe(400);
    expect(s.controlPlayerId).toBe('p2');
    expect(s.tiles[1][1].played).toBe(true);
    expect(s.active).toBeNull();
    expect(s.phase).toBe('board');
  });

  it('wrong subtracts the value and keeps the tile open without changing control', () => {
    const s = run(open(newGame()), { type: 'selectPlayer', playerId: 'p2' }, { type: 'markWrong' });
    expect(score(s, 'p2')).toBe(-400);
    expect(s.controlPlayerId).toBe('p1');
    expect(s.phase).toBe('clue');
    expect(s.tiles[1][1].played).toBe(false);
    expect(s.active?.selectedPlayerId).toBeNull();
    expect(s.active?.wrongPlayerIds).toEqual(['p2']);
  });

  it('locks out a player who answered wrong for the rest of that clue', () => {
    const s = run(open(newGame()), { type: 'selectPlayer', playerId: 'p2' }, { type: 'markWrong' });
    expect(gameReducer(s, { type: 'selectPlayer', playerId: 'p2' })).toBe(s);
    const after = run(s, { type: 'selectPlayer', playerId: 'p3' }, { type: 'markCorrect' });
    expect(score(after, 'p2')).toBe(-400);
    expect(score(after, 'p3')).toBe(400);
    // The lockout doesn't carry over to the next clue.
    const next = run(after, { type: 'selectTile', categoryIndex: 0, clueIndex: 0 });
    expect(gameReducer(next, { type: 'selectPlayer', playerId: 'p2' }).active?.selectedPlayerId).toBe('p2');
  });

  it('ignores correct/wrong when no player is selected', () => {
    const s = open(newGame());
    expect(gameReducer(s, { type: 'markCorrect' })).toBe(s);
    expect(gameReducer(s, { type: 'markWrong' })).toBe(s);
  });

  it('ignores selecting an unknown player', () => {
    const s = open(newGame());
    expect(gameReducer(s, { type: 'selectPlayer', playerId: 'nobody' })).toBe(s);
  });

  it('lets the host change or clear the selection before judging', () => {
    const s = run(open(newGame()), { type: 'selectPlayer', playerId: 'p2' }, { type: 'selectPlayer', playerId: 'p3' });
    expect(s.active?.selectedPlayerId).toBe('p3');
    expect(gameReducer(s, { type: 'selectPlayer', playerId: null }).active?.selectedPlayerId).toBeNull();
  });

  it('"no one" closes the tile with no score or control change', () => {
    const before = open(newGame());
    const s = run(before, { type: 'revealAnswer' }, { type: 'noOne' });
    expect(s.players).toEqual(before.players);
    expect(s.controlPlayerId).toBe('p1');
    expect(s.tiles[1][1].played).toBe(true);
    expect(s.phase).toBe('board');
  });

  it('"no one" is ignored until the answer has been shown', () => {
    const s = open(newGame());
    expect(gameReducer(s, { type: 'noOne' })).toBe(s);
  });

  it('cancelling before the reveal returns to the board with the tile still open', () => {
    const before = newGame();
    const s = run(open(before), { type: 'cancelTile' });
    expect(s.phase).toBe('board');
    expect(s.active).toBeNull();
    expect(s.tiles[1][1].played).toBe(false);
    expect(s.players).toEqual(before.players);
    expect(s.controlPlayerId).toBe(before.controlPlayerId);
  });

  it('cancelling is not allowed after the reveal or after a wrong answer', () => {
    const revealed = run(open(newGame()), { type: 'revealAnswer' });
    expect(gameReducer(revealed, { type: 'cancelTile' })).toBe(revealed);
    const wrong = run(open(newGame()), { type: 'selectPlayer', playerId: 'p1' }, { type: 'markWrong' });
    expect(gameReducer(wrong, { type: 'cancelTile' })).toBe(wrong);
  });

  it('"no one" after wrong answers keeps the penalties', () => {
    const s = run(open(newGame()), { type: 'selectPlayer', playerId: 'p1' }, { type: 'markWrong' }, { type: 'revealAnswer' }, { type: 'noOne' });
    expect(score(s, 'p1')).toBe(-400);
    expect(s.tiles[1][1].played).toBe(true);
  });
});

describe('manual adjustment and control', () => {
  it('adjusts a score up or down, on the board or during a clue', () => {
    let s = run(newGame(), { type: 'adjustScore', playerId: 'p3', delta: 500 });
    expect(score(s, 'p3')).toBe(500);
    s = run(s, { type: 'selectTile', categoryIndex: 0, clueIndex: 0 }, { type: 'adjustScore', playerId: 'p3', delta: -700 });
    expect(score(s, 'p3')).toBe(-200);
    expect(s.phase).toBe('clue');
  });

  it('ignores zero, non-finite or unknown-player adjustments', () => {
    const s = newGame();
    expect(gameReducer(s, { type: 'adjustScore', playerId: 'p1', delta: 0 })).toBe(s);
    expect(gameReducer(s, { type: 'adjustScore', playerId: 'p1', delta: NaN })).toBe(s);
    expect(gameReducer(s, { type: 'adjustScore', playerId: 'zz', delta: 5 })).toBe(s);
  });

  it('lets the host hand board control to a player', () => {
    const s = run(newGame(), { type: 'setControl', playerId: 'p3' });
    expect(s.controlPlayerId).toBe('p3');
  });
});

describe('game end', () => {
  it('goes to results after the last tile closes', () => {
    let s = createGame(TINY_BOARD, PLAYERS);
    s = run(s, { type: 'selectTile', categoryIndex: 0, clueIndex: 0 }, { type: 'revealAnswer' }, { type: 'noOne' });
    expect(s.phase).toBe('board');
    s = run(s, { type: 'selectTile', categoryIndex: 0, clueIndex: 1 }, { type: 'selectPlayer', playerId: 'p2' }, { type: 'markCorrect' });
    expect(s.phase).toBe('results');
    expect(score(s, 'p2')).toBe(200);
  });

  it('does not end the game after a wrong answer on the last tile', () => {
    let s = createGame(TINY_BOARD, PLAYERS);
    s = run(s, { type: 'selectTile', categoryIndex: 0, clueIndex: 0 }, { type: 'revealAnswer' }, { type: 'noOne' });
    s = run(s, { type: 'selectTile', categoryIndex: 0, clueIndex: 1 }, { type: 'selectPlayer', playerId: 'p1' }, { type: 'markWrong' });
    expect(s.phase).toBe('clue');
  });

  it('ends after playing the full sample board', () => {
    let s = newGame();
    SAMPLE_BOARD.categories.forEach((cat, ci) =>
      cat.clues.forEach((_, ri) => {
        s = run(s, { type: 'selectTile', categoryIndex: ci, clueIndex: ri }, { type: 'revealAnswer' }, { type: 'noOne' });
      }),
    );
    expect(s.phase).toBe('results');
  });
});

describe('standings and winners', () => {
  it('ranks by score and names a single winner', () => {
    const s = run(newGame(), { type: 'adjustScore', playerId: 'p2', delta: 300 }, { type: 'adjustScore', playerId: 'p3', delta: 100 });
    expect(getStandings(s.players).map((x) => [x.player.id, x.rank])).toEqual([['p2', 1], ['p3', 2], ['p1', 3]]);
    expect(getWinners(s.players).map((p) => p.id)).toEqual(['p2']);
  });

  it('shares ranks on ties and reports every tied winner', () => {
    const s = run(
      newGame(),
      { type: 'adjustScore', playerId: 'p1', delta: 400 },
      { type: 'adjustScore', playerId: 'p3', delta: 400 },
    );
    expect(getStandings(s.players).map((x) => x.rank)).toEqual([1, 1, 3]);
    expect(getWinners(s.players).map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('treats an all-zero game as a tie between everyone', () => {
    expect(getWinners(newGame().players)).toHaveLength(3);
  });

  it('ranks negative scores correctly', () => {
    const s = run(newGame(), { type: 'adjustScore', playerId: 'p1', delta: -200 });
    expect(getStandings(s.players).map((x) => [x.player.id, x.rank])).toEqual([['p2', 1], ['p3', 1], ['p1', 3]]);
  });
});

describe('undo history', () => {
  const apply = (...actions: SessionAction[]) => actions.reduce(sessionReducer, createSession(newGame()));

  it('undoes judging step by step back to the start', () => {
    const start = createSession(newGame());
    const s = apply(
      { type: 'selectTile', categoryIndex: 0, clueIndex: 0 },
      { type: 'selectPlayer', playerId: 'p1' },
      { type: 'markWrong' },
      { type: 'selectPlayer', playerId: 'p2' },
      { type: 'markCorrect' },
    );
    expect(score(s.present, 'p2')).toBe(200);

    const u1 = sessionReducer(s, { type: 'undo' });
    expect(u1.present.phase).toBe('clue');
    expect(u1.present.active?.selectedPlayerId).toBe('p2');
    expect(score(u1.present, 'p2')).toBe(0);
    expect(u1.present.controlPlayerId).toBe('p1');

    const u3 = sessionReducer(sessionReducer(u1, { type: 'undo' }), { type: 'undo' });
    expect(score(u3.present, 'p1')).toBe(0);
    expect(u3.present.active?.selectedPlayerId).toBe('p1');

    const all = [1, 2, 3].reduce((acc) => sessionReducer(acc, { type: 'undo' }), u3);
    expect(all.present).toEqual(start.present);
    expect(canUndo(all)).toBe(false);
    expect(sessionReducer(all, { type: 'undo' })).toBe(all);
  });

  it('undoes manual score adjustments', () => {
    const s = apply({ type: 'adjustScore', playerId: 'p1', delta: 250 }, { type: 'undo' });
    expect(score(s.present, 'p1')).toBe(0);
  });

  it('undoes the move to results', () => {
    let s = createSession(createGame(TINY_BOARD, PLAYERS));
    for (const a of [
      { type: 'selectTile', categoryIndex: 0, clueIndex: 0 },
      { type: 'revealAnswer' },
      { type: 'noOne' },
      { type: 'selectTile', categoryIndex: 0, clueIndex: 1 },
      { type: 'revealAnswer' },
      { type: 'noOne' },
    ] as SessionAction[]) s = sessionReducer(s, a);
    expect(s.present.phase).toBe('results');
    s = sessionReducer(s, { type: 'undo' });
    expect(s.present.phase).toBe('clue');
    expect(s.present.tiles[0][1].played).toBe(false);
  });

  it('does not record ignored actions', () => {
    const s = apply({ type: 'markCorrect' }, { type: 'revealAnswer' });
    expect(s.past).toHaveLength(0);
  });

  it('caps the history length', () => {
    let s = createSession(newGame());
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      s = sessionReducer(s, { type: 'adjustScore', playerId: 'p1', delta: 1 });
    }
    expect(s.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('save files', () => {
  it('round-trips a session', () => {
    const s = createSession(run(newGame(), { type: 'selectTile', categoryIndex: 0, clueIndex: 0 }));
    const parsed = parseSave(serializeSession(s));
    expect(parsed?.version).toBe(SAVE_VERSION);
    expect(parsed?.session).toEqual(s);
  });

  it('rejects corrupt or other-version saves', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 999, session: createSession(newGame()) }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: SAVE_VERSION }))).toBeNull();
  });
});
