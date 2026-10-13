import { useEffect, useRef } from 'react';
import type { GameSession, SessionAction } from './game/history';
import { toggleFullscreen } from './fullscreen';
import { randomWheelSegment } from './game/cheeses';
import { platterSlots } from './game/platter';
import { escapeAction } from './game/reducer';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
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
 * Pass a null session to disable them (e.g. outside a game).
 */
export function useHostKeys(session: GameSession | null, dispatch: (a: SessionAction) => void) {
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = sessionRef.current;
      if (!s || isTyping(e.target)) return;

      const handled = (action?: SessionAction) => {
        e.preventDefault();
        if (action) dispatch(action);
      };

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        return handled({ type: 'undo' });
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;

      const key = e.key.toLowerCase();
      if (key === 'f' && !e.shiftKey) {
        toggleFullscreen();
        return handled();
      }

      const { phase, active, players, board } = s.present;
      if (phase !== 'clue' || !active) return;
      const at = Date.now();

      if (key === 'escape') {
        const esc = escapeAction(active, at);
        return handled(esc?.action);
      }
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      const number = digit && !e.shiftKey ? Number(digit[1]) : null;
      const player = number ? players[number - 1] : undefined;

      switch (active.stage) {
        case 'cheese':
          if (key === ' ' || key === 'enter') return handled({ type: 'dismissCheese', at });
          return;
        case 'handoff':
          if (player) return handled({ type: 'handOff', playerId: player.id, at });
          return;
        case 'wager':
          return; // typed into the wager box
        case 'spin':
          if (key === ' ' || key === 'enter') {
            return handled(
              active.wheelSegment === null ? { type: 'spinWheel', segment: randomWheelSegment() } : { type: 'beginClue', at },
            );
          }
          return;
        case 'platter': {
          const round = active.platter;
          if (!round) return;
          if (key === 'enter') return handled(round.finished ? { type: 'noOne' } : { type: 'platterEnd' });
          if (key === 'x') return handled({ type: 'platterStrike' });
          const answerIndex = number ? platterSlots(board.platterPrompts[round.promptIndex])[number - 1] : undefined;
          if (answerIndex !== undefined) return handled({ type: 'platterReveal', answerIndex });
          return;
        }
        case 'clue':
          if (key === ' ') return handled({ type: 'buzz', at });
          if (key === 'enter') return handled({ type: 'revealAnswer', at });
          if (key === 'c') return handled({ type: 'markCorrect', at });
          if (key === 'w') return handled({ type: 'markWrong', at });
          if (player) return handled({ type: 'selectPlayer', playerId: player.id, at });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
}
