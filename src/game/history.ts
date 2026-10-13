import { gameReducer } from './reducer';
import type { GameAction, GameState } from './types';

/** Maximum number of undo steps kept (and saved). */
export const HISTORY_LIMIT = 300;

/** A game plus its undo stack. Plain JSON, so it can be saved as-is. */
export interface GameSession {
  past: GameState[];
  present: GameState;
}

export type SessionAction = GameAction | { type: 'undo' };

export function createSession(initial: GameState): GameSession {
  return { past: [], present: initial };
}

export function canUndo(session: GameSession): boolean {
  return session.past.length > 0;
}

/**
 * Wraps the game reducer with an undo history of previous states. Actions that
 * the game reducer ignores (it returns the same state) don't create undo steps.
 */
export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  if (action.type === 'undo') {
    if (session.past.length === 0) return session;
    return {
      past: session.past.slice(0, -1),
      present: session.past[session.past.length - 1],
    };
  }
  const next = gameReducer(session.present, action);
  if (next === session.present) return session;
  return {
    past: [...session.past, session.present].slice(-HISTORY_LIMIT),
    present: next,
  };
}
