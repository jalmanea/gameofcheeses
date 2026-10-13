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
  /** Hidden cheese on this tile, placed when the game starts. */
  cheese?: CheeseId;
  /** Aged Parmesan: how many turns it has gone unpicked. */
  agedTurns?: number;
  /** Cheese Platter: which of the board's Platter prompts this tile uses. */
  platterPrompt?: number;
}

/**
 * Where a clue is in its flow:
 * - cheese: the Cheese Reveal splash is showing
 * - wager: Gouda, waiting for the picker's wager
 * - handoff: Limburger, waiting for the picker to choose who answers
 * - spin: Cheese Wheel, spinning for a multiplier
 * - clue: the clue is in play
 * - platter: Cheese Platter, the survey round replaces the clue
 */
export type ClueStage = 'cheese' | 'wager' | 'handoff' | 'spin' | 'clue' | 'platter';

/** A Cheese Platter survey round in progress. */
export interface PlatterRound {
  promptIndex: number;
  /** Answers flipped so far, in order, with the player who found each. */
  found: { answerIndex: number; playerId: string }[];
  /** Strikes per player id; two strikes and a player is out of this round. */
  strikes: Record<string, number>;
  /** Whose turn it is to answer, or null once the round is over. */
  turnPlayerId: string | null;
  /** Over: every answer found, every player out, or ended by the host. All answers are shown. */
  finished: boolean;
}

/** The clue currently on screen. */
export interface ActiveTile {
  categoryIndex: number;
  clueIndex: number;
  /**
   * Points at stake: the clue value, doubled by Mozzarella, aged by Parmesan, multiplied
   * by the Wheel, or the Gouda wager. For Blue cheese it's the value before decay, and
   * for the Platter it's the pot.
   */
  value: number;
  cheese: CheeseId | null;
  stage: ClueStage;
  /** Who had board control when the tile was picked. */
  pickerId: string;
  /** Set when one player answers alone (Gouda, Limburger); nobody else can be selected. */
  soloPlayerId: string | null;
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
  /** Players marked correct so far (more than one only with Brie). */
  correctPlayerIds: string[];
  /** Countdown for this clue (starts once the clue is in play), or null when off. */
  timer: ClueTimer | null;
  /**
   * Blue cheese: a countdown to the value's floor. It runs and pauses along with the
   * clue timer; the value at stake is worked out from the time it has run.
   */
  decay: ClueTimer | null;
  /** Cheese Wheel: the segment it landed on, once spun. */
  wheelSegment: number | null;
  platter: PlatterRound | null;
}

export type Phase = 'board' | 'clue' | 'results';

/** Chosen by the host before the game starts. */
export interface GameSettings {
  /** Seconds on the clue timer, or null for no timer. */
  timerSeconds: number | null;
  /** Cheeses switched on for this game (from the board's cheeses). */
  cheeses: CheeseId[];
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
  | { type: 'dismissCheese'; at: number }
  | { type: 'setWager'; amount: number; at: number }
  | { type: 'handOff'; playerId: string; at: number }
  /** The segment is picked at random by the caller, so the reducer stays pure. */
  | { type: 'spinWheel'; segment: number }
  | { type: 'beginClue'; at: number }
  | { type: 'revealAnswer'; at: number }
  | { type: 'buzz'; at: number }
  | { type: 'selectPlayer'; playerId: string | null; at: number }
  | { type: 'markCorrect'; at: number }
  | { type: 'markWrong'; at: number }
  | { type: 'platterReveal'; answerIndex: number }
  | { type: 'platterStrike' }
  | { type: 'platterEnd' }
  | { type: 'noOne' }
  | { type: 'cancelTile' }
  | { type: 'adjustScore'; playerId: string; delta: number }
  | { type: 'setControl'; playerId: string };

export interface PlayerInput {
  name: string;
  color: string;
}
