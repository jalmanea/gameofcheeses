import type { SaveFile } from '../game/persistence';

interface Props {
  save: SaveFile;
  onResume: () => void;
  onNewGame: () => void;
}

export function ResumePrompt({ save, onResume, onNewGame }: Props) {
  const state = save.session.present;
  const total = state.tiles.flat().length;
  const left = state.tiles.flat().filter((t) => !t.played).length;
  const savedAt = new Date(save.savedAt);

  return (
    <main className="screen setup">
      <h1 className="title">Game of Cheeses</h1>
      <div className="panel">
        <h2>Resume the saved game?</h2>
        <p className="hint">
          {state.board.title} · {state.phase === 'results' ? 'finished' : `${left} of ${total} clues left`}
          {!Number.isNaN(savedAt.getTime()) && ` · saved ${savedAt.toLocaleString()}`}
        </p>
        <ul className="resume-scores">
          {state.players.map((p) => (
            <li key={p.id} style={{ borderColor: p.color }}>
              <span>{p.name}</span>
              <strong>{p.score}</strong>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn btn-primary" onClick={onResume} autoFocus>
            Resume
          </button>
          <button className="btn" onClick={onNewGame}>
            New game
          </button>
        </div>
      </div>
    </main>
  );
}
