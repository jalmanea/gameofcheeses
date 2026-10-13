// Pure helpers for the clue timer. Time is passed in (epoch ms) rather than read
// here, so the reducer stays pure and timer state stays plain JSON.

export interface ClueTimer {
  /** Time left when the timer was last paused or started. */
  remainingMs: number;
  /** When it last started running, or null while paused or stopped. */
  runningSince: number | null;
}

export const TIMER_CHOICES = [5, 10, 15, 20, 30, 45, 60] as const;
export const DEFAULT_TIMER_SECONDS = 15;

export function startTimer(seconds: number, at: number): ClueTimer {
  return { remainingMs: seconds * 1000, runningSince: at };
}

export function timeLeft(timer: ClueTimer, now: number): number {
  if (timer.runningSince === null) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - Math.max(0, now - timer.runningSince));
}

export function pauseTimer(timer: ClueTimer, at: number): ClueTimer {
  if (timer.runningSince === null) return timer;
  return { remainingMs: timeLeft(timer, at), runningSince: null };
}

export function resumeTimer(timer: ClueTimer, at: number): ClueTimer {
  if (timer.runningSince !== null || timer.remainingMs <= 0) return timer;
  return { ...timer, runningSince: at };
}
