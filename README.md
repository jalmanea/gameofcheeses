# Game of Cheeses

A cheese-themed, Jeopardy-style quiz game for one screen, run by a host. See [SPEC.md](SPEC.md)
for the full design. This is **milestone 1: the playable core** (hardcoded sample board, players,
scoring, undo, auto-save, results).

## Run

```bash
npm install
npm run dev     # start the dev server
npm test        # reducer unit tests
npm run build   # type-check + production build
```

## Host keyboard controls

| Key | Action |
|---|---|
| `Space` | Reveal the answer; once revealed (and no player is selected), close the clue |
| `1`–`6` | Select the player who buzzed |
| `C` / `W` | Mark the selected player correct / wrong |
| `Esc` | Unselect the player; if none is selected, close the clue with no one scoring |
| `Ctrl+Z` | Undo (any number of steps) |
| `F` | Toggle fullscreen |

Shortcuts are ignored while typing in a text field. Everything is also clickable: during a clue
the score cards are the "who buzzed" buttons, and **± Scores** in the toolbar opens manual score
adjustment and board-control override.

## Code layout

- `src/game/reducer.ts` holds all game rules as one pure, JSON-only reducer
- `src/game/history.ts` holds the undo stack (previous states) wrapped around the reducer
- `src/game/persistence.ts` handles the versioned localStorage save
- `src/components/` holds the screens; `src/useHostKeys.ts` maps keyboard shortcuts to actions
