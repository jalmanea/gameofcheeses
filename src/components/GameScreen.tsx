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
import { openAudienceWindow } from '../presenter/presenter';
import { useGameSounds, useSoundSetting } from '../sound/useSounds';

interface Props {
  state: GameState;
  canUndo: boolean;
  dispatch: (action: SessionAction) => void;
  /** Back to the library; the game stays saved and can be resumed. */
  onExit: () => void;
  onRematch: () => void;
  /** How many TV (audience) windows are showing the game; null if the browser can't do it. */
  audiences: number | null;
}

export function GameScreen({ state, canUndo, dispatch, onExit, onRematch, audiences }: Props) {
  const [adjusting, setAdjusting] = useState(false);
  const [sound, setSound] = useSoundSetting();
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
        <button
          className="btn btn-small"
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          title={sound ? 'Sound is on (it plays on the TV window when one is open)' : 'Sound is off'}
        >
          {sound ? '🔊 Sound' : '🔇 Muted'}
        </button>
        <button className="btn btn-small" onClick={toggleFullscreen}>
          ⛶ Fullscreen
        </button>
        {audiences !== null && (
          <button
            className={`btn btn-small${audiences > 0 ? ' btn-on' : ''}`}
            onClick={() => {
              if (!openAudienceWindow()) window.alert('The browser blocked the TV window. Allow pop-ups for this site and try again.');
            }}
            title={
              audiences > 0
                ? 'The TV window is showing the game; this window shows the answers. Click to bring it to the front.'
                : 'Open a second window for the TV or projector. This window then becomes the host view, with the answers.'
            }
          >
            📺 {audiences > 0 ? 'On the TV' : 'TV window'}
          </button>
        )}
        <button className="btn btn-small" onClick={onExit} title="The game is saved; resume it from the library">
          Exit to library
        </button>
      </header>

      {adjusting && <AdjustPanel state={state} dispatch={dispatch} onClose={() => setAdjusting(false)} />}

      <GameStage state={state} dispatch={dispatch} onExit={onExit} onRematch={onRematch} />

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
        {state.active?.stage === 'spin' && (
          <>
            <kbd>Space</kbd> {state.active.wheelSegment === null ? 'spin' : 'show the clue'} ·{' '}
          </>
        )}
        {state.active?.stage === 'platter' && !state.active.platter?.finished && (
          <>
            <kbd>1</kbd>–<kbd>8</kbd> flip that answer · <kbd>X</kbd> strike · <kbd>Enter</kbd> end round ·{' '}
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

/** The board, clue or results, and the scores. Shared by the host's window and the TV window. */
export function GameStage({ state, dispatch, onExit, onRematch }: Pick<Props, 'state' | 'dispatch' | 'onExit' | 'onRematch'>) {
  useGameSounds(state);
  return (
    <>
      <main className="stage">
        {state.phase === 'board' && <BoardView state={state} dispatch={dispatch} />}
        {state.phase === 'clue' && state.active && <ClueView state={state} active={state.active} dispatch={dispatch} />}
        {state.phase === 'results' && <ResultsView state={state} onExit={onExit} onRematch={onRematch} />}
      </main>

      {state.phase !== 'results' && <Scoreboard state={state} dispatch={dispatch} />}
    </>
  );
}
