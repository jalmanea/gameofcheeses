import { highestClueValue, placeCheeses } from './cheeses';
import { pauseTimer, resumeTimer, startTimer, type ClueTimer } from './timer';
import type { ActiveTile, Board, GameAction, GameSettings, GameState, Player, PlayerInput } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const DEFAULT_SETTINGS: GameSettings = { timerSeconds: null, cheeses: [] };

/**
 * Builds a fresh game, hiding the board's cheeses. Player ids are deterministic
 * (p1..p6) and randomness is passed in, so this stays pure and testable.
 */
export function createGame(
  board: Board,
  inputs: PlayerInput[],
  settings: GameSettings = DEFAULT_SETTINGS,
  random: () => number = Math.random,
): GameState {
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
    settings,
    players,
    controlPlayerId: players[0].id,
    tiles: placeCheeses(board, settings.cheeses, random),
    active: null,
    phase: 'board',
  };
}

export function allTilesPlayed(state: GameState): boolean {
  return state.tiles.every((col) => col.every((t) => t.played));
}

/** The most a Gouda picker may wager: their score or the top clue value, whichever is higher. */
export function maxWager(state: GameState): number {
  const picker = state.players.find((p) => p.id === state.active?.pickerId);
  return Math.max(picker?.score ?? 0, highestClueValue(state.board));
}

/** True if this player has already answered (right or wrong) and can't be selected. */
export function hasAnswered(active: ActiveTile, playerId: string): boolean {
  return active.wrongPlayerIds.includes(playerId) || active.correctPlayerIds.includes(playerId);
}

/** Whether anyone may still be selected to answer this clue. */
function someoneCanAnswer(active: ActiveTile, players: Player[]): boolean {
  if (active.soloPlayerId) return !hasAnswered(active, active.soloPlayerId);
  return players.some((p) => !hasAnswered(active, p.id));
}

/** Backing out to the board is only allowed before the answer is shown or anyone has answered. */
export function canCancel(active: ActiveTile): boolean {
  return !active.answerRevealed && active.wrongPlayerIds.length === 0 && active.correctPlayerIds.length === 0;
}

/** Closing the tile without (more) scoring: after the reveal, or once Brie has a correct answer. */
export function canFinish(active: ActiveTile): boolean {
  return active.stage === 'clue' && (active.answerRevealed || active.correctPlayerIds.length > 0);
}

/** What Esc does right now, shared by the keyboard handler and the on-screen hints. */
export function escapeAction(active: ActiveTile, at: number): { label: string; action: GameAction } | null {
  const finish = { label: active.correctPlayerIds.length > 0 ? 'done' : 'no one', action: { type: 'noOne' } as const };
  const cancel = { label: 'back to board', action: { type: 'cancelTile' } as const };
  if (active.stage !== 'clue') return canCancel(active) ? cancel : null;
  const unselect = { type: 'selectPlayer', playerId: null, at } as const;
  if (active.answerRevealed) {
    if (active.selectedPlayerId && !active.soloPlayerId) return { label: 'unselect', action: unselect };
    return canFinish(active) ? finish : null;
  }
  if ((active.selectedPlayerId || active.buzzed) && !active.soloPlayerId) return { label: 'cancel buzz', action: unselect };
  if (active.correctPlayerIds.length > 0) return finish;
  return canCancel(active) ? cancel : null;
}

function addScore(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p));
}

/**
 * Feta: the answerer takes 10% of the leader's score. Leaders are worked out
 * before the answerer scores; tied leaders each lose 10%; nothing happens if the
 * answerer is a leader or a leader's score isn't positive.
 */
export function fetaSteal(players: Player[], answererId: string): Player[] {
  const top = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === top);
  if (leaders.some((p) => p.id === answererId) || top <= 0) return players;
  let result = players;
  for (const leader of leaders) {
    const steal = Math.round(leader.score * 0.1);
    result = addScore(addScore(result, leader.id, -steal), answererId, steal);
  }
  return result;
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

/** Puts the clue into play and starts its timer. */
function startClue(state: GameState, active: ActiveTile, at: number, patch: Partial<ActiveTile> = {}): GameState {
  const secs = state.settings.timerSeconds;
  return { ...state, active: { ...active, ...patch, stage: 'clue', timer: secs ? startTimer(secs, at) : null } };
}

