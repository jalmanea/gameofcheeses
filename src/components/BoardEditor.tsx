import { useEffect, useState } from 'react';
import {
  addCategory,
  fixedCheeseAt,
  MAX_CATEGORIES,
  MAX_RANDOM_CHEESES,
  MAX_ROWS,
  MAX_TITLE_LENGTH,
  MIN_CATEGORIES,
  MIN_ROWS,
  moveCategory,
  removeCategory,
  resetValues,
  rowCount,
  setCategoryName,
  setFixedCheese,
  setRandomCheeseCount,
  setRowCount,
  toggleCheeseInPool,
  summarizeWarnings,
  updateClue,
  validateBoard,
} from '../boards/boardOps';
import { CHEESE_ORDER, CHEESES, PLAYABLE_CHEESES } from '../game/cheeses';
import type { Board, CheeseId } from '../game/types';

interface Props {
  /** The board as last saved (or a new blank board). */
  initial: Board;
  /** True if `initial` hasn't been saved to the library yet. */
  isNew: boolean;
  onSave: (board: Board) => void;
  onClose: () => void;
  /** Saves, then starts a game with this board. */
  onTestPlay: (board: Board) => void;
}

const isEmpty = (s: string) => !s.trim();

export function BoardEditor({ initial, isNew, onSave, onClose, onTestPlay }: Props) {
  const [board, setBoard] = useState(initial);
  const [saved, setSaved] = useState(isNew ? null : initial);
  const [showCheeses, setShowCheeses] = useState(false);
  const cs = board.cheeseSettings;
  const dirty = saved === null || JSON.stringify(board) !== JSON.stringify(saved);
  const rows = rowCount(board);
  const warnings = summarizeWarnings(validateBoard(board));

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const save = () => {
    const clean = { ...board, title: board.title.trim() || 'Untitled board' };
    setBoard(clean);
    setSaved(clean);
    onSave(clean);
    return clean;
  };

  const close = () => {
    if (dirty && !window.confirm('Leave without saving your changes?')) return;
    onClose();
  };

  const removeColumn = (ci: number) => {
    const c = board.categories[ci];
    const hasContent = !!c.name.trim() || c.clues.some((x) => x.clue.trim() || x.answer.trim());
    if (hasContent && !window.confirm(`Remove the category "${c.name.trim() || `#${ci + 1}`}" and its clues?`)) return;
    setBoard(removeCategory(board, ci));
  };

  const shrinkRows = () => {
    const last = board.categories.map((c) => c.clues[rows - 1]);
    if (last.some((x) => x.clue.trim() || x.answer.trim()) && !window.confirm('Remove the bottom row and its clues?')) return;
    setBoard(setRowCount(board, rows - 1));
  };

  return (
    <div className="editor">
      <header className="toolbar editor-toolbar">
        <button className="btn btn-small btn-ghost" onClick={close}>
          ← Library
        </button>
        <input
          className="text-input editor-title"
          value={board.title}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="Board title"
          aria-label="Board title"
          onChange={(e) => setBoard({ ...board, title: e.target.value })}
        />
        <span className="hint editor-status">{dirty ? 'Unsaved changes' : 'Saved'}</span>
        <button className="btn btn-small" onClick={() => onTestPlay(save())}>
          ▶ Test play
        </button>
        <button className="btn btn-small btn-primary" onClick={save} disabled={!dirty}>
          Save
        </button>
      </header>

      <div className="editor-controls">
        <span className="stepper">
          Categories
          <button className="btn btn-small" disabled={board.categories.length >= MAX_CATEGORIES} onClick={() => setBoard(addCategory(board))}>
            + Add
          </button>
          <span className="hint">
            ({MIN_CATEGORIES}–{MAX_CATEGORIES})
          </span>
        </span>
        <span className="stepper">
          Rows
          <button className="btn btn-small" disabled={rows <= MIN_ROWS} onClick={shrinkRows} aria-label="Remove a row">
            −
          </button>
          <strong>{rows}</strong>
          <button className="btn btn-small" disabled={rows >= MAX_ROWS} onClick={() => setBoard(setRowCount(board, rows + 1))} aria-label="Add a row">
            +
          </button>
          <span className="hint">
            ({MIN_ROWS}–{MAX_ROWS})
          </span>
        </span>
        <button
          className={`btn btn-small${showCheeses ? ' btn-on' : ''}`}
          aria-expanded={showCheeses}
          onClick={() => setShowCheeses((v) => !v)}
        >
          🧀 Cheeses ({cs.randomCount} random{cs.fixed.length ? `, ${cs.fixed.length} fixed` : ''})
        </button>
        <button className="btn btn-small btn-ghost" onClick={() => setBoard(resetValues(board))}>
          Reset values to 200, 400…
        </button>
        {warnings.length > 0 ? (
          <span className="warn">⚠ {warnings.join(' · ')}</span>
        ) : (
          <span className="ok">✓ Ready to play</span>
        )}
      </div>

      {showCheeses && (
        <section className="editor-cheeses" aria-label="Cheese settings">
          <span className="stepper">
            Random cheeses
            <button
              className="btn btn-small"
              disabled={cs.randomCount <= 0}
              onClick={() => setBoard(setRandomCheeseCount(board, cs.randomCount - 1))}
              aria-label="Fewer random cheeses"
            >
              −
            </button>
            <strong>{cs.randomCount}</strong>
            <button
              className="btn btn-small"
              disabled={cs.randomCount >= MAX_RANDOM_CHEESES}
              onClick={() => setBoard(setRandomCheeseCount(board, cs.randomCount + 1))}
              aria-label="More random cheeses"
            >
              +
            </button>
          </span>
          <span className="editor-pool">
            <span>Picked from:</span>
            {CHEESE_ORDER.map((id) => {
              const c = CHEESES[id];
              return (
                <label key={id} className={`pool-chip${c.playable ? '' : ' pool-chip-soon'}`} title={c.playable ? c.rule : 'Coming soon'}>
                  <input
                    type="checkbox"
                    disabled={!c.playable}
                    checked={cs.pool.includes(id)}
                    onChange={(e) => setBoard(toggleCheeseInPool(board, id, e.target.checked))}
                  />
                  {c.emoji} {c.name}
                </label>
              );
            })}
          </span>
          <span className="hint">
            Random cheeses land on different tiles each game. To always hide a cheese on a particular clue, pick it in that clue's
            cheese menu below.
          </span>
        </section>
      )}

      <div className="editor-scroll">
        <div className="editor-grid" style={{ gridTemplateColumns: `repeat(${board.categories.length}, minmax(11em, 1fr))` }}>
          {board.categories.map((cat, ci) => (
            <div key={ci} className="editor-column">
              <div className="editor-category">
                <input
                  className={`text-input${isEmpty(cat.name) ? ' input-empty' : ''}`}
                  value={cat.name}
                  maxLength={80}
                  placeholder={`Category ${ci + 1}`}
                  aria-label={`Category ${ci + 1} name`}
                  onChange={(e) => setBoard(setCategoryName(board, ci, e.target.value))}
                />
                <div className="editor-category-actions">
                  <button className="btn btn-small btn-ghost" disabled={ci === 0} onClick={() => setBoard(moveCategory(board, ci, -1))} aria-label={`Move category ${ci + 1} left`}>
                    ◀
                  </button>
                  <button
                    className="btn btn-small btn-ghost"
                    disabled={ci === board.categories.length - 1}
                    onClick={() => setBoard(moveCategory(board, ci, 1))}
                    aria-label={`Move category ${ci + 1} right`}
                  >
                    ▶
                  </button>
                  <button
                    className="btn btn-small btn-ghost"
                    disabled={board.categories.length <= MIN_CATEGORIES}
                    onClick={() => removeColumn(ci)}
                    aria-label={`Remove category ${ci + 1}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {cat.clues.map((clue, ri) => {
                const label = `${cat.name.trim() || `Category ${ci + 1}`}, row ${ri + 1}`;
                return (
                  <div key={ri} className="editor-cell">
                    <label className="editor-value">
                      <span className="sr-only">{label} value</span>
                      <input
                        className={`text-input${!(clue.value > 0) ? ' input-empty' : ''}`}
                        type="number"
                        min={1}
                        step={100}
                        value={clue.value > 0 ? clue.value : ''}
                        onChange={(e) => setBoard(updateClue(board, ci, ri, { value: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
                      />
                    </label>
                    <textarea
                      className={`text-input editor-clue${isEmpty(clue.clue) ? ' input-empty' : ''}`}
                      value={clue.clue}
                      rows={3}
                      maxLength={1000}
                      placeholder="Clue"
                      aria-label={`${label} clue`}
                      onChange={(e) => setBoard(updateClue(board, ci, ri, { clue: e.target.value }))}
                    />
                    <input
                      className={`text-input editor-answer${isEmpty(clue.answer) ? ' input-empty' : ''}`}
                      value={clue.answer}
                      maxLength={1000}
                      placeholder="Answer"
                      aria-label={`${label} answer`}
                      onChange={(e) => setBoard(updateClue(board, ci, ri, { answer: e.target.value }))}
                    />
                    <FixedCheese
                      cheese={fixedCheeseAt(board, ci, ri)}
                      editing={showCheeses}
                      label={label}
                      onChange={(cheese) => setBoard(setFixedCheese(board, ci, ri, cheese))}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A clue's fixed cheese: a badge normally, a menu while the cheese panel is open. */
function FixedCheese(props: { cheese: CheeseId | null; editing: boolean; label: string; onChange: (c: CheeseId | null) => void }) {
  const { cheese, editing } = props;
  if (!editing) {
    return cheese ? (
      <span className="fixed-cheese" title={`Always hides ${CHEESES[cheese].name}`}>
        {CHEESES[cheese].emoji} {CHEESES[cheese].name}
      </span>
    ) : null;
  }
  // Keep a non-playable cheese (from an imported file) selectable so it isn't silently dropped.
  const options = cheese && !PLAYABLE_CHEESES.includes(cheese) ? [...PLAYABLE_CHEESES, cheese] : PLAYABLE_CHEESES;
  return (
    <select
      className="text-input fixed-cheese-select"
      value={cheese ?? ''}
      aria-label={`${props.label} fixed cheese`}
      onChange={(e) => props.onChange((e.target.value || null) as CheeseId | null)}
    >
      <option value="">No fixed cheese</option>
      {options.map((id) => (
        <option key={id} value={id}>
          {CHEESES[id].emoji} {CHEESES[id].name}
        </option>
      ))}
    </select>
  );
}
