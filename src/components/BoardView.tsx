import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  dispatch: (action: SessionAction) => void;
}

export function BoardView({ state, dispatch }: Props) {
  const { board, tiles, players, controlPlayerId } = state;
  const picker = players.find((p) => p.id === controlPlayerId);
  const rows = Math.max(...board.categories.map((c) => c.clues.length));

  return (
    <div className="board-wrap">
      {picker && (
        <p className="control">
          <span className="control-dot" style={{ background: picker.color }} />
          <span>
            <strong>{picker.name}</strong>, pick a clue!
          </span>
        </p>
      )}
      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${board.categories.length}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {board.categories.map((cat, ci) => (
          <div key={`h${ci}`} className="board-category" style={{ gridColumn: ci + 1, gridRow: 1 }}>
            {cat.name}
          </div>
        ))}
        {board.categories.map((cat, ci) =>
          cat.clues.map((clue, ri) => {
            const played = tiles[ci][ri].played;
            return (
              <button
                key={`${ci}-${ri}`}
                className={`tile${played ? ' tile-played' : ''}`}
                style={{ gridColumn: ci + 1, gridRow: ri + 2 }}
                disabled={played}
                aria-label={`${cat.name} for ${clue.value}${played ? ' (played)' : ''}`}
                onClick={() => dispatch({ type: 'selectTile', categoryIndex: ci, clueIndex: ri })}
              >
                {played ? '' : clue.value}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
