// The saved board library (localStorage for now; IndexedDB once image clues arrive).
import type { Board } from '../game/types';
import type { KeyValueStore } from '../game/persistence';
import { SAMPLE_BOARD } from '../game/sampleBoard';

export const LIBRARY_KEY = 'game-of-cheeses:boards';
/** Bump when the stored shape changes, and migrate or discard older data. */
export const LIBRARY_VERSION = 1;

interface LibraryFile {
  version: number;
  boards: Board[];
}

/**
 * Loads the library. The first time (nothing stored yet) it starts with the
 * sample board; after that, an empty library stays empty.
 */
export function loadLibrary(store: KeyValueStore | null): Board[] {
  if (!store) return [SAMPLE_BOARD];
  let raw: string | null;
  try {
    raw = store.getItem(LIBRARY_KEY);
  } catch {
    return [SAMPLE_BOARD];
  }
  if (raw === null) return [SAMPLE_BOARD];
  try {
    const file = JSON.parse(raw) as Partial<LibraryFile>;
    if (file.version === LIBRARY_VERSION && Array.isArray(file.boards)) return file.boards;
  } catch {
    // fall through
  }
  // Unreadable or unknown version: keep the raw data aside rather than losing someone's boards.
  try {
    store.setItem(`${LIBRARY_KEY}:unreadable-${Date.now()}`, raw);
  } catch {
    // ignore
  }
  return [SAMPLE_BOARD];
}

/** Returns false if the boards couldn't be saved (e.g. storage full). */
export function saveLibrary(store: KeyValueStore | null, boards: Board[]): boolean {
  if (!store) return false;
  try {
    const file: LibraryFile = { version: LIBRARY_VERSION, boards };
    store.setItem(LIBRARY_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function upsertBoard(boards: Board[], board: Board): Board[] {
  return boards.some((b) => b.id === board.id)
    ? boards.map((b) => (b.id === board.id ? board : b))
    : [...boards, board];
}

export function newBoardId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
