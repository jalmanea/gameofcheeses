import { timeLeft, type ClueTimer } from '../game/timer';
import { useNow } from '../useNow';

const WARN_MS = 5000;

export function ClueTimerView({ timer, totalSeconds }: { timer: ClueTimer; totalSeconds: number }) {
  const running = timer.runningSince !== null;
  const ms = timeLeft(timer, useNow(running));
  const up = ms <= 0;
  const fraction = Math.min(1, ms / (totalSeconds * 1000));
  const classes = ['timer', running ? 'timer-running' : 'timer-paused', !up && ms <= WARN_MS && 'timer-warn', up && 'timer-up']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="timer" aria-live="off">
      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${fraction * 100}%` }} />
      </div>
      <span className="timer-text">{up ? "Time's up!" : Math.ceil(ms / 1000)}</span>
    </div>
  );
}
