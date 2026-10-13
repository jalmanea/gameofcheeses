// Core data model (see SPEC.md §6). Everything here must stay plain,
// JSON-serializable data: states are saved to localStorage and will later be
// broadcast to an audience window.

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
  /** The player the host picked as having buzzed, awaiting a verdict. */
  selectedPlayerId: string | null;
  /** Players who already answered this clue wrong and are locked out. */
  wrongPlayerIds: string[];
}

export type Phase = 'board' | 'clue' | 'results';

export interface GameState {
  /** The board is embedded so a saved game is self-contained. */
  board: Board;
  players: Player[];
  controlPlayerId: string;
  tiles: TileState[][];
  active: ActiveTile | null;
  phase: Phase;
}

export type GameAction =
  | { type: 'selectTile'; categoryIndex: number; clueIndex: number }
  | { type: 'revealAnswer' }
  | { type: 'selectPlayer'; playerId: string | null }
  | { type: 'markCorrect' }
  | { type: 'markWrong' }
  | { type: 'noOne' }
  | { type: 'adjustScore'; playerId: string; delta: number }
  | { type: 'setControl'; playerId: string };

export interface PlayerInput {
  name: string;
  color: string;
}
