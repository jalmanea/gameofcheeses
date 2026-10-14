// Which sound effects a change of game state calls for. Worked out from two snapshots, not
// from actions, so the TV window (which only sees broadcast states) can play them too.
import type { ActiveTile, GameState } from './types';

export type SoundCue =
  | 'select' // a clue opens
  | 'cheese' // a clue opens on a Cheese Reveal
  | 'buzz'
  | 'correct'
  | 'wrong'
  | 'reveal' // the answer is shown
  | 'spin' // the Cheese Wheel starts spinning
  | 'platterFound'
  | 'strike'
  | 'results'; // the game is over

/** Both states are on the same clue: returns the next state's tile, or null. */
function sameTile(a: ActiveTile | null, b: ActiveTile | null): ActiveTile | null {
  return a && b && a.categoryIndex === b.categoryIndex && a.clueIndex === b.clueIndex ? b : null;
}

const strikeCount = (active: ActiveTile | null) =>
  Object.values(active?.platter?.strikes ?? {}).reduce((sum, n) => sum + n, 0);

export function soundCues(prev: GameState, next: GameState): SoundCue[] {
  if (prev === next) return [];
  const cues: SoundCue[] = [];
  const a = prev.active;
  const b = next.active;

  if (prev.phase !== 'results' && next.phase === 'results') cues.push('results');

  if (!a && b) cues.push(b.stage === 'cheese' ? 'cheese' : 'select');

  // A selected player was judged: right if they're now marked correct or gained points.
  const same = sameTile(a, b);
  const judged = a?.selectedPlayerId;
  if (judged && same?.selectedPlayerId !== judged) {
    const before = prev.players.find((p) => p.id === judged)?.score ?? 0;
    const after = next.players.find((p) => p.id === judged)?.score ?? 0;
    const markedRight = !!same?.correctPlayerIds.includes(judged);
    const markedWrong = !!same?.wrongPlayerIds.includes(judged);
    if (markedRight || (!markedWrong && after > before)) cues.push('correct');
    else if (markedWrong || after < before) cues.push('wrong');
  }

  if (a && same) {
    if (!a.buzzed && same.buzzed) cues.push('buzz');
    if (!a.answerRevealed && same.answerRevealed) cues.push('reveal');
    if (a.wheelSegment === null && same.wheelSegment !== null) cues.push('spin');
    if ((same.platter?.found.length ?? 0) > (a.platter?.found.length ?? 0)) cues.push('platterFound');
    if (strikeCount(same) > strikeCount(a)) cues.push('strike');
  }
  return cues;
}
