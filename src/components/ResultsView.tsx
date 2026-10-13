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

export function ResultsView({ state, onExit, onRematch }: Props) {
  const standings = getStandings(state.players);
  const winners = getWinners(state.players);
  const winnerIds = new Set(winners.map((w) => w.id));
  const audience = useView() === 'audience';

  return (
    <div className="results">
      <h1 className="results-title">
        {winners.length === 1 ? `${winners[0].name} wins!` : `It's a tie! ${joinNames(winners.map((w) => w.name))}`}
      </h1>
      <ol className="standings">
        {standings.map(({ player, rank }) => (
          <li
            key={player.id}
            className={`standing${winnerIds.has(player.id) ? ' standing-winner' : ''}`}
            style={{ borderColor: player.color }}
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
