import { useEffect, useState } from 'react';
import { timeLeft, type ClueTimer } from '../game/timer';

const WARN_MS = 5000;

/** Re-renders a few times a second while the timer is running. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}

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