/**
 * The whole game's rules. Pure: no React, no DOM, no randomness.
 * Invalid actions return the *same* state object, so callers (e.g. the undo
 * history) can tell that nothing happened.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  const active = state.active;
  switch (action.type) {
    case 'selectTile': {
      if (state.phase !== 'board') return state;
      const tile = state.tiles[action.categoryIndex]?.[action.clueIndex];
      if (!tile || tile.played) return state;
      const clue = state.board.categories[action.categoryIndex].clues[action.clueIndex];
      const cheese = tile.cheese ?? null;
      const opened: ActiveTile = {
        categoryIndex: action.categoryIndex,
        clueIndex: action.clueIndex,
        value: cheese === 'mozzarella' ? clue.value * 2 : clue.value,
        cheese,
        stage: 'cheese',
        pickerId: state.controlPlayerId,
        soloPlayerId: null,
        answerRevealed: false,
        buzzed: false,
        selectedPlayerId: null,
        wrongPlayerIds: [],
        correctPlayerIds: [],
        timer: null,
      };
      const next: GameState = { ...state, phase: 'clue', active: opened };
      // A cheese tile shows its Cheese Reveal splash first.
      return cheese ? next : startClue(next, opened, action.at);
    }

    case 'dismissCheese': {
      if (!active || active.stage !== 'cheese') return state;
      if (active.cheese === 'gouda') return { ...state, active: { ...active, stage: 'wager' } };
      if (active.cheese === 'limburger') return { ...state, active: { ...active, stage: 'handoff' } };
      return startClue(state, active, action.at);
    }

    case 'setWager': {
      if (!active || active.stage !== 'wager') return state;
      const amount = Math.round(action.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > maxWager(state)) return state;
      return startClue(state, active, action.at, {
        value: amount,
        soloPlayerId: active.pickerId,
        selectedPlayerId: active.pickerId,
      });
    }

    case 'handOff': {
      if (!active || active.stage !== 'handoff' || action.playerId === active.pickerId) return state;
      if (!state.players.some((p) => p.id === action.playerId)) return state;
      return startClue(state, active, action.at, {
        soloPlayerId: action.playerId,
        selectedPlayerId: action.playerId,
      });
    }

    case 'revealAnswer': {
      if (!active || active.stage !== 'clue' || active.answerRevealed) return state;
      // Showing the answer stops the clock.
      const timer = active.timer && pauseTimer(active.timer, action.at);
      return { ...state, active: { ...active, answerRevealed: true, timer } };
    }

    case 'buzz': {
      if (!active || active.stage !== 'clue' || active.answerRevealed || active.buzzed) return state;
      if (active.soloPlayerId || !someoneCanAnswer(active, state.players)) return state;
      return {
        ...state,
        active: { ...active, buzzed: true, timer: active.timer && pauseTimer(active.timer, action.at) },
      };
    }

    case 'selectPlayer': {
      if (!active || active.stage !== 'clue' || active.soloPlayerId) return state;
      const pause = (t: ClueTimer | null) => (t && !active.answerRevealed ? pauseTimer(t, action.at) : t);
      const resume = (t: ClueTimer | null) => (t && !active.answerRevealed ? resumeTimer(t, action.at) : t);

      if (action.playerId === null) {
        // Back to the open question: clears the selection and any buzz (e.g. a false alarm).
        if (!active.selectedPlayerId && !active.buzzed) return state;
        return {
          ...state,
          active: { ...active, selectedPlayerId: null, buzzed: false, timer: resume(active.timer) },
        };
      }
      if (active.selectedPlayerId === action.playerId) return state;
      if (!state.players.some((p) => p.id === action.playerId)) return state;
      if (hasAnswered(active, action.playerId)) return state;
      // Picking a player implies a buzz, so it also hides the question and pauses the clock.
      return {
        ...state,
        active: { ...active, selectedPlayerId: action.playerId, buzzed: true, timer: pause(active.timer) },
      };
    }

    case 'markCorrect': {
      const playerId = active?.selectedPlayerId;
      if (!active || active.stage !== 'clue' || !playerId) return state;
      const before = active.cheese === 'feta' ? fetaSteal(state.players, playerId) : state.players;
      const players = addScore(before, playerId, active.value);

      if (active.cheese === 'brie') {
        // Brie: the tile stays open so more players can be marked correct.
        // The first correct player takes board control.
        const updated: ActiveTile = {
          ...active,
          correctPlayerIds: [...active.correctPlayerIds, playerId],
          selectedPlayerId: null,
          buzzed: false,
        };
        const timer =
          active.timer && !active.answerRevealed && someoneCanAnswer(updated, state.players)
            ? resumeTimer(active.timer, action.at)
            : active.timer;
        return {
          ...state,
          players,
          controlPlayerId: active.correctPlayerIds.length === 0 ? playerId : state.controlPlayerId,
          active: { ...updated, timer },
        };
      }
      return closeActiveTile({ ...state, players, controlPlayerId: playerId });
    }

    case 'markWrong': {
      const playerId = active?.selectedPlayerId;
      if (!active || active.stage !== 'clue' || !playerId) return state;
      const penalty = active.cheese === 'swiss' ? 0 : active.value; // Swiss: holes, no penalty
      const updated: ActiveTile = {
        ...active,
        selectedPlayerId: null,
        wrongPlayerIds: [...active.wrongPlayerIds, playerId],
        // The question comes back for anyone else who can still answer.
        buzzed: false,
      };
      // The others get whatever time was left; if nobody can answer, the clock stays stopped.
      const timer =
        active.timer && !active.answerRevealed && someoneCanAnswer(updated, state.players)
          ? resumeTimer(active.timer, action.at)
          : active.timer && pauseTimer(active.timer, action.at);
      return {
        ...state,
        players: penalty ? addScore(state.players, playerId, -penalty) : state.players,
        active: { ...updated, timer },
      };
    }

    case 'noOne': {
      if (!active || !canFinish(active)) return state;
      return closeActiveTile(state);
    }

    case 'cancelTile': {
      // Back out of a tile picked by mistake, so it can be played later.
      if (!active || !canCancel(active)) return state;
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
