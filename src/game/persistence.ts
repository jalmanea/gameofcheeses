import type { GameSession } from './history';

export const SAVE_KEY = 'game-of-cheeses:game';
/** Bump when the saved shape changes; older saves are then migrated or discarded. */
export const SAVE_VERSION = 3;

export interface SaveFile {
  version: number;
  savedAt: string;
  session: GameSession;
}

/** Minimal storage interface so this works with localStorage or a test double. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeSession(session: GameSession, now = new Date()): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: now.toISOString(), session };
  return JSON.stringify(file);
}

/** Returns the saved session, or null if missing, corrupt or from an unknown version. */
export function parseSave(raw: string | null): SaveFile | null {
  if (!raw) return null;
  try {
    const file = JSON.parse(raw) as Partial<SaveFile>;
    if (file.version !== SAVE_VERSION) return null; // no migrations yet
    const s = file.session;
    if (!s || !Array.isArray(s.past) || !s.present || !Array.isArray(s.present.players)) {
      return null;
    }
    return file as SaveFile;
  } catch {
    return null;
  }
}

export function loadSave(store: KeyValueStore): SaveFile | null {
  try {
    const file = parseSave(store.getItem(SAVE_KEY));
    if (!file) store.removeItem(SAVE_KEY);
    return file;
  } catch {
    return null;
  }
}

export function writeSave(store: KeyValueStore, session: GameSession): void {
  try {
    store.setItem(SAVE_KEY, serializeSession(session));
  } catch {
    // Storage full or unavailable: the game keeps working, it just won't survive a refresh.
  }
}

export function clearSave(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** localStorage if usable, otherwise null (e.g. blocked in a private window). */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
