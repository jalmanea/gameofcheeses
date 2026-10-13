import { useEffect, useState, type ReactNode } from 'react';
import { randomWheelSegment, WHEEL_SEGMENTS } from '../game/cheeses';
import type { SessionAction } from '../game/history';
import type { ActiveTile } from '../game/types';

const SLICE = 360 / WHEEL_SEGMENTS.length;
const SLICE_COLORS = ['var(--cheese)', 'var(--cheese-deep)', 'var(--cheese-light)', 'var(--wax)', 'var(--rind-light)'];
const SPIN_MS = 4000;

/** Rotation that brings `segment`'s middle under the pointer at the top, after several turns. */
function rotationFor(segment: number | null): number {
  return segment === null ? 0 : 360 * 6 - (segment + 0.5) * SLICE;
}

const background = `conic-gradient(${WHEEL_SEGMENTS.map(
  (_, i) => `${SLICE_COLORS[i % SLICE_COLORS.length]} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
).join(', ')})`;

interface Props {
  active: ActiveTile;
  baseValue: number;
  dispatch: (action: SessionAction) => void;
  escButton: ReactNode;
}

/** Cheese Wheel: spin for a multiplier, then play the clue for the new value. */
export function CheeseWheel({ active, baseValue, dispatch, escButton }: Props) {
  const segment = active.wheelSegment;
  // A wheel that was already spun (resumed game, undo) shows its result without spinning again.
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>(segment === null ? 'idle' : 'done');

  useEffect(() => {
    if (segment === null) {
      setPhase('idle');
      return;
    }
    if (phase !== 'idle') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done');
      return;
    }
    setPhase('spinning');
    // In case the transition never reports its end (e.g. the tab is hidden).
    const id = window.setTimeout(() => setPhase('done'), SPIN_MS + 300);
    return () => window.clearTimeout(id);
    // Only a new spin result starts the animation.
  }, [segment]);

  const spin = () => dispatch({ type: 'spinWheel', segment: randomWheelSegment() });
  const multiplier = segment === null ? null : WHEEL_SEGMENTS[segment];

  return (
    <div className="stage-panel wheel-stage">
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden />
        <div
          className={`wheel${phase === 'spinning' ? ' wheel-spinning' : ''}`}
          style={{ background, transform: `rotate(${rotationFor(phase === 'idle' ? null : segment)}deg)` }}
          onTransitionEnd={() => setPhase('done')}
          aria-hidden
        >
          {WHEEL_SEGMENTS.map((m, i) => (
            <span key={i} className="wheel-label" style={{ transform: `rotate(${(i + 0.5) * SLICE}deg)` }}>
              <span>×{m}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="wheel-side" aria-live="polite">
        {phase === 'done' && multiplier !== null ? (
          <>
            <p className="stage-title">×{multiplier}!</p>
            <p>
              {baseValue} becomes <strong>{active.value}</strong>
            </p>
          </>
        ) : (
          <p className="stage-title">{phase === 'spinning' ? 'Spinning…' : 'Spin the wheel!'}</p>
        )}
        <div className="judging">
          {segment === null ? (
            <button className="btn btn-primary" autoFocus onClick={spin}>
              Spin <kbd>Space</kbd>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={phase !== 'done'}
              onClick={() => dispatch({ type: 'beginClue', at: Date.now() })}
            >
              Show the clue <kbd>Space</kbd>
            </button>
          )}
          {escButton}
        </div>
      </div>
    </div>
  );
}
