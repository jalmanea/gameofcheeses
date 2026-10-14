import type { ReactNode } from 'react';
import type { SessionAction } from '../game/history';
import { hasPlatterStarted, PLATTER_STRIKES_OUT, platterPayout, platterSlots } from '../game/platter';
import type { ActiveTile, GameState, PlatterRound } from '../game/types';
import { useView } from '../presenter/presenter';

interface Props {
  state: GameState;
  active: ActiveTile;
  round: PlatterRound;
  dispatch: (action: SessionAction) => void;
  escButton: ReactNode;
}

/** Cheese Platter: a survey board. Players answer in turn; the host flips matches or gives strikes. */
export function PlatterRoundView({ state, active, round, dispatch, escButton }: Props) {
  const prompt = state.board.platterPrompts[round.promptIndex];
  const slots = platterSlots(prompt);
  const turn = state.players.find((p) => p.id === round.turnPlayerId);
  const strikes = turn ? (round.strikes[turn.id] ?? 0) : 0;
  const view = useView();
  const totalStrikes = Object.values(round.strikes).reduce((sum, n) => sum + n, 0);

  return (
    <div className="platter">
      {/* Keyed by the strike count, so a big ✗ flashes up on each new strike. */}
      {totalStrikes > 0 && (
        <div key={totalStrikes} className="strike-flash" aria-hidden>
          ✗
        </div>
      )}
      <p className="platter-prompt">{prompt.prompt}</p>

      <ol className="platter-board" style={{ gridTemplateRows: `repeat(${Math.ceil(slots.length / 2)}, auto)` }}>
        {slots.map((answerIndex, n) => {
          const answer = prompt.answers[answerIndex];
          const found = round.found.find((f) => f.answerIndex === answerIndex);
          const finder = found && state.players.find((p) => p.id === found.playerId);
          const shown = !!found || round.finished;
          const payout = platterPayout(answer.points, active.value);
          return (
            <li key={answerIndex}>
              {shown ? (
                <div
                  className={`platter-slot platter-slot-open${found ? '' : ' platter-slot-missed'}`}
                  style={finder ? { borderColor: finder.color } : undefined}
                >
                  <span className="platter-slot-text">{answer.text}</span>
                  <span className="platter-slot-points">{payout}</span>
                  {finder && <span className="platter-slot-finder">{finder.name}</span>}
                </div>
              ) : view === 'audience' ? (
                <div className="platter-slot">
                  <span className="platter-slot-number">{n + 1}</span>
                </div>
              ) : (
                <button
                  className="platter-slot"
                  disabled={!turn}
                  aria-label={`Slot ${n + 1}: ${turn?.name ?? 'someone'} found it`}
                  onClick={() => dispatch({ type: 'platterReveal', answerIndex })}
                >
                  <span className="platter-slot-number">{n + 1}</span>
                  {/* With a TV window open, the host can see the hidden answers here. */}
                  {view === 'host' && (
                    <span className="platter-slot-secret">
                      {answer.text} · {payout}
                    </span>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {view === 'audience' ? (
        <div className="judging">
          {round.finished ? (
            <span className="judging-label">Round over!</span>
          ) : (
            turn && (
              <span className="judging-label">
                <span className="control-dot" style={{ background: turn.color }} />
                {turn.name}'s turn{strikes > 0 ? ` (${'✗'.repeat(strikes)})` : ''}
              </span>
            )
          )}
        </div>
      ) : (
        <div className="judging">
          {round.finished ? (
            <>
              <span className="judging-label">Round over.</span>
              <button className="btn btn-primary" autoFocus onClick={() => dispatch({ type: 'noOne' })}>
                Done <kbd>Esc</kbd>
              </button>
            </>
          ) : (
            <>
              {turn && (
                <span className="judging-label">
                  <span className="control-dot" style={{ background: turn.color }} />
                  {turn.name}'s answer{strikes > 0 ? ` (${'✗'.repeat(strikes)})` : ''}: click the slot it matches, or
                </span>
              )}
              <button className="btn btn-wrong" onClick={() => dispatch({ type: 'platterStrike' })}>
                ✗ Strike <kbd>X</kbd>
              </button>
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'platterEnd' })}>
                End round <kbd>Enter</kbd>
              </button>
              {/* Once the round has started, Esc also ends it, so only show it while it can still back out. */}
              {!hasPlatterStarted(round) && escButton}
            </>
          )}
        </div>
      )}
      <p className="judging-note platter-note">
        Each answer pays its share of the pot · {PLATTER_STRIKES_OUT} strikes and you're out
      </p>
    </div>
  );
}
