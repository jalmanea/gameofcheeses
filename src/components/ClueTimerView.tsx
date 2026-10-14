import { timeLeft, type ClueTimer } from '../game/timer';
import { useEffect, useRef } from 'react';
import { useNow } from '../useNow';
import { useSoundPlayer } from '../sound/useSounds';

const WARN_MS = 5000;

export function ClueTimerView({ timer, totalSeconds }: { timer: ClueTimer; totalSeconds: number }) {
  const running = timer.runningSince !== null;
  const ms = timeLeft(timer, useNow(running));
  const up = ms <= 0;
  // Beep when time runs out here, not when a clue is shown that had already run out.
  const play = useSoundPlayer();
  const wasUp = useRef(up);
  useEffect(() => {
    if (up && !wasUp.current) play('timesUp');
    wasUp.current = up;
  }, [up, play]);
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
