# Game of Cheeses

A cheese-themed, Jeopardy-style quiz game for one laptop and a TV, run by a host. See [SPEC.md](SPEC.md)
for the full design. Done so far: **milestone 1** (playable core: players, scoring, undo, auto-save, results),
**milestone 2** (board library, editor, JSON import/export), **milestone 3** (cheeses: reveal
splash, Cheese Guide, and Gouda, Swiss, Limburger, Brie, Mozzarella, Feta), **milestone 4**
(Aged Parmesan, Blue cheese, Cheese Wheel and the Cheese Platter survey round), **milestone 5**
(presenter mode: a TV window for the players and a host view with the answers) and **milestone 6**
(polish: cheese illustrations, animations, sound effects and a results celebration).

**Play it:** https://jalmanea.github.io/gameofcheeses/ (deployed from `main` by GitHub Actions;
boards and games are saved in your browser).

## Run

```bash
npm install
npm run dev     # start the dev server
npm test        # unit tests
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

## Cheeses

Some tiles hide a cheese with a special rule. When one is picked, a Cheese Reveal card shows
first (`Space` to continue), then the rule applies:

| Cheese | Rule |
|---|---|
| Golden Gouda | The picker wagers 0 up to max(their score, the top clue value) and answers alone |
| Swiss | Wrong answers cost nothing |
| Limburger | The picker can't answer; they choose who gets the clue (`1`–`6`), and that player answers alone |
| Brie | Several players can be marked correct and all score; close with `Esc` (Done). The first correct player takes control |
| Mozzarella | Double value; the answer has two parts |
| Feta | A correct answer also takes 10% of the leader's score (each tied leader; nothing if you lead) |
| Aged Parmesan | Never hidden: the author puts it on a clue and it shows on the board. It gains 10% of its value each turn nobody picks it (a turn = another tile closing), up to ×3 |
| Blue cheese | The value drops 5% of the printed value per second, down to 20%. It pauses with the timer (on a buzz) and carries on after a wrong answer |
| Cheese Wheel | `Space` spins for ×0.5, ×1, ×1.5, ×2 or ×3, then `Space` shows the clue |
| Cheese Platter | A survey round instead of the clue (below) |

**Cheese Platter.** Each board has a pool of Platter prompts (edit them with **🍽️ Platter
prompts** in the editor): a question and 4–8 answers with popularity points, usually adding up to
about 100. Each Platter tile gets its own prompt when the game starts, so a board never has more
Platters than prompts. Starting with the picker, players answer in turn: press the slot's number
(`1`–`8`, most popular first) or click it to flip it, which pays that player
`points ÷ 100 × pot` (pot = 2 × tile value by default, set under **🧀 Cheeses**), or `X` for a
strike. Two strikes and a player is out. The round ends when every answer is found, everyone is
out, or the host presses `Enter`; the rest of the answers are then shown and `Esc` closes the
tile. Board control stays with the picker.

In the editor, **🧀 Cheeses** sets how many random cheeses to hide, which cheeses they're picked
from, and lets you fix a cheese on a specific clue. At game setup the host can switch off any of
the board's cheeses for that game. Played tiles show the cheese they hid. The **Cheese Guide**
(from the library) lists every cheese.

## Presenter mode (TV window)

During a game, **📺 TV window** in the toolbar opens a second window. Drag it to the TV or
projector and double-click it (or press `F`) for fullscreen. It shows the board, clues, cheeses,
the wheel, Platter rounds, scores and results, but no buttons, and answers only once they're
revealed.

While a TV window is open, the button reads **📺 On the TV** and the host's window becomes the
host view: the answer to every clue is shown (marked "Only you can see this"), the question stays
readable after a buzz, and Platter slots show their hidden answers. Close the TV window and the
host's window goes back to hiding answers (within a few seconds, even if the TV window crashed).

The host's window runs the game; the TV window only mirrors it, so run it all from the host's
window. Keys pressed while the TV window has the focus are passed on, so the shortcuts below
still work after clicking on the TV. The two windows talk over `BroadcastChannel`, so they must
be in the same browser on the same computer. Without a TV window everything works in one window
as before. If the browser blocks the window, allow pop-ups for the site.

## Look and sound

Every cheese has its own illustration (hand-made inline SVG, no image files), which comes to life
on the reveal card. Clues zoom in, buzzes slam in, answers rise, Platter answers flip over,
strikes flash a big ✗, score changes float up from the scoreboard, and the results arrive one by
one under falling cheese confetti. Animations are turned off when the system asks for reduced
motion.

Sound effects are original, synthesised in the browser with the Web Audio API: picking a clue, a
cheese reveal, buzz, correct, wrong, reveal, the wheel's ticks, Platter dings and strikes, time's
up, and a fanfare at the end. **🔊 Sound** in the toolbar mutes them (remembered in this browser).
With a TV window open, only the TV window plays them; it needs one click or key press before the
browser lets it make sound (double-clicking for fullscreen counts).

## Host keyboard controls

| Key | Action |
|---|---|
| `Space` | Continue past a Cheese Reveal; during a clue, someone buzzed: hide the question and pause the timer |
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

- `src/game/reducer.ts` holds all game rules as one pure, JSON-only reducer; `cheeses.ts` and
  `platter.ts` hold the cheese catalogue, placement and the Platter round helpers
- `src/game/history.ts` holds the undo stack (previous states) wrapped around the reducer
- `src/game/persistence.ts` handles the versioned localStorage save
- `src/boards/` holds pure board editing/validation (`boardOps.ts`), the board file format
  (`boardJson.ts`) and the versioned library storage (`library.ts`)
- `src/game/hostKeys.ts` maps keyboard shortcuts to actions (pure, so keys from the TV window
  go through it too); `src/useHostKeys.ts` hooks it up to the window
- `src/presenter/` holds the TV window link: `link.ts` (the `BroadcastChannel` protocol: state
  broadcasts, hello/bye/heartbeat, forwarded keys) and `presenter.ts` (React hooks and the
  view-mode context: `single`, `host` or `audience`)
- `src/game/soundCues.ts` works out which sounds a change of state calls for (pure);
  `src/sound/` synthesises them and plays them in the window that has the speakers
- `src/art/CheeseArt.tsx` holds the cheese illustrations and the brand wedge
- `src/components/` holds the screens; `AudienceScreen.tsx` is the TV window
