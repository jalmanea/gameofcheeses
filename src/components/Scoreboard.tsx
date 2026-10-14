import { useEffect, useRef, useState } from 'react';
import type { SessionAction } from '../game/history';
import { isOut } from '../game/platter';
import type { GameAction, GameState, Player } from '../game/types';
import { useView } from '../presenter/presenter';

interface Delta {
  key: number;
  playerId: string;
  amount: number;
}

/** Score changes since the last render, each kept for a moment so it can float up. */
function useScoreDeltas(players: Player[]): Delta[] {
  const previous = useRef(new Map(players.map((p) => [p.id, p.score])));
  const nextKey = useRef(0);
  const [deltas, setDeltas] = useState<Delta[]>([]);

  useEffect(() => {
    const added: Delta[] = [];
    for (const p of players) {
      const amount = p.score - (previous.current.get(p.id) ?? p.score);
      if (amount !== 0) added.push({ key: nextKey.current++, playerId: p.id, amount });
    }
    previous.current = new Map(players.map((p) => [p.id, p.score]));
    if (added.length === 0) return;
    setDeltas((ds) => [...ds, ...added]);
    const keys = new Set(added.map((d) => d.key));
    window.setTimeout(() => setDeltas((ds) => ds.filter((d) => !keys.has(d.key))), 1600);
  }, [players]);

  return deltas;
}

interface Props {
  state: GameState;
  dispatch: (action: SessionAction) => void;
}

/**
 * Always-visible scores. During a clue the cards double as buttons: "who buzzed",
 * or for Limburger, "who gets the clue".
 */
export function Scoreboard({ state, dispatch }: Props) {
  const { players, active, controlPlayerId } = state;
  const view = useView();
  const clickable = !!active && view !== 'audience';
  const deltas = useScoreDeltas(players);

  return (
    <section className="scoreboard" aria-label="Scores">
      {players.map((p, i) => {
        const wrong = active?.wrongPlayerIds.includes(p.id) ?? false;
        const right = active?.correctPlayerIds.includes(p.id) ?? false;
        const round = active?.stage === 'platter' ? active.platter : null;
        const strikes = round?.strikes[p.id] ?? 0;
        const out = !!round && isOut(round, p.id);
        // In a Platter round, the card of the player whose turn it is stands out.
        const selected = round ? round.turnPlayerId === p.id : active?.selectedPlayerId === p.id;

        // What clicking this card does right now, if anything (timestamped at click time).
        let action: ((at: number) => GameAction) | null = null;
        if (active?.stage === 'handoff' && p.id !== active.pickerId) {
          action = (at) => ({ type: 'handOff', playerId: p.id, at });
        } else if (active?.stage === 'clue' && !active.soloPlayerId && !wrong && !right) {
          action = (at) => ({ type: 'selectPlayer', playerId: selected ? null : p.id, at });
        }

        const classes = [
          'score-card',
          selected && 'score-card-selected',
          (wrong || out) && 'score-card-out',
          right && 'score-card-right',
          !active && p.id === controlPlayerId && 'score-card-control',
        ]
          .filter(Boolean)
          .join(' ');
        const content = (
          <>
            <span className="score-key">{i + 1}</span>
            <span className="score-name">{p.name}</span>
            {/* Keyed by score so the pop animation replays on every change. */}
            <span key={p.score} className={`score-value${p.score < 0 ? ' score-negative' : ''}`}>
              {p.score}
            </span>
            {deltas
              .filter((d) => d.playerId === p.id)
              .map((d) => (
                <span key={d.key} className={`score-delta${d.amount < 0 ? ' score-delta-down' : ''}`} aria-hidden>
                  {d.amount > 0 ? '+' : '−'}
                  {Math.abs(d.amount)}
                </span>
              ))}
            {wrong && <span className="score-tag">✗ wrong</span>}
            {round && (out ? <span className="score-tag">out</span> : strikes > 0 && <span className="score-tag">{'✗'.repeat(strikes)}</span>)}
            {right && <span className="score-tag">✓ correct</span>}
            {!active && p.id === controlPlayerId && <span className="score-tag">picking</span>}
            {active?.stage === 'handoff' && p.id === active.pickerId && <span className="score-tag">can't answer</span>}
          </>
        );
        return clickable ? (
          <button
            key={p.id}
            className={classes}
            style={{ borderColor: p.color }}
            disabled={!action}
            aria-pressed={selected}
            onClick={() => action && dispatch(action(Date.now()))}
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
