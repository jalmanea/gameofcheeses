import { describe, expect, it } from 'vitest';
import { createGame, gameReducer } from './reducer';
import { SAMPLE_BOARD } from './sampleBoard';
import { soundCues } from './soundCues';
import type { Board, CheeseId, GameAction, GameState } from './types';

const PLAYERS = [
  { name: 'Ann', color: '#f00' },
  { name: 'Bo', color: '#0f0' },
];

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

/** Applies each action in turn and collects the cues of every step. */
function cuesOf(state: GameState, ...actions: GameAction[]): string[][] {
  const out: string[][] = [];
  for (const action of actions) {
    const next = gameReducer(state, action);
    out.push(soundCues(state, next));
    state = next;
  }
  return out;
}

const pick = { type: 'selectTile', categoryIndex: 0, clueIndex: 0, at: 0 } as const;
const buzz = { type: 'buzz', at: 0 } as const;
const reveal = { type: 'revealAnswer', at: 0 } as const;
const sel = (playerId: string) => ({ type: 'selectPlayer', playerId, at: 0 }) as const;

describe('soundCues', () => {
  it('plays a clue from pick to correct answer', () => {
    const s = game();
    const [ann] = s.players;
    expect(cuesOf(s, pick, buzz, sel(ann.id), { type: 'markCorrect', at: 0 })).toEqual([['select'], ['buzz'], [], ['correct']]);
  });

  it('plays a wrong answer, then the reveal', () => {
    const s = game();
    const [ann] = s.players;
    expect(cuesOf(s, pick, sel(ann.id), { type: 'markWrong', at: 0 }, reveal)).toEqual([['select'], ['buzz'], ['wrong'], ['reveal']]);
  });

  it('says nothing when a buzz is cancelled', () => {
    const s = game();
    expect(cuesOf(s, pick, sel(s.players[0].id), sel(s.players[0].id))).toEqual([['select'], ['buzz'], []]);
  });

  it('opens a cheese with its reveal, and spins the wheel', () => {
    const s = game('wheel');
    expect(cuesOf(s, pick, { type: 'dismissCheese', at: 0 }, { type: 'spinWheel', segment: 2 })).toEqual([['cheese'], [], ['spin']]);
  });

  it('flips Platter answers and gives strikes', () => {
    const s = gameReducer(gameReducer(game('platter'), pick), { type: 'dismissCheese', at: 0 });
    const answerIndex = 0;
    expect(cuesOf(s, { type: 'platterReveal', answerIndex }, { type: 'platterStrike' })).toEqual([['platterFound'], ['strike']]);
  });

  it('celebrates when the game ends', () => {
    let s = game();
    const results = { ...s, phase: 'results' as const };
    expect(soundCues(s, results)).toEqual(['results']);
    s = results;
    expect(soundCues(s, s)).toEqual([]);
  });
});
