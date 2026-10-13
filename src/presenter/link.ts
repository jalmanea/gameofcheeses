// Presenter mode (SPEC.md §1, §6): the host window owns the game and broadcasts every new
// state; audience windows (on the TV) render those snapshots. Both sides talk over a
// BroadcastChannel, so this works between windows of the same browser with no backend.
import type { KeyPress } from '../game/hostKeys';
import type { GameState } from '../game/types';

export const CHANNEL_NAME = 'game-of-cheeses:presenter';

export type PresenterMessage =
  /** Host → audience: what to show. null when the host isn't in a game (library, editor…). */
  | { type: 'state'; state: GameState | null }
  /** Host → audience: the host window closed. */
  | { type: 'hostGone' }
  /** Host → audience: who's there? (sent when the host window opens or reloads) */
  | { type: 'who' }
  /** Audience → host: an audience window opened or answered `who`; repeated as a heartbeat. */
  | { type: 'hello'; id: string }
  /** Audience → host: an audience window closed. */
  | { type: 'bye'; id: string }
  /** Audience → host: a key pressed in the audience window, to be handled as a host shortcut. */
  | { type: 'key'; id: string; press: KeyPress };

/** The bits of BroadcastChannel used here, so tests can pass a fake. */
export interface ChannelLike {
  postMessage(message: unknown): void;
  close(): void;
  onmessage: ((event: MessageEvent) => void) | null;
}

export function openChannel(): ChannelLike | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Checks the shape of an incoming message; anything else on the channel is ignored. */
export function isPresenterMessage(data: unknown): data is PresenterMessage {
  if (!isObject(data)) return false;
  switch (data.type) {
    case 'state':
      return data.state === null || (isObject(data.state) && Array.isArray(data.state.players));
    case 'hostGone':
    case 'who':
      return true;
    case 'hello':
    case 'bye':
      return typeof data.id === 'string';
    case 'key':
      return typeof data.id === 'string' && isObject(data.press) && typeof data.press.key === 'string';
    default:
      return false;
  }
}

/**
 * Audience windows say hello this often. A window that closes without saying bye
 * (crash, killed tab) is forgotten after AUDIENCE_TIMEOUT_MS, so the host's window
 * stops showing answers it would otherwise think only the host can see.
 */
export const HEARTBEAT_MS = 2000;
export const AUDIENCE_TIMEOUT_MS = 5000;

export interface LinkTiming {
  heartbeatMs: number;
  timeoutMs: number;
}
const DEFAULT_TIMING: LinkTiming = { heartbeatMs: HEARTBEAT_MS, timeoutMs: AUDIENCE_TIMEOUT_MS };

export interface HostLink {
  /** Sends the current state to every audience window (and remembers it for new ones). */
  publish(state: GameState | null): void;
  close(): void;
}

export function createHostLink(
  channel: ChannelLike,
  handlers: { onAudienceCount(count: number): void; onKey(press: KeyPress): void },
  timing: LinkTiming = DEFAULT_TIMING,
): HostLink {
  /** Audience window id → when it was last heard from. */
  const audiences = new Map<string, number>();
  let latest: GameState | null = null;
  let closed = false;
  // Posting on a closed channel throws, and close() may run twice (pagehide, then unmount).
  const post = (m: PresenterMessage) => {
    if (closed) return;
    try {
      channel.postMessage(m);
    } catch {
      // The channel was closed underneath us; nothing to tell anyone.
    }
  };

  channel.onmessage = (event) => {
    const m: unknown = event.data;
    if (!isPresenterMessage(m)) return;
    if (m.type === 'hello') {
      const isNew = !audiences.has(m.id);
      audiences.set(m.id, Date.now());
      if (isNew) {
        handlers.onAudienceCount(audiences.size);
        post({ type: 'state', state: latest });
      }
    } else if (m.type === 'bye') {
      if (audiences.delete(m.id)) handlers.onAudienceCount(audiences.size);
    } else if (m.type === 'key') {
      handlers.onKey(m.press);
    }
  };
  post({ type: 'who' });

  const prune = setInterval(() => {
    const before = audiences.size;
    for (const [id, seen] of audiences) {
      if (Date.now() - seen > timing.timeoutMs) audiences.delete(id);
    }
    if (audiences.size !== before) handlers.onAudienceCount(audiences.size);
  }, Math.min(1000, timing.heartbeatMs));

  return {
    publish(state) {
      latest = state;
      post({ type: 'state', state });
    },
    close() {
      if (closed) return;
      post({ type: 'hostGone' });
      closed = true;
      clearInterval(prune);
      channel.onmessage = null;
      channel.close();
    },
  };
}

export interface AudienceLink {
  sendKey(press: KeyPress): void;
  close(): void;
}

export function createAudienceLink(
  channel: ChannelLike,
  id: string,
  handlers: { onState(state: GameState | null): void; onHostGone(): void },
  timing: LinkTiming = DEFAULT_TIMING,
): AudienceLink {
  let closed = false;
  // Posting on a closed channel throws, and close() may run twice (pagehide, then unmount).
  const post = (m: PresenterMessage) => {
    if (closed) return;
    try {
      channel.postMessage(m);
    } catch {
      // The channel was closed underneath us; nothing to tell anyone.
    }
  };

  channel.onmessage = (event) => {
    const m: unknown = event.data;
    if (!isPresenterMessage(m)) return;
    if (m.type === 'state') handlers.onState(m.state);
    else if (m.type === 'hostGone') handlers.onHostGone();
    else if (m.type === 'who') post({ type: 'hello', id });
  };
  post({ type: 'hello', id });
  const heartbeat = setInterval(() => post({ type: 'hello', id }), timing.heartbeatMs);

  return {
    sendKey(press) {
      post({ type: 'key', id, press });
    },
    close() {
      if (closed) return;
      post({ type: 'bye', id });
      closed = true;
      clearInterval(heartbeat);
      channel.onmessage = null;
      channel.close();
    },
  };
}
