import { useEffect, useRef } from 'react';
import type { GameSession, SessionAction } from './game/history';
import { toggleFullscreen } from './fullscreen';

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
 *   Space      someone buzzed: hide the question and pause the timer
 *   1–6        select the player who buzzed
 *   C / W      mark the selected player correct / wrong
 *   Enter      reveal the answer
 *   Esc        undo a buzz / clear the selected player (question comes back); otherwise,
 *              before the reveal, go back to the board (tile stays open), and after the
 *              reveal, close the clue (no one)
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

      const { phase, active, players } = s.present;
      if (phase !== 'clue' || !active) return;

      if (key === ' ') return handled({ type: 'buzz', at: Date.now() });
      if (key === 'enter') return handled({ type: 'revealAnswer', at: Date.now() });
      if (key === 'escape') {
        if (active.selectedPlayerId || (active.buzzed && !active.answerRevealed)) {
          return handled({ type: 'selectPlayer', playerId: null, at: Date.now() });
        }
        return handled(active.answerRevealed ? { type: 'noOne' } : { type: 'cancelTile' });
      }
      if (key === 'c') return handled({ type: 'markCorrect' });
      if (key === 'w') return handled({ type: 'markWrong', at: Date.now() });

      const digit = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
      if (digit && !e.shiftKey) {
        const player = players[Number(digit[1]) - 1];
        if (player) return handled({ type: 'selectPlayer', playerId: player.id, at: Date.now() });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
}
