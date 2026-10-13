import { describe, expect, it } from 'vitest';
import { hostKeyCommand, type KeyPress } from './hostKeys';
import { createGame, gameReducer } from './reducer';
import { SAMPLE_BOARD } from './sampleBoard';
import type { Board, CheeseId, GameAction, GameState } from './types';

const PLAYERS = [
  { name: 'Ann', color: '#f00' },
  { name: 'Bo', color: '#0f0' },
];

function press(key: string, extra: Partial<KeyPress> = {}): KeyPress {
  const code = /^[1-9]$/.test(key) ? `Digit${key}` : key === ' ' ? 'Space' : `Key${key.toUpperCase()}`;
  return { key, code, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...extra };
}

function game(cheese?: CheeseId): GameState {
  const board: Board = {
    ...SAMPLE_BOARD,
    cheeseSettings: {
      ...SAMPLE_BOARD.cheeseSettings,
      randomCount: 0,
      pool: [],
      fixed: cheese ? [{ categoryIndex: 0, clueIndex: 0, cheese }] : [],
    },
  };
  return createGame(board, PLAYERS, { timerSeconds: null, cheeses: cheese ? [cheese] : [] });
}

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const pick = { type: 'selectTile', categoryIndex: 0, clueIndex: 0, at: 0 } as const;

describe('hostKeyCommand', () => {
  it('undoes with Ctrl+Z and goes fullscreen with F anywhere in the game', () => {
    const s = game();
    expect(hostKeyCommand(s, press('z', { ctrlKey: true }), 0)).toEqual({ action: { type: 'undo' } });
    expect(hostKeyCommand(s, press('f'), 0)).toEqual({ fullscreen: true });
  });

  it('ignores other keys on the board, key repeats and modified keys', () => {
    const s = game();
    expect(hostKeyCommand(s, press(' '), 0)).toBeNull();
    const clue = run(s, pick);
    expect(hostKeyCommand(clue, press(' ', { repeat: true }), 0)).toBeNull();
    expect(hostKeyCommand(clue, press('c', { altKey: true }), 0)).toBeNull();
  });

  it('maps the clue keys, timestamped', () => {
    const s = run(game(), pick);
    expect(hostKeyCommand(s, press(' '), 5)).toEqual({ action: { type: 'buzz', at: 5 } });
    expect(hostKeyCommand(s, press('Enter'), 5)).toEqual({ action: { type: 'revealAnswer', at: 5 } });
    expect(hostKeyCommand(s, press('2'), 5)).toEqual({ action: { type: 'selectPlayer', playerId: s.players[1].id, at: 5 } });
    expect(hostKeyCommand(s, press('3'), 5)).toBeNull(); // only two players
    expect(hostKeyCommand(s, press('Escape'), 5)?.action).toEqual({ type: 'cancelTile' });
  });

  it('spins the wheel with the injected randomness, then shows the clue', () => {
    const s = run(game('wheel'), pick, { type: 'dismissCheese', at: 0 });
    expect(hostKeyCommand(s, press(' '), 0, () => 0.99)).toEqual({ action: { type: 'spinWheel', segment: 4 } });
    const spun = run(s, { type: 'spinWheel', segment: 4 });
    expect(hostKeyCommand(spun, press(' '), 7)).toEqual({ action: { type: 'beginClue', at: 7 } });
  });

  it('leaves the wager stage to the wager box', () => {
    const s = run(game('gouda'), pick, { type: 'dismissCheese', at: 0 });
    expect(s.active?.stage).toBe('wager');
    expect(hostKeyCommand(s, press('1'), 0)).toBeNull();
  });
});
