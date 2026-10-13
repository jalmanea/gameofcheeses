import type { SessionAction } from '../game/history';
import type { ActiveTile, GameState } from '../game/types';

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

  return (
    <div className="clue">
      <div className="clue-header">
        <span>{category.name}</span>
        <span className="clue-value">{active.value}</span>
      </div>

      <p className="clue-text">{clue.clue}</p>

      <div className="clue-answer">
        {active.answerRevealed ? (
          <p className="answer-text">{clue.answer}</p>
        ) : (
          <button className="btn" onClick={() => dispatch({ type: 'revealAnswer' })}>
            Reveal answer <kbd>Space</kbd>
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
            <button className="btn btn-wrong" onClick={() => dispatch({ type: 'markWrong' })}>
              ✗ Wrong −{active.value} <kbd>W</kbd>
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'selectPlayer', playerId: null })}>
              Cancel <kbd>Esc</kbd>
            </button>
          </>
        ) : (
          <>
            <span className="judging-label">
              {everyoneWrong ? 'Everyone has answered.' : 'Who buzzed? Click a player below or press their number.'}
            </span>
            <button className="btn" onClick={() => dispatch({ type: 'noOne' })}>
              No one <kbd>Esc</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
