# Game of Cheeses

A cheese-themed, Jeopardy-style quiz game for one screen, run by a host. See [SPEC.md](SPEC.md)
for the full design. Done so far: **milestone 1** (playable core: players, scoring, undo, auto-save, results) and
**milestone 2** (board library, editor, JSON import/export).

## Run

```bash
npm install
npm run dev     # start the dev server
npm test        # reducer unit tests
npm run build   # type-check + production build
```

## Boards

The home screen is the board library: play, edit, duplicate, export or delete boards, create a
new one, or import a `.board.json` file. A game in progress shows at the top, so you can leave
it and resume it later (even after a refresh).

The editor mirrors the board: 3–8 categories × 3–6 rows, each cell with a value, clue and
answer. Empty fields are outlined, a summary lists what's missing, and you're warned before
leaving with unsaved changes. **Test play** saves the board and starts a game with it.

Boards are stored in this browser's localStorage, so export the ones you want to keep or share.
Imported files are checked before they're added and always come in as a new board.

## Host keyboard controls

| Key | Action |
|---|---|
| `Space` | Someone buzzed: hide the question from the players and pause the timer |
| `1`–`6` | Select the player who buzzed (also hides the question if you skipped `Space`) |
| `C` / `W` | Mark the selected player correct / wrong (after a wrong answer the question comes back) |
| `Enter` | Reveal the answer |
| `Esc` | Cancel a buzz or unselect the player (question comes back). Otherwise: before the answer is shown, go back to the board (the tile stays open, e.g. after a mis-click); after the answer is shown, close the clue with no one scoring |
| `Ctrl+Z` | Undo (any number of steps) |
| `F` | Toggle fullscreen |

**Clue timer:** chosen on the setup screen (Off or 5–60 s, default 15 s). It starts when a clue
opens, pauses on a buzz (or when a player is selected), resumes with the time left after a wrong answer,
and stops when the answer is shown. At zero it shows "Time's up!"; the host still decides what
happens next.

Shortcuts are ignored while typing in a text field. Everything is also clickable: during a clue
the score cards are the "who buzzed" buttons, and **± Scores** in the toolbar opens manual score
adjustment and board-control override.

## Code layout

- `src/game/reducer.ts` holds all game rules as one pure, JSON-only reducer
- `src/game/history.ts` holds the undo stack (previous states) wrapped around the reducer
- `src/game/persistence.ts` handles the versioned localStorage save
- `src/boards/` holds pure board editing/validation (`boardOps.ts`), the board file format
  (`boardJson.ts`) and the versioned library storage (`library.ts`)
- `src/components/` holds the screens; `src/useHostKeys.ts` maps keyboard shortcuts to actions
