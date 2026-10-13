import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  dispatch: (action: SessionAction) => void;
}

/** Always-visible scores. During a clue, the cards double as "who buzzed" buttons. */
export function Scoreboard({ state, dispatch }: Props) {
  const { players, active, controlPlayerId } = state;

  return (
    <section className="scoreboard" aria-label="Scores">
      {players.map((p, i) => {
        const lockedOut = active?.wrongPlayerIds.includes(p.id) ?? false;
        const selected = active?.selectedPlayerId === p.id;
        const classes = [
          'score-card',
          selected && 'score-card-selected',
          lockedOut && 'score-card-out',
          !active && p.id === controlPlayerId && 'score-card-control',
        ]
          .filter(Boolean)
          .join(' ');
        const content = (
          <>
            <span className="score-key">{i + 1}</span>
            <span className="score-name">{p.name}</span>
            <span className={`score-value${p.score < 0 ? ' score-negative' : ''}`}>{p.score}</span>
            {lockedOut && <span className="score-tag">✗ wrong</span>}
            {!active && p.id === controlPlayerId && <span className="score-tag">picking</span>}
          </>
        );
        return active ? (
          <button
            key={p.id}
            className={classes}
            style={{ borderColor: p.color }}
            disabled={lockedOut}
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'selectPlayer', playerId: selected ? null : p.id })}
          >
            {content}
          </button>
        ) : (
          <div key={p.id} className={classes} style={{ borderColor: p.color }}>
            {content}
          </div>
        );
      })}
    </section>
  );
}
