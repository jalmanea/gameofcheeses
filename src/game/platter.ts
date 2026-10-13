// Cheese Platter survey rounds (SPEC.md §4). Pure helpers used by the reducer and the UI.
import type { Board, Player, PlatterPrompt, PlatterRound } from './types';

export const MIN_PLATTER_ANSWERS = 4;
export const MAX_PLATTER_ANSWERS = 8;
/** Strikes that put a player out of a Platter round. */
export const PLATTER_STRIKES_OUT = 2;

/** An answer counts if it has text and positive points. */
function usableAnswer(a: PlatterPrompt['answers'][number]): boolean {
  return !!a.text.trim() && Number.isFinite(a.points) && a.points > 0;
}

/** A prompt can be played if it has a question and at least one usable answer. */
export function isUsablePrompt(p: PlatterPrompt): boolean {
  return !!p.prompt.trim() && p.answers.some(usableAnswer);
}

export function usablePromptIndexes(board: Board): number[] {
  return board.platterPrompts.flatMap((p, i) => (isUsablePrompt(p) ? [i] : []));
}

/**
 * The answer slots as shown on the board: indexes into `prompt.answers`, most
 * popular first. Slot 1 is the top answer. Unusable answers are left out.
 */
export function platterSlots(prompt: PlatterPrompt): number[] {
  return prompt.answers
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => usableAnswer(a))
    .sort((x, y) => y.a.points - x.a.points || x.i - y.i)
    .map(({ i }) => i);
}

/** What an answer pays: its share of the pot (popularity out of 100). */
export function platterPayout(points: number, pot: number): number {
  return Math.round((points / 100) * pot);
}

export function isOut(round: PlatterRound, playerId: string): boolean {
  return (round.strikes[playerId] ?? 0) >= PLATTER_STRIKES_OUT;
}

/** The next player after `fromId` (in seating order, wrapping) who isn't out, or null. */
export function nextTurn(players: Player[], round: PlatterRound, fromId: string, includeSelf = false): string | null {
  const start = players.findIndex((p) => p.id === fromId);
  for (let step = includeSelf ? 0 : 1; step <= players.length; step++) {
    const p = players[(start + step) % players.length];
    if (!isOut(round, p.id)) return p.id;
  }
  return null;
}

export function startPlatter(promptIndex: number, pickerId: string): PlatterRound {
  return { promptIndex, found: [], strikes: {}, turnPlayerId: pickerId, finished: false };
}

/** The answer was given by the player whose turn it is: they score, and play moves on. */
export function revealPlatterAnswer(round: PlatterRound, prompt: PlatterPrompt, players: Player[], answerIndex: number): PlatterRound {
  const found = [...round.found, { answerIndex, playerId: round.turnPlayerId! }];
  const allFound = platterSlots(prompt).every((i) => found.some((f) => f.answerIndex === i));
  const turnPlayerId = allFound ? null : nextTurn(players, round, round.turnPlayerId!);
  return { ...round, found, turnPlayerId, finished: turnPlayerId === null };
}

/** A strike for the player whose turn it is; play moves on to the next player still in. */
export function strikePlatter(round: PlatterRound, players: Player[]): PlatterRound {
  const id = round.turnPlayerId!;
  const struck: PlatterRound = { ...round, strikes: { ...round.strikes, [id]: (round.strikes[id] ?? 0) + 1 } };
  const turnPlayerId = nextTurn(players, struck, id);
  return { ...struck, turnPlayerId, finished: turnPlayerId === null };
}

export function hasPlatterStarted(round: PlatterRound): boolean {
  return round.found.length > 0 || Object.keys(round.strikes).length > 0;
}
