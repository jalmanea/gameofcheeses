import { useState } from 'react';
import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  dispatch: (action: SessionAction) => void;
  onClose: () => void;
}

/** Host tools for fixing mistakes: manual score changes and handing over board control. */
export function AdjustPanel({ state, dispatch, onClose }: Props) {
  const [amount, setAmount] = useState('100');
  const value = Math.abs(Math.round(Number(amount)));
  const valid = Number.isFinite(value) && value > 0;

  return (
    <section className="adjust" aria-label="Adjust scores">
      <label className="adjust-amount">
        Amount
        <input
          className="text-input"
          type="number"
          min={1}
          step={100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="adjust-players">
        {state.players.map((p) => (
          <div key={p.id} className="adjust-player" style={{ borderColor: p.color }}>
            <span className="adjust-name">{p.name}</span>
            <button
              className="btn btn-small"
              disabled={!valid}
              aria-label={`Subtract ${valid ? value : ''} from ${p.name}`}
              onClick={() => dispatch({ type: 'adjustScore', playerId: p.id, delta: -value })}
            >
              −{valid ? value : ''}
            </button>
            <button
              className="btn btn-small"
              disabled={!valid}
              aria-label={`Add ${valid ? value : ''} to ${p.name}`}
              onClick={() => dispatch({ type: 'adjustScore', playerId: p.id, delta: value })}
            >
              +{valid ? value : ''}
            </button>
            <button
              className="btn btn-small btn-ghost"
              disabled={state.controlPlayerId === p.id}
              onClick={() => dispatch({ type: 'setControl', playerId: p.id })}
            >
              {state.controlPlayerId === p.id ? 'Has control' : 'Give control'}
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-small btn-ghost" onClick={onClose}>
        Done
      </button>
    </section>
  );
}
