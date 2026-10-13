// Core data model (see SPEC.md §6). Everything here must stay plain,
// JSON-serializable data: states are saved to localStorage and will later be
// broadcast to an audience window.

import type { ClueTimer } from './timer';

export type CheeseId =
  | 'gouda'
  | 'swiss'
  | 'parmesan'
  | 'limburger'
  | 'brie'
  | 'mozzarella'
  | 'blue'
  | 'wheel'
  | 'feta'
  | 'platter';

export interface Clue {
  value: number;
  clue: string;
  answer: string;
  imageUrl?: string;
}

export interface Category {
  name: string;
  clues: Clue[];
}

export interface PlatterPrompt {
  prompt: string;
  answers: { text: string; points: number }[];
}

export interface CheeseSettings {
  randomCount: number;
  pool: CheeseId[];
  fixed: { categoryIndex: number; clueIndex: number; cheese: CheeseId }[];
  platterPotMultiplier: number;
}

export interface Board {
  id: string;
  title: string;
  categories: Category[];
  platterPrompts: PlatterPrompt[];
  cheeseSettings: CheeseSettings;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface TileState {
  played: boolean;
  /** Unused in milestone 1; set when cheeses are placed (milestone 3). */
  cheese?: CheeseId;
  agedTurns?: number;
}

/** The clue currently on screen. */
export interface ActiveTile {
  categoryIndex: number;
  clueIndex: number;
  value: number;
  answerRevealed: boolean;
  /**
   * Someone buzzed: the question is hidden from the players (so nobody buzzes early
   * just to get more reading time) and the timer is paused until the host judges.
   */
  buzzed: boolean;
  /** The player the host picked as having buzzed, awaiting a verdict. */
  selectedPlayerId: string | null;
  /** Players who already answered this clue wrong and are locked out. */
  wrongPlayerIds: string[];
  /** Countdown for this clue, or null when the timer is off. */
  timer: ClueTimer | null;
}

export type Phase = 'board' | 'clue' | 'results';

/** Chosen by the host before the game starts. */
export interface GameSettings {
  /** Seconds on the clue timer, or null for no timer. */
  timerSeconds: number | null;
}

export interface GameState {
  /** The board is embedded so a saved game is self-contained. */
  board: Board;
  settings: GameSettings;
  players: Player[];
  controlPlayerId: string;
  tiles: TileState[][];
  active: ActiveTile | null;
  phase: Phase;
}

/**
 * Actions that affect the clue timer carry `at`, the time they happened (epoch ms),
 * so the reducer never reads the clock itself.
 */
export type GameAction =
  | { type: 'selectTile'; categoryIndex: number; clueIndex: number; at: number }
  | { type: 'revealAnswer'; at: number }
  | { type: 'buzz'; at: number }
  | { type: 'selectPlayer'; playerId: string | null; at: number }
  | { type: 'markCorrect' }
  | { type: 'markWrong'; at: number }
  | { type: 'noOne' }
  | { type: 'cancelTile' }
  | { type: 'adjustScore'; playerId: string; delta: number }
  | { type: 'setControl'; playerId: string };

export interface PlayerInput {
  name: string;
  color: string;
}
