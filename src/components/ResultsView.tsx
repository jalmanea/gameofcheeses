import type { CSSProperties } from 'react';
import { getStandings, getWinners } from '../game/reducer';
import type { GameState } from '../game/types';
import { useView } from '../presenter/presenter';

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

interface Props {
  state: GameState;
  onExit: () => void;
  onRematch: () => void;
}

const CONFETTI_PIECES = 48;
const CONFETTI_COLORS = ['var(--cheese)', 'var(--cheese-light)', 'var(--cheese-deep)', 'var(--wax)', 'var(--cream)'];

/** Pseudo-random but stable per piece, so re-renders don't reshuffle the confetti. */
const spread = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Falling cheese wedges and crumbs over the results. Decorative only. */
function CheeseConfetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: CONFETTI_PIECES }, (_, i) => (
        <span
          key={i}
          className={`confetti-piece${i % 3 === 0 ? ' confetti-crumb' : ''}`}
          style={
            {
              '--x': `${spread(i, 1) * 100}%`,
              '--delay': `${spread(i, 2) * 2.5}s`,
              '--dur': `${3 + spread(i, 3) * 3}s`,
              '--spin': `${(spread(i, 4) - 0.5) * 1080}deg`,
              '--drift': `${(spread(i, 5) - 0.5) * 20}vw`,
              '--size': `${0.6 + spread(i, 6) * 0.9}em`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function ResultsView({ state, onExit, onRematch }: Props) {
  const standings = getStandings(state.players);
  const winners = getWinners(state.players);
  const winnerIds = new Set(winners.map((w) => w.id));
  const audience = useView() === 'audience';

  return (
    <div className="results">
      <CheeseConfetti />
      <h1 className="results-title">
        {winners.length === 1 ? `${winners[0].name} wins!` : `It's a tie! ${joinNames(winners.map((w) => w.name))}`}
      </h1>
      <ol className="standings">
        {standings.map(({ player, rank }, i) => (
          <li
            key={player.id}
            className={`standing${winnerIds.has(player.id) ? ' standing-winner' : ''}`}
            // Standings arrive one by one, last place first, winner last.
            style={{ borderColor: player.color, animationDelay: `${0.3 + (standings.length - 1 - i) * 0.35}s` }}
          >
            <span className="standing-rank">{rank}</span>
            <span className="standing-name">{player.name}</span>
            <span className={`standing-score${player.score < 0 ? ' score-negative' : ''}`}>{player.score}</span>
          </li>
        ))}
      </ol>
      {!audience && (
        <div className="row">
          <button className="btn btn-primary" onClick={onRematch}>
            Play this board again
          </button>
          <button className="btn" onClick={onExit}>
            Back to library
          </button>
        </div>
      )}
    </div>
  );
}
