// Host keyboard shortcuts as a pure mapping, so keys pressed in the audience window can be
// forwarded to the host window and handled the same way.
import { randomWheelSegment } from './cheeses';
import type { SessionAction } from './history';
import { platterSlots } from './platter';
import { escapeAction } from './reducer';
import type { GameState } from './types';

/** The parts of a KeyboardEvent the shortcuts look at. Plain JSON, so it can be sent between windows. */
export interface KeyPress {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat: boolean;
}

/** What a key does: null if it isn't a shortcut right now, otherwise the action (if any) and/or fullscreen. */
export type KeyCommand = { action?: SessionAction; fullscreen?: true } | null;

export function toKeyPress(e: KeyPress): KeyPress {
  const { key, code, shiftKey, ctrlKey, metaKey, altKey, repeat } = e;
  return { key, code, shiftKey, ctrlKey, metaKey, altKey, repeat };
}

/**
 * Host keyboard shortcuts (shown on screen in the shortcut bar):
 *   Space      continue past a Cheese Reveal; then: someone buzzed (hide the question,
 *              pause the timer)
 *   1–6        select the player who buzzed (Limburger: who gets the clue)
 *   C / W      mark the selected player correct / wrong
 *   Enter      reveal the answer (also continues past a Cheese Reveal)
 *   Space      Cheese Wheel: spin, then show the clue
 *   1–8 / X    Cheese Platter: flip that answer slot / strike; Enter ends the round, then closes it
 *   Esc        whatever escapeAction() says: cancel a buzz, back to the board, no one / done
 *   Ctrl+Z     undo
 *   F          fullscreen
 */
export function hostKeyCommand(state: GameState, e: KeyPress, at: number, random: () => number = Math.random): KeyCommand {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
    return { action: { type: 'undo' } };
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;

  const key = e.key.toLowerCase();
  if (key === 'f' && !e.shiftKey) return { fullscreen: true };

  const { phase, active, players, board } = state;
  if (phase !== 'clue' || !active) return null;

  if (key === 'escape') {
    const esc = escapeAction(active, at);
    return esc ? { action: esc.action } : {};
  }
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  const number = digit && !e.shiftKey ? Number(digit[1]) : null;
  const player = number ? players[number - 1] : undefined;

  switch (active.stage) {
    case 'cheese':
      if (key === ' ' || key === 'enter') return { action: { type: 'dismissCheese', at } };
      return null;
    case 'handoff':
      if (player) return { action: { type: 'handOff', playerId: player.id, at } };
      return null;
    case 'wager':
      return null; // typed into the wager box
    case 'spin':
      if (key === ' ' || key === 'enter') {
        return {
          action:
            active.wheelSegment === null ? { type: 'spinWheel', segment: randomWheelSegment(random) } : { type: 'beginClue', at },
        };
      }
      return null;
    case 'platter': {
      const round = active.platter;
      if (!round) return null;
      if (key === 'enter') return { action: round.finished ? { type: 'noOne' } : { type: 'platterEnd' } };
      if (key === 'x') return { action: { type: 'platterStrike' } };
      const answerIndex = number ? platterSlots(board.platterPrompts[round.promptIndex])[number - 1] : undefined;
      if (answerIndex !== undefined) return { action: { type: 'platterReveal', answerIndex } };
      return null;
    }
    case 'clue':
      if (key === ' ') return { action: { type: 'buzz', at } };
      if (key === 'enter') return { action: { type: 'revealAnswer', at } };
      if (key === 'c') return { action: { type: 'markCorrect', at } };
      if (key === 'w') return { action: { type: 'markWrong', at } };
      if (player) return { action: { type: 'selectPlayer', playerId: player.id, at } };
      return null;
  }
}
