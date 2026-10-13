# Game of Cheeses — v1 Spec

A cheese-themed, Jeopardy-style quiz game show for the web. One device runs it, a host
reads the clues and judges the answers, and users build their own boards.

## 1. Concept

- **Format**: a single board of categories × point values. The game ends when every tile has been played.
- **Theme**: cheese is the show's identity *and* its special-rules system. Question
  categories are neutral and written by the board author.
- **Setup**: one laptop. It shows a **host window** (with answers) and an **audience window**
  (on a TV/projector), synced with `BroadcastChannel`. No backend.
- **Judging**: the host decides right or wrong for every answer.
- **Buzzing (v1)**: players buzz out loud and the host clicks who buzzed first.
- **Players**: 2–6 players or teams, fixed for the whole game.

## 2. Screens

| Screen | Purpose |
|---|---|
| Home / Library | List saved boards: play, edit, duplicate, delete, import/export JSON |
| Board Editor | Edit categories, clues, answers, values, Platter prompts and cheese settings |
| Game Setup | Choose a board, enter player names and colors, toggle which cheeses are active |
| Cheese Guide | Every cheese and its rule, so players can learn them |
| Board | Cheese-themed category × value grid; used tiles greyed out |
| Clue | Full-screen clue. The host window also shows the answer and judging controls |
| Cheese Reveal | Splash card when a tile hides a cheese: name, art and a one-line rule |
| Cheese Platter | Survey-style answer board (see §4) |
| Results | Final standings and a winner celebration |

## 3. Core gameplay

1. The player with **board control** picks a tile. Control starts with player 1.
2. If the tile hides a cheese, the Cheese Reveal splash shows first, then the cheese's rule applies.
3. The host reads the clue. Players buzz out loud, and the host clicks the player who buzzed first.
4. The host marks the answer **Correct** (+value, and that player takes board control) or **Wrong**
   (−value; the host can pick another player). **No one** closes the tile.
5. When every tile has been played, the game goes to Results.

Host tools: manual score adjustment, **undo** (full history stack), auto-save of the game
in progress (survives a refresh), fullscreen, keyboard shortcuts.

## 4. Cheeses

Placement: **random by default** ("N cheeses from the active pool"), or the author can
assign a cheese to a specific tile. The host can switch individual cheeses off per game.

| Cheese | Ability | Rule |
|---|---|---|
| Gouda ("Golden Gouda") | Wager | The picker wagers up to max(their score, highest tile value) and answers alone |
| Swiss | Holes | A wrong answer costs nothing |
| Aged Parmesan | Ages | The tile's value grows each turn it stays unpicked (shown ripening on the board). Never random: its location is visible |
| Limburger | Stink bomb | The picker can't answer and must hand the clue to another player |
| Brie | Spread | The host can mark several players correct, and all of them score |
| Mozzarella | Stretch | Double value; the answer must cover two parts (written into the clue by the author) |
| Blue cheese | Moldy | The value decays every second from the reveal until the host clicks who buzzed |
| Cheese Wheel | Spin | Spin a wheel for a multiplier (×0.5, ×1, ×1.5, ×2, ×3) |
| Feta | Crumble | A correct answer also steals 10% of the leader's score (nothing extra if the answerer is the leader) |
| **Cheese Platter** | Survey | The tile's clue is replaced by a Family Feud-style survey round (below) |

### Cheese Platter (survey round)

- **Content**: each board has a pool of **Platter prompts**, kept separate from the tile clues
  because cheeses are placed at random. Each prompt has a question ("Name something
  you bring to a picnic") and 4–8 answers with popularity scores (usually summing to about 100).
- **Trigger**: when a Platter tile is revealed, it uses an unused prompt from the pool. Random
  Platter placement is limited by the number of prompts in the pool.
- **Payout**: each answer pays `popularity / 100 × pot`, where `pot = 2 × tile value`
  (the multiplier is configurable per board).
- **Round-robin**: starting with the picker, each active player gives one answer in turn.
  The host clicks the matching slot (it flips and that player scores) or **Strike**. Two strikes
  eliminates a player for this Platter. The round ends when every slot is revealed, every player
  is out, or the host ends it. Any unrevealed answers are then shown.

## 5. Board editor

- An inline grid that mirrors the board: each cell holds clue, answer and value. The board size is
  configurable (3–8 categories × 3–6 rows); values default to 200–1000.
- Cheese settings: number of random cheeses, the allowed pool, and optional fixed tile assignments.
- An editor for the Platter prompt pool.
- Validation warnings (empty clues or answers, fewer Platter prompts than Platter cheeses).
- JSON import/export for sharing; optional image per clue; a test-play button.
- Storage: `localStorage`, moving to IndexedDB once image clues are added.

## 6. Data model (sketch)

```ts
type CheeseId =
  | 'gouda' | 'swiss' | 'parmesan' | 'limburger' | 'brie'
  | 'mozzarella' | 'blue' | 'wheel' | 'feta' | 'platter';

interface Board {
  id: string;
  title: string;
  categories: { name: string; clues: Clue[] }[];
  platterPrompts: PlatterPrompt[];
  cheeseSettings: {
    randomCount: number;
    pool: CheeseId[];
    fixed: { categoryIndex: number; clueIndex: number; cheese: CheeseId }[];
    platterPotMultiplier: number; // default 2
  };
}

interface Clue { value: number; clue: string; answer: string; imageUrl?: string }
interface PlatterPrompt { prompt: string; answers: { text: string; points: number }[] }

interface Player { id: string; name: string; color: string; score: number }

interface GameState {
  boardId: string;
  players: Player[];
  controlPlayerId: string;
  tiles: { played: boolean; cheese?: CheeseId; agedTurns?: number }[][];
  active?: ActiveTile;      // the clue/cheese currently being played
  history: GameAction[];    // for undo
}
```

All game logic goes in one pure reducer (`(state, action) => state`). That makes undo, persistence
and two-window sync straightforward: the host window owns the state, and the audience window renders
broadcast snapshots.

## 7. Host controls (keyboard)

| Key | Action |
|---|---|
| `Space` | Reveal the answer / advance |
| `1–6` | Select the player who buzzed / mark that player correct |
| `Shift+1–6` | Mark that player wrong |
| `X` | Strike (Platter) |
| `Esc` | Back to the board (no one answered) |
| `Ctrl+Z` | Undo |
| `F` | Fullscreen |

## 8. Out of scope for v1 (possible later)

- Keyboard or game-controller buzzers (Gamepad API), with arming and an early-buzz lockout
- Phone buzzers (needs a backend)
- A collectible "cheese pantry" of player-held power-ups
- Extra rounds (a doubled second board, a final round)
- Audio/video clues, accounts, an online board library

## 9. Milestones

1. **Playable core**: scaffold Vite + React + TS, hardcoded board, players, scoring, clue view, undo, auto-save
2. **Editor and library**: create, edit, save and delete boards, JSON import/export
3. **Cheeses**: reveal splash, Cheese Guide, the simple cheeses first (Gouda, Swiss, Limburger, Brie, Mozzarella, Feta)
4. **Timed and special cheeses**: Blue cheese, Aged Parmesan, Cheese Wheel, Cheese Platter
5. **Presenter mode**: host and audience windows via `BroadcastChannel`
6. **Polish**: cheese visual identity, animations, original sound effects, results celebration
