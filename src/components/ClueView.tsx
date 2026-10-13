import type { SessionAction } from '../game/history';
import type { ActiveTile, GameState } from '../game/types';
import { ClueTimerView } from './ClueTimerView';

interface Props {
  state: GameState;
  active: ActiveTile;
  dispatch: (action: SessionAction) => void;
}

export function ClueView({ state, active, dispatch }: Props) {
  const category = state.board.categories[active.categoryIndex];
  const clue = category.clues[active.clueIndex];
  const selected = state.players.find((p) => p.id === active.selectedPlayerId);
  const everyoneWrong = active.wrongPlayerIds.length === state.players.length;
  const canCancel = !active.answerRevealed && active.wrongPlayerIds.length === 0;
  // Hidden from the players while someone answers, so buzzing early buys no reading time.
  const questionHidden = active.buzzed && !active.answerRevealed;
  const unbuzz = () => dispatch({ type: 'selectPlayer', playerId: null, at: Date.now() });

  return (
    <div className="clue">
      <div className="clue-header">
        <span>{category.name}</span>
        <span className="clue-value">{active.value}</span>
      </div>

      {active.timer && state.settings.timerSeconds && !active.answerRevealed && (
        <ClueTimerView timer={active.timer} totalSeconds={state.settings.timerSeconds} />
      )}

      {questionHidden ? (
        <div className="clue-text clue-buzzed" aria-live="polite">
          {selected ? (
            <span>
              <span className="control-dot" style={{ background: selected.color }} /> {selected.name}
            </span>
          ) : (
            'Buzz!'
          )}
        </div>
      ) : (
        <p className="clue-text">{clue.clue}</p>
      )}

      <div className="clue-answer">
        {active.answerRevealed ? (
          <p className="answer-text">{clue.answer}</p>
        ) : (
          <button className="btn btn-ghost" onClick={() => dispatch({ type: 'revealAnswer', at: Date.now() })}>
            Reveal answer <kbd>Enter</kbd>
          </button>
        )}
      </div>

      <div className="judging">
        {selected ? (
          <>
            <span className="judging-label">
              <span className="control-dot" style={{ background: selected.color }} />
              {selected.name} answers:
            </span>
            <button className="btn btn-correct" onClick={() => dispatch({ type: 'markCorrect' })}>
              ✓ Correct +{active.value} <kbd>C</kbd>
            </button>
            <button className="btn btn-wrong" onClick={() => dispatch({ type: 'markWrong', at: Date.now() })}>
              ✗ Wrong −{active.value} <kbd>W</kbd>
            </button>
            <button className="btn btn-ghost" onClick={unbuzz}>
              Cancel <kbd>Esc</kbd>
            </button>
          </>
        ) : questionHidden ? (
          <>
            <span className="judging-label">Who buzzed first? Click a player below or press their number.</span>
            <button className="btn btn-ghost" onClick={unbuzz}>
              False alarm <kbd>Esc</kbd>
            </button>
          </>
        ) : (
          <>
            {active.answerRevealed || everyoneWrong ? (
              <span className="judging-label">
                {everyoneWrong ? 'Everyone has answered.' : 'Click a player or press their number to judge.'}
              </span>
            ) : (
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'buzz', at: Date.now() })}>
                Buzz! <kbd>Space</kbd>
              </button>
            )}
            {active.answerRevealed ? (
              <button className="btn" onClick={() => dispatch({ type: 'noOne' })}>
                No one <kbd>Esc</kbd>
              </button>
            ) : canCancel ? (
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'cancelTile' })}>
                ← Back to board <kbd>Esc</kbd>
              </button>
            ) : (
              <span className="hint">Reveal the answer to close with no one scoring.</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
