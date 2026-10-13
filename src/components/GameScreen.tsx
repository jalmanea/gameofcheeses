import { useState } from 'react';
import type { SessionAction } from '../game/history';
import type { GameState } from '../game/types';
import { escapeAction } from '../game/reducer';
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
  /** Back to the library; the game stays saved and can be resumed. */
  onExit: () => void;
  onRematch: () => void;
}

export function GameScreen({ state, canUndo, dispatch, onExit, onRematch }: Props) {
  const [adjusting, setAdjusting] = useState(false);
  const escLabel = state.active ? (escapeAction(state.active, 0)?.label ?? null) : null;

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
        <button className="btn btn-small" onClick={onExit} title="The game is saved; resume it from the library">
          Exit to library
        </button>
      </header>

      {adjusting && <AdjustPanel state={state} dispatch={dispatch} onClose={() => setAdjusting(false)} />}

      <main className="stage">
        {state.phase === 'board' && <BoardView state={state} dispatch={dispatch} />}
        {state.phase === 'clue' && state.active && <ClueView state={state} active={state.active} dispatch={dispatch} />}
        {state.phase === 'results' && <ResultsView state={state} onExit={onExit} onRematch={onRematch} />}
      </main>

      {state.phase !== 'results' && <Scoreboard state={state} dispatch={dispatch} />}

      <footer className="shortcuts">
        {state.active?.stage === 'cheese' && (
          <>
            <kbd>Space</kbd> continue ·{' '}
          </>
        )}
        {state.active?.stage === 'handoff' && (
          <>
            <kbd>1</kbd>–<kbd>{state.players.length}</kbd> who gets the clue ·{' '}
          </>
        )}
        {state.active?.stage === 'wager' && (
          <>
            type the wager, <kbd>Enter</kbd> to lock it in ·{' '}
          </>
        )}
        {state.active?.stage === 'clue' && (
          <>
            {!state.active.soloPlayerId && (
              <>
                <kbd>Space</kbd> buzz · <kbd>1</kbd>–<kbd>{state.players.length}</kbd> who buzzed ·{' '}
              </>
            )}
            <kbd>C</kbd> correct · <kbd>W</kbd> wrong · <kbd>Enter</kbd> reveal answer ·{' '}
          </>
        )}
        {escLabel && (
          <>
            <kbd>Esc</kbd> {escLabel} ·{' '}
          </>
        )}
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>F</kbd> fullscreen
      </footer>
    </div>
  );
}
