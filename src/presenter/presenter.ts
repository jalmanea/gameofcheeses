import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { KeyPress } from '../game/hostKeys';
import type { GameState } from '../game/types';
import { createAudienceLink, createHostLink, openChannel, type AudienceLink, type HostLink } from './link';

/**
 * How the game screen is being shown:
 *   single    one window does everything (no TV window open): answers stay hidden until revealed
 *   host      the host's window while a TV window is open: shows the answers
 *   audience  the TV window: no controls, no answers until revealed
 */
export type ViewMode = 'single' | 'host' | 'audience';

export const ViewContext = createContext<ViewMode>('single');

export function useView(): ViewMode {
  return useContext(ViewContext);
}

const AUDIENCE_PARAM = 'audience';
const AUDIENCE_WINDOW_NAME = 'game-of-cheeses-audience';

export function isAudienceWindow(): boolean {
  return new URLSearchParams(window.location.search).has(AUDIENCE_PARAM);
}

let audienceWindow: Window | null = null;

/** Opens the TV window (or brings it to the front). Returns false if the browser blocked it. */
export function openAudienceWindow(): boolean {
  if (audienceWindow && !audienceWindow.closed) {
    audienceWindow.focus();
    return true;
  }
  const url = new URL(window.location.href);
  url.search = `?${AUDIENCE_PARAM}`;
  url.hash = '';
  audienceWindow = window.open(url.href, AUDIENCE_WINDOW_NAME, 'popup,width=1280,height=720');
  return !!audienceWindow;
}

/** Calls `close` when the page goes away, not just on unmount (React doesn't unmount on tab close). */
function closeOnPageHide(close: () => void): () => void {
  window.addEventListener('pagehide', close);
  return () => {
    window.removeEventListener('pagehide', close);
    close();
  };
}

/**
 * Host side: broadcasts `state` (null outside a game) to any TV windows and passes on keys
 * pressed there. Returns how many TV windows are listening.
 */
export function useHostLink(state: GameState | null, onKey: (press: KeyPress) => void): { supported: boolean; audiences: number } {
  const [audiences, setAudiences] = useState(0);
  const link = useRef<HostLink | null>(null);
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const channel = openChannel();
    if (!channel) return;
    const l = createHostLink(channel, {
      onAudienceCount: setAudiences,
      onKey: (press) => onKeyRef.current(press),
    });
    l.publish(stateRef.current);
    link.current = l;
    const stop = closeOnPageHide(() => l.close());
    return () => {
      link.current = null;
      setAudiences(0);
      stop();
    };
  }, []);

  useEffect(() => {
    link.current?.publish(state);
  }, [state]);

  return { supported: typeof BroadcastChannel !== 'undefined', audiences };
}

export type HostStatus = 'waiting' | 'connected' | 'gone';

/** TV side: the latest state from the host window, and a way to forward key presses to it. */
export function useAudienceLink(): { state: GameState | null; host: HostStatus; sendKey: (press: KeyPress) => void } {
  const [state, setState] = useState<GameState | null>(null);
  const [host, setHost] = useState<HostStatus>('waiting');
  const link = useRef<AudienceLink | null>(null);

  useEffect(() => {
    const channel = openChannel();
    if (!channel) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const l = createAudienceLink(channel, id, {
      onState: (s) => {
        setState(s);
        setHost('connected');
      },
      onHostGone: () => {
        setState(null);
        setHost('gone');
      },
    });
    link.current = l;
    const stop = closeOnPageHide(() => l.close());
    return () => {
      link.current = null;
      stop();
    };
  }, []);

  const sendKey = useRef((press: KeyPress) => link.current?.sendKey(press)).current;
  return { state, host, sendKey };
}
