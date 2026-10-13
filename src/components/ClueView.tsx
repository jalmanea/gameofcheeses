import { useState, type FormEvent } from 'react';
import { CHEESES } from '../game/cheeses';
import type { SessionAction } from '../game/history';
import { escapeAction, hasAnswered, maxWager } from '../game/reducer';
import type { ActiveTile, GameState, Player } from '../game/types';
import { ClueTimerView } from './ClueTimerView';
import { CheeseCard } from './CheeseCard';

interface Props {
  state: GameState;
  active: ActiveTile;
  dispatch: (action: SessionAction) => void;
}

export function ClueView({ state, active, dispatch }: Props) {
  const category = state.board.categories[active.categoryIndex];
  const cheese = active.cheese ? CHEESES[active.cheese] : null;
  const picker = state.players.find((p) => p.id === active.pickerId);
  const esc = escapeAction(active, 0);
  const escButton = esc && (
    <button className="btn btn-ghost" onClick={() => dispatch(escapeAction(active, Date.now())?.action ?? esc.action)}>
      {esc.label === 'back to board' ? '← Back to board' : capitalize(esc.label)} <kbd>Esc</kbd>
    </button>
  );

  return (
    <div className="clue">
      <div className="clue-header">
        <span>{category.name}</span>
        {cheese && active.stage !== 'cheese' && (
          <span className="clue-cheese" title={cheese.rule}>
            <span aria-hidden>{cheese.emoji}</span> {cheese.name}
          </span>
        )}
        <span className="clue-value">{active.stage === 'wager' ? 'Wager' : active.value}</span>
      </div>

      {active.stage === 'cheese' && cheese && (
        <div className="cheese-reveal">
          <CheeseCard cheese={cheese} big />
          <div className="judging">
            <button className="btn btn-primary" autoFocus onClick={() => dispatch({ type: 'dismissCheese', at: Date.now() })}>
              Continue <kbd>Space</kbd>
            </button>
            {escButton}
          </div>
        </div>
      )}

      {active.stage === 'wager' && picker && (
        <WagerStep picker={picker} max={maxWager(state)} defaultValue={category.clues[active.clueIndex].value} dispatch={dispatch} escButton={escButton} />
      )}

      {active.stage === 'handoff' && picker && (
        <div className="stage-panel">
          <p className="stage-title">
            <span className="control-dot" style={{ background: picker.color }} /> {picker.name} can't answer this one.
          </p>
          <p>Who gets the clue? They'll answer it alone.</p>
          <div className="judging">
            {state.players.map((p, i) =>
              p.id === picker.id ? null : (
                <button
                  key={p.id}
                  className="btn"
                  style={{ borderColor: p.color }}
                  onClick={() => dispatch({ type: 'handOff', playerId: p.id, at: Date.now() })}
                >
                  {p.name} <kbd>{i + 1}</kbd>
                </button>
              ),
            )}
            {escButton}
          </div>
        </div>
      )}

      {active.stage === 'clue' && <CluePlay state={state} active={active} dispatch={dispatch} escButton={escButton} />}
    </div>
  );
}

function WagerStep(props: {
  picker: Player;
  max: number;
  defaultValue: number;
  dispatch: (action: SessionAction) => void;
  escButton: React.ReactNode;
}) {
  const { picker, max, dispatch } = props;
  const [amount, setAmount] = useState(String(Math.min(props.defaultValue, max)));
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= max;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) dispatch({ type: 'setWager', amount: value, at: Date.now() });
  };

  return (
    <form className="stage-panel" onSubmit={submit}>
      <p className="stage-title">
        <span className="control-dot" style={{ background: picker.color }} /> {picker.name}, how much do you wager?
      </p>
      <p>Anything from 0 to {max}. You'll answer alone.</p>
      <div className="judging">
        <input
          className="text-input wager-input"
          type="number"
          min={0}
          max={max}
          step={100}
          value={amount}
          autoFocus
          aria-label="Wager"
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') dispatch({ type: 'cancelTile' });
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={!valid}>
          Lock in wager <kbd>Enter</kbd>
        </button>
        {props.escButton}
      </div>
      {!valid && amount.trim() !== '' && <p className="error">The wager must be a whole number from 0 to {max}.</p>}
    </form>
  );
}

function CluePlay({ state, active, dispatch, escButton }: Props & { escButton: React.ReactNode }) {
  const clue = state.board.categories[active.categoryIndex].clues[active.clueIndex];
  const selected = state.players.find((p) => p.id === active.selectedPlayerId);
  const solo = state.players.find((p) => p.id === active.soloPlayerId);
  const everyoneDone = solo ? hasAnswered(active, solo.id) : state.players.every((p) => hasAnswered(active, p.id));
  // Hidden from the players while someone answers, so buzzing early buys no reading time.
  const questionHidden = active.buzzed && !active.answerRevealed;
  const correctNames = state.players.filter((p) => active.correctPlayerIds.includes(p.id)).map((p) => p.name);

  return (
    <>
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

      {correctNames.length > 0 && <p className="judging-note">✓ Correct so far: {correctNames.join(', ')}</p>}

      <div className="judging">
        {selected ? (
          <>
            <span className="judging-label">
              <span className="control-dot" style={{ background: selected.color }} />
              {selected.name} {solo ? 'answers alone' : 'answers'}:
            </span>
            <button className="btn btn-correct" onClick={() => dispatch({ type: 'markCorrect', at: Date.now() })}>
              ✓ Correct +{active.value}
              {active.cheese === 'feta' ? ' + steal' : ''} <kbd>C</kbd>
            </button>
            <button className="btn btn-wrong" onClick={() => dispatch({ type: 'markWrong', at: Date.now() })}>
              ✗ Wrong {active.cheese === 'swiss' ? '(no penalty)' : `−${active.value}`} <kbd>W</kbd>
            </button>
            {escButton}
          </>
        ) : questionHidden ? (
          <>
            <span className="judging-label">Who buzzed first? Click a player below or press their number.</span>
            {escButton}
          </>
        ) : (
          <>
            {active.answerRevealed || everyoneDone ? (
              <span className="judging-label">
                {everyoneDone
                  ? solo
                    ? `${solo.name} has answered.`
                    : 'Everyone has answered.'
                  : 'Click a player or press their number to judge.'}
              </span>
            ) : (
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'buzz', at: Date.now() })}>
                Buzz! <kbd>Space</kbd>
              </button>
            )}
            {escButton ?? <span className="hint">Reveal the answer to close this clue.</span>}
          </>
        )}
      </div>
    </>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
