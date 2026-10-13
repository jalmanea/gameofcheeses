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
 *   Space      reveal the answer; once revealed (and nobody is selected), close the clue
 *   1–6        select the player who buzzed
 *   C / W      mark the selected player correct / wrong
 *   Esc        clear the selected player, otherwise close the clue (no one)
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

      if (key === ' ') {
        if (!active.answerRevealed) return handled({ type: 'revealAnswer' });
        // Don't skip past a player who is waiting for a verdict.
        return handled(active.selectedPlayerId ? undefined : { type: 'noOne' });
      }
      if (key === 'escape') {
        return handled(active.selectedPlayerId ? { type: 'selectPlayer', playerId: null } : { type: 'noOne' });
      }
      if (key === 'c') return handled({ type: 'markCorrect' });
      if (key === 'w') return handled({ type: 'markWrong' });

      const digit = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
      if (digit && !e.shiftKey) {
        const player = players[Number(digit[1]) - 1];
        if (player) return handled({ type: 'selectPlayer', playerId: player.id });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
}
