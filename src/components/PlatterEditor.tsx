import {
  addPlatterAnswer,
  addPlatterPrompt,
  platterPromptProblems,
  removePlatterAnswer,
  removePlatterPrompt,
  setPlatterQuestion,
  updatePlatterAnswer,
} from '../boards/boardOps';
import { MAX_PLATTER_ANSWERS, MIN_PLATTER_ANSWERS } from '../game/platter';
import type { Board } from '../game/types';

interface Props {
  board: Board;
  setBoard: (board: Board) => void;
}

const isEmpty = (s: string) => !s.trim();

/** The board's pool of Cheese Platter survey prompts. */
export function PlatterEditor({ board, setBoard }: Props) {
  const prompts = board.platterPrompts;
  const multiplier = board.cheeseSettings.platterPotMultiplier;

  const removePrompt = (i: number) => {
    const p = prompts[i];
    const hasContent = !isEmpty(p.prompt) || p.answers.some((a) => !isEmpty(a.text));
    if (hasContent && !window.confirm(`Remove the Platter prompt "${p.prompt.trim() || `#${i + 1}`}"?`)) return;
    setBoard(removePlatterPrompt(board, i));
  };

  return (
    <div className="editor-scroll">
      <section className="platter-editor" aria-label="Platter prompts">
        <p className="hint">
          A Cheese Platter tile becomes a survey round using one of these prompts (each prompt is used at most once a game). Give
          each prompt {MIN_PLATTER_ANSWERS}–{MAX_PLATTER_ANSWERS} answers with how popular they are, usually adding up to about
          100. An answer pays its share of the pot: popularity ÷ 100 × {multiplier} × the tile value.
        </p>

        {prompts.length === 0 && <p className="hint">No Platter prompts yet.</p>}

        {prompts.map((p, i) => {
          const total = p.answers.reduce((sum, a) => sum + (Number.isFinite(a.points) ? a.points : 0), 0);
          const problems = platterPromptProblems(p);
          return (
            <div key={i} className="platter-prompt-card">
              <div className="platter-prompt-head">
                <span className="setup-number">{i + 1}</span>
                <input
                  className={`text-input${isEmpty(p.prompt) ? ' input-empty' : ''}`}
                  value={p.prompt}
                  maxLength={1000}
                  placeholder="Name something you bring to a picnic"
                  aria-label={`Platter prompt ${i + 1} question`}
                  onChange={(e) => setBoard(setPlatterQuestion(board, i, e.target.value))}
                />
                <button className="btn btn-small btn-ghost" onClick={() => removePrompt(i)} aria-label={`Remove Platter prompt ${i + 1}`}>
                  ✕
                </button>
              </div>
              <ol className="platter-answers">
                {p.answers.map((a, j) => (
                  <li key={j} className="platter-answer-row">
                    <input
                      className={`text-input${isEmpty(a.text) ? ' input-empty' : ''}`}
                      value={a.text}
                      maxLength={1000}
                      placeholder={`Answer ${j + 1}`}
                      aria-label={`Platter prompt ${i + 1}, answer ${j + 1}`}
                      onChange={(e) => setBoard(updatePlatterAnswer(board, i, j, { text: e.target.value }))}
                    />
                    <input
                      className={`text-input platter-points${a.points > 0 ? '' : ' input-empty'}`}
                      type="number"
                      min={1}
                      max={100}
                      value={a.points > 0 ? a.points : ''}
                      placeholder="pts"
                      aria-label={`Platter prompt ${i + 1}, answer ${j + 1} popularity`}
                      onChange={(e) =>
                        setBoard(updatePlatterAnswer(board, i, j, { points: Math.max(0, Math.round(Number(e.target.value) || 0)) }))
                      }
                    />
                    <button
                      className="btn btn-small btn-ghost"
                      disabled={p.answers.length <= MIN_PLATTER_ANSWERS}
                      onClick={() => setBoard(removePlatterAnswer(board, i, j))}
                      aria-label={`Remove answer ${j + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
              <div className="row row-tight">
                <button
                  className="btn btn-small"
                  disabled={p.answers.length >= MAX_PLATTER_ANSWERS}
                  onClick={() => setBoard(addPlatterAnswer(board, i))}
                >
                  + Answer
                </button>
                <span className="hint">Total: {total}</span>
                {problems.length > 0 && <span className="warn">⚠ {problems.join(', ')}</span>}
              </div>
            </div>
          );
        })}

        <button className="btn btn-primary" onClick={() => setBoard(addPlatterPrompt(board))}>
          + Platter prompt
        </button>
      </section>
    </div>
  );
}
