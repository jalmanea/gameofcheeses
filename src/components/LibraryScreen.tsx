import { useRef, useState, type ChangeEvent } from 'react';
import { rowCount, summarizeWarnings, validateBoard } from '../boards/boardOps';
import type { GameSession } from '../game/history';
import type { Board } from '../game/types';

interface Props {
  boards: Board[];
  /** The saved game, if any (in progress or finished). */
  session: GameSession | null;
  storageError: boolean;
  onResume: () => void;
  onDiscardGame: () => void;
  onPlay: (board: Board) => void;
  onEdit: (board: Board) => void;
  onNew: () => void;
  onDuplicate: (board: Board) => void;
  onDelete: (board: Board) => void;
  onExport: (board: Board) => void;
  /** Returns an error message, or null on success. */
  onImport: (json: string) => string | null;
  onRestoreSample: () => void;
  onGuide: () => void;
}

export function LibraryScreen(props: Props) {
  const { boards, session } = props;
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow importing the same file again
    if (!file) return;
    if (file.size > 2_000_000) {
      setMessage({ kind: 'error', text: `${file.name} is too large to be a board file.` });
      return;
    }
    const error = props.onImport(await file.text());
    setMessage(error ? { kind: 'error', text: `Couldn't import ${file.name}: ${error}` } : { kind: 'ok', text: `Imported ${file.name}.` });
  };

  return (
    <main className="screen library">
      <h1 className="title">Game of Cheeses</h1>
      <button className="btn btn-small" onClick={props.onGuide}>
        🧀 Cheese Guide
      </button>

      {props.storageError && (
        <p className="error panel-wide">
          Couldn't save to this browser's storage. Changes will be lost when you close the page — export your boards to keep them.
        </p>
      )}

      {session && <SavedGameCard session={session} onResume={props.onResume} onDiscard={props.onDiscardGame} />}

      <section className="panel panel-wide">
        <div className="library-header">
          <h2>Boards</h2>
          <div className="row row-tight">
            <button className="btn btn-primary" onClick={props.onNew}>
              + New board
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Import…
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile} />
          </div>
        </div>

        {message && <p className={message.kind === 'error' ? 'error' : 'ok'}>{message.text}</p>}

        {boards.length === 0 ? (
          <div className="library-empty">
            <p>No boards yet. Create one, import a board file, or start from the sample.</p>
            <button className="btn" onClick={props.onRestoreSample}>
              Add the sample board
            </button>
          </div>
        ) : (
          <ul className="board-list">
            {boards.map((board) => {
              const warnings = summarizeWarnings(validateBoard(board));
              return (
                <li key={board.id} className="board-item">
                  <div className="board-item-info">
                    <strong className="board-item-title">{board.title || 'Untitled board'}</strong>
                    <span className="hint">
                      {board.categories.length} categories × {rowCount(board)} clues
                      {warnings.length > 0 && (
                        <span className="warn" title={warnings.join('\n')}>
                          {' '}
                          · ⚠ {warnings.length === 1 ? warnings[0] : `${warnings.length} problems`}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="row row-tight">
                    <button className="btn btn-small btn-primary" onClick={() => props.onPlay(board)}>
                      Play
                    </button>
                    <button className="btn btn-small" onClick={() => props.onEdit(board)}>
                      Edit
                    </button>
                    <button className="btn btn-small" onClick={() => props.onDuplicate(board)}>
                      Duplicate
                    </button>
                    <button className="btn btn-small" onClick={() => props.onExport(board)}>
                      Export
                    </button>
                    <button className="btn btn-small btn-ghost" onClick={() => props.onDelete(board)}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function SavedGameCard({ session, onResume, onDiscard }: { session: GameSession; onResume: () => void; onDiscard: () => void }) {
  const state = session.present;
  const tiles = state.tiles.flat();
  const left = tiles.filter((t) => !t.played).length;
  const finished = state.phase === 'results';

  return (
    <section className="panel panel-wide saved-game">
      <h2>{finished ? 'Last game' : 'Game in progress'}</h2>
      <p className="hint">
        {state.board.title} · {finished ? 'finished' : `${left} of ${tiles.length} clues left`}
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
          {finished ? 'View results' : 'Resume'}
        </button>
        <button className="btn btn-ghost" onClick={onDiscard}>
          {finished ? 'Dismiss' : 'Discard game'}
        </button>
      </div>
    </section>
  );
}
