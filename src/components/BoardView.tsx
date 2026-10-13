import type { CSSProperties } from 'react';
import { CHEESES, PARMESAN_GROWTH, PARMESAN_MAX, parmesanValue } from '../game/cheeses';
import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';
import { useView } from '../presenter/presenter';

interface Props {
  state: GameState;
  dispatch: (action: SessionAction) => void;
}

export function BoardView({ state, dispatch }: Props) {
  const { board, tiles, players, controlPlayerId } = state;
  const picker = players.find((p) => p.id === controlPlayerId);
  const rows = Math.max(...board.categories.map((c) => c.clues.length));
  // On the TV the tiles are just pictures; the host picks from their own window.
  const Tile = useView() === 'audience' ? 'div' : 'button';

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
            const { played, cheese, agedTurns = 0 } = tiles[ci][ri];
            // Aged Parmesan is never hidden: it shows its current, growing value.
            const aging = !played && cheese === 'parmesan';
            const value = aging ? parmesanValue(clue.value, agedTurns) : clue.value;
            // 0 when fresh, 1 once it has reached its maximum value.
            const ripeness = Math.min(1, (agedTurns * PARMESAN_GROWTH) / (PARMESAN_MAX - 1));
            return (
              <Tile
                key={`${ci}-${ri}`}
                className={`tile${played ? ' tile-played' : ''}${aging ? ' tile-parmesan' : ''}`}
                style={{ gridColumn: ci + 1, gridRow: ri + 2, ...(aging ? { '--ripeness': ripeness } : {}) } as CSSProperties}
                disabled={Tile === 'button' && played}
                aria-label={`${cat.name} for ${value}${aging ? ' (Aged Parmesan)' : ''}${played ? ' (played)' : ''}`}
                title={aging ? `Aged Parmesan: ${agedTurns} turn${agedTurns === 1 ? '' : 's'} old` : undefined}
                onClick={() => dispatch({ type: 'selectTile', categoryIndex: ci, clueIndex: ri, at: Date.now() })}
              >
                {/* Once played, a tile shows the cheese it hid (if any). */}
                {played ? (
                  cheese ? (
                    <span title={CHEESES[cheese].name}>{CHEESES[cheese].emoji}</span>
                  ) : (
                    ''
                  )
                ) : aging ? (
                  <>
                    <span className="tile-badge" aria-hidden>
                      {CHEESES.parmesan.emoji}
                    </span>
                    {value}
                  </>
                ) : (
                  clue.value
                )}
              </Tile>
            );
          }),
        )}
      </div>
    </div>
  );
}
