// Runs over Node's real BroadcastChannel, like two browser windows.
import { afterEach, describe, expect, it } from 'vitest';
import type { KeyPress } from '../game/hostKeys';
import { createGame } from '../game/reducer';
import { SAMPLE_BOARD } from '../game/sampleBoard';
import type { GameState } from '../game/types';
import { CHANNEL_NAME, createAudienceLink, createHostLink, isPresenterMessage, type ChannelLike } from './link';

const STATE = createGame(SAMPLE_BOARD, [{ name: 'Ann', color: '#f00' }, { name: 'Bo', color: '#0f0' }], {
  timerSeconds: null,
  cheeses: [],
});

const SPACE: KeyPress = { key: ' ', code: 'Space', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, repeat: false };

const open: ChannelLike[] = [];
const links: { close(): void }[] = [];
function channel(): ChannelLike {
  const c = new BroadcastChannel(CHANNEL_NAME) as unknown as ChannelLike;
  open.push(c);
  return c;
}
afterEach(() => {
  for (const l of links.splice(0)) l.close();
  for (const c of open.splice(0)) c.close();
});

/** Lets queued channel messages arrive (generously, so a busy machine doesn't make tests flaky). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 75));

function host() {
  const seen = { counts: [] as number[], keys: [] as KeyPress[] };
  const link = createHostLink(channel(), {
    onAudienceCount: (n) => seen.counts.push(n),
    onKey: (k) => seen.keys.push(k),
  });
  links.push(link);
  return { link, seen };
}

function audience(id: string) {
  const seen = { states: [] as (GameState | null)[], gone: 0 };
  const link = createAudienceLink(channel(), id, {
    onState: (s) => seen.states.push(s),
    onHostGone: () => seen.gone++,
  });
  links.push(link);
  return { link, seen };
}

describe('presenter link', () => {
  it('sends a new audience window the current state, then every change', async () => {
    const h = host();
    h.link.publish(STATE);
    const a = audience('tv');
    await settle();
    expect(h.seen.counts).toEqual([1]);
    expect(a.seen.states).toEqual([STATE]);

    h.link.publish(null);
    await settle();
    expect(a.seen.states).toEqual([STATE, null]);
  });

  it('finds audience windows that were open before the host (re)loaded', async () => {
    const a = audience('tv');
    await settle();
    const h = host();
    h.link.publish(STATE);
    await settle();
    expect(h.seen.counts).toEqual([1]);
    expect(a.seen.states.at(-1)).toEqual(STATE);
  });

  it('counts audience windows coming and going', async () => {
    const h = host();
    const a = audience('a');
    const b = audience('b');
    await settle();
    expect(h.seen.counts.at(-1)).toBe(2);
    a.link.close();
    await settle();
    expect(h.seen.counts.at(-1)).toBe(1);
    b.link.close();
    await settle();
    expect(h.seen.counts.at(-1)).toBe(0);
  });

  it('forwards key presses to the host, and tells audiences when the host closes', async () => {
    const h = host();
    const a = audience('tv');
    await settle();
    a.link.sendKey(SPACE);
    await settle();
    expect(h.seen.keys).toEqual([SPACE]);

    h.link.close();
    await settle();
    expect(a.seen.gone).toBe(1);
  });

  it('forgets audience windows that go quiet without saying bye, but not live ones', async () => {
    const timing = { heartbeatMs: 30, timeoutMs: 100 };
    const seen: number[] = [];
    const h = createHostLink(channel(), { onAudienceCount: (n) => seen.push(n), onKey: () => {} }, timing);
    // A window that says hello once and then crashes.
    channel().postMessage({ type: 'hello', id: 'crashed' });
    const live = createAudienceLink(channel(), 'live', { onState: () => {}, onHostGone: () => {} }, timing);
    await settle();
    expect(seen.at(-1)).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(seen.at(-1)).toBe(1); // only the crashed one was dropped
    links.push(live, h);
  });

  it('can be closed twice, and sends nothing afterwards', () => {
    const h = host();
    h.link.close();
    expect(() => h.link.close()).not.toThrow();
    expect(() => h.link.publish(STATE)).not.toThrow();
    const a = audience('tv');
    a.link.close();
    expect(() => a.link.close()).not.toThrow();
    expect(() => a.link.sendKey(SPACE)).not.toThrow();
  });

  it('ignores anything that is not a presenter message', () => {
    expect(isPresenterMessage({ type: 'state', state: STATE })).toBe(true);
    expect(isPresenterMessage({ type: 'state', state: null })).toBe(true);
    expect(isPresenterMessage({ type: 'state', state: { nope: 1 } })).toBe(false);
    expect(isPresenterMessage({ type: 'hello' })).toBe(false);
    expect(isPresenterMessage({ type: 'key', id: 'x', press: null })).toBe(false);
    expect(isPresenterMessage('hello')).toBe(false);
    expect(isPresenterMessage(null)).toBe(false);
  });
});
