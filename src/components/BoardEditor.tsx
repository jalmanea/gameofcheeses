import { useEffect, useState } from 'react';
import {
  addCategory,
  MAX_CATEGORIES,
  MAX_ROWS,
  MAX_TITLE_LENGTH,
  MIN_CATEGORIES,
  MIN_ROWS,
  moveCategory,
  removeCategory,
  resetValues,
  rowCount,
  setCategoryName,
  setRowCount,
  summarizeWarnings,
  updateClue,
  validateBoard,
} from '../boards/boardOps';
import type { Board } from '../game/types';

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
        <button className="btn btn-small btn-ghost" onClick={() => setBoard(resetValues(board))}>
          Reset values to 200, 400…
        </button>
        {warnings.length > 0 ? (
          <span className="warn">⚠ {warnings.join(' · ')}</span>
        ) : (
          <span className="ok">✓ Ready to play</span>
        )}
      </div>

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
