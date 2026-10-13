import type { Board, GameAction, GameState, Player, PlayerInput } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Builds a fresh game. Player ids are deterministic (p1..p6) to keep this pure. */
export function createGame(board: Board, inputs: PlayerInput[]): GameState {
  if (inputs.length < MIN_PLAYERS || inputs.length > MAX_PLAYERS) {
    throw new Error(`A game needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  }
  const players: Player[] = inputs.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name.trim(),
    color: p.color,
    score: 0,
  }));
  return {
    board,
    players,
    controlPlayerId: players[0].id,
    tiles: board.categories.map((c) => c.clues.map(() => ({ played: false }))),
    active: null,
    phase: 'board',
  };
}

export function allTilesPlayed(state: GameState): boolean {
  return state.tiles.every((col) => col.every((t) => t.played));
}

function addScore(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p));
}

/** Closes the active tile and moves to Results if it was the last one. */
function closeActiveTile(state: GameState): GameState {
  const active = state.active;
  if (!active) return state;
  const tiles = state.tiles.map((col, ci) =>
    ci === active.categoryIndex
      ? col.map((t, ri) => (ri === active.clueIndex ? { ...t, played: true } : t))
      : col,
  );
  const next: GameState = { ...state, tiles, active: null, phase: 'board' };
  return allTilesPlayed(next) ? { ...next, phase: 'results' } : next;
}

/**
 * The whole game's rules. Pure: no React, no DOM, no randomness.
 * Invalid actions return the *same* state object, so callers (e.g. the undo
 * history) can tell that nothing happened.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'selectTile': {
      if (state.phase !== 'board') return state;
      const tile = state.tiles[action.categoryIndex]?.[action.clueIndex];
      if (!tile || tile.played) return state;
      const clue = state.board.categories[action.categoryIndex].clues[action.clueIndex];
      return {
        ...state,
        phase: 'clue',
        active: {
          categoryIndex: action.categoryIndex,
          clueIndex: action.clueIndex,
          value: clue.value,
          answerRevealed: false,
          selectedPlayerId: null,
          wrongPlayerIds: [],
        },
      };
    }

    case 'revealAnswer': {
      if (!state.active || state.active.answerRevealed) return state;
      return { ...state, active: { ...state.active, answerRevealed: true } };
    }

    case 'selectPlayer': {
      const active = state.active;
      if (!active || active.selectedPlayerId === action.playerId) return state;
      if (action.playerId !== null) {
        if (!state.players.some((p) => p.id === action.playerId)) return state;
        if (active.wrongPlayerIds.includes(action.playerId)) return state;
      }
      return { ...state, active: { ...active, selectedPlayerId: action.playerId } };
    }

    case 'markCorrect': {
      const playerId = state.active?.selectedPlayerId;
      if (!state.active || !playerId) return state;
      return closeActiveTile({
        ...state,
        players: addScore(state.players, playerId, state.active.value),
        controlPlayerId: playerId,
      });
    }

    case 'markWrong': {
      const active = state.active;
      const playerId = active?.selectedPlayerId;
      if (!active || !playerId) return state;
      return {
        ...state,
        players: addScore(state.players, playerId, -active.value),
        active: {
          ...active,
          selectedPlayerId: null,
          wrongPlayerIds: [...active.wrongPlayerIds, playerId],
        },
      };
    }

    case 'noOne': {
      // The answer must be shown before the tile can close with no one scoring.
      if (!state.active?.answerRevealed) return state;
      return closeActiveTile(state);
    }

    case 'cancelTile': {
      // Back out of a tile picked by mistake: only before the answer is shown
      // and before anyone has answered, so the tile can be played later.
      const active = state.active;
      if (!active || active.answerRevealed || active.wrongPlayerIds.length > 0) return state;
      return { ...state, active: null, phase: 'board' };
    }

    case 'adjustScore': {
      if (!Number.isFinite(action.delta) || action.delta === 0) return state;
      if (!state.players.some((p) => p.id === action.playerId)) return state;
      return { ...state, players: addScore(state.players, action.playerId, action.delta) };
    }

    case 'setControl': {
      if (state.controlPlayerId === action.playerId) return state;
      if (!state.players.some((p) => p.id === action.playerId)) return state;
      return { ...state, controlPlayerId: action.playerId };
    }

    default: {
      const unknown: never = action;
      void unknown;
      return state;
    }
  }
}

export interface Standing {
  player: Player;
  /** Competition ranking: tied players share a rank (1, 1, 3, ...). */
  rank: number;
}

export function getStandings(players: Player[]): Standing[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player) => ({
    player,
    rank: 1 + sorted.filter((p) => p.score > player.score).length,
  }));
}

/** Every player with the top score (more than one means a tie). */
export function getWinners(players: Player[]): Player[] {
  if (players.length === 0) return [];
  const top = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === top);
}
