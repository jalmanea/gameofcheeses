import { useEffect, useRef } from 'react';
import type { GameSession, SessionAction } from './game/history';
import { hostKeyCommand, toKeyPress, type KeyPress } from './game/hostKeys';
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
 * Host keyboard shortcuts (see hostKeyCommand for the list). Returns a handler for
 * key presses forwarded from the audience window, which go through the same mapping
 * (minus fullscreen, which the audience window handles for itself).
 * Pass a null session to disable them (e.g. outside a game).
 */
export function useHostKeys(session: GameSession | null, dispatch: (a: SessionAction) => void): (press: KeyPress) => void {
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = sessionRef.current;
      if (!s || isTyping(e.target)) return;
      const command = hostKeyCommand(s.present, toKeyPress(e), Date.now());
      if (!command) return;
      e.preventDefault();
      if (command.fullscreen) toggleFullscreen();
      if (command.action) dispatch(command.action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);

  const forwardedRef = useRef((press: KeyPress) => {
    const s = sessionRef.current;
    const action = s && hostKeyCommand(s.present, press, Date.now())?.action;
    if (action) dispatch(action);
  });
  return forwardedRef.current;
}
