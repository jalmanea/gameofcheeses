import { useState } from 'react';
import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';
import { toggleFullscreen } from '../fullscreen';
import { BoardView } from './BoardView';
import { ClueView } from './ClueView';
import { Scoreboard } from './Scoreboard';
import { ResultsView } from './ResultsView';
import { AdjustPanel } from './AdjustPanel';

interface Props {
  state: GameState;
  canUndo: boolean;
  dispatch: (action: SessionAction) => void;
  onNewGame: () => void;
}

export function GameScreen({ state, canUndo, dispatch, onNewGame }: Props) {
  const [adjusting, setAdjusting] = useState(false);

  return (
    <div className="game">
      <header className="toolbar">
        <span className="toolbar-title">Game of Cheeses</span>
        <button className="btn btn-small" disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
          ↶ Undo
        </button>
        <button
          className={`btn btn-small${adjusting ? ' btn-on' : ''}`}
          onClick={() => setAdjusting((a) => !a)}
          aria-expanded={adjusting}
        >
          ± Scores
        </button>
        <button className="btn btn-small" onClick={toggleFullscreen}>
          ⛶ Fullscreen
        </button>
        <button
          className="btn btn-small"
          onClick={() => {
            if (state.phase === 'results' || window.confirm('End this game and start a new one?')) onNewGame();
          }}
        >
          New game
        </button>
      </header>

      {adjusting && <AdjustPanel state={state} dispatch={dispatch} onClose={() => setAdjusting(false)} />}

      <main className="stage">
        {state.phase === 'board' && <BoardView state={state} dispatch={dispatch} />}
        {state.phase === 'clue' && state.active && <ClueView state={state} active={state.active} dispatch={dispatch} />}
        {state.phase === 'results' && <ResultsView state={state} onNewGame={onNewGame} />}
      </main>

      {state.phase !== 'results' && <Scoreboard state={state} dispatch={dispatch} />}

      <footer className="shortcuts">
        {state.phase === 'clue' ? (
          <>
            <kbd>Space</kbd> reveal answer / close · <kbd>1</kbd>–<kbd>{state.players.length}</kbd> who buzzed ·{' '}
            <kbd>C</kbd> correct · <kbd>W</kbd> wrong · <kbd>Esc</kbd> unselect / no one ·{' '}
          </>
        ) : null}
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>F</kbd> fullscreen
      </footer>
    </div>
  );
}
