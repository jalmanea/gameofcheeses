import { useState, type FormEvent } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/reducer';
import { boardCheeses, CHEESES } from '../game/cheeses';
import { DEFAULT_TIMER_SECONDS, TIMER_CHOICES } from '../game/timer';
import type { Board, GameSettings, PlayerInput } from '../game/types';

export const PLAYER_COLORS = [
  { name: 'Red', value: '#d62828' },
  { name: 'Blue', value: '#2f6fdb' },
  { name: 'Green', value: '#2a9d4b' },
  { name: 'Purple', value: '#8e44ad' },
  { name: 'Orange', value: '#f77f00' },
  { name: 'Teal', value: '#138a8a' },
];

function nextFreeColor(players: PlayerInput[]): string {
  return (PLAYER_COLORS.find((c) => !players.some((p) => p.color === c.value)) ?? PLAYER_COLORS[0]).value;
}

interface Props {
  board: Board;
  /** Players and settings from the last game, to make a rematch quick. */
  initialPlayers?: PlayerInput[];
  initialSettings?: GameSettings;
  onStart: (players: PlayerInput[], settings: GameSettings) => void;
  onBack: () => void;
}

export function SetupScreen({ board, initialPlayers, initialSettings, onStart, onBack }: Props) {
  const [players, setPlayers] = useState<PlayerInput[]>(() =>
    initialPlayers && initialPlayers.length >= MIN_PLAYERS
      ? initialPlayers.map((p) => ({ name: p.name, color: p.color }))
      : PLAYER_COLORS.slice(0, 3).map((c) => ({ name: '', color: c.value })),
  );
  const [error, setError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(
    initialSettings ? initialSettings.timerSeconds : DEFAULT_TIMER_SECONDS,
  );

  const available = boardCheeses(board);
  const [cheeses, setCheeses] = useState(available);
  const { randomCount, fixed } = board.cheeseSettings;
  const fixedOn = fixed.filter((f) => cheeses.includes(f.cheese)).length;
  const randomOn = available.some((c) => cheeses.includes(c) && board.cheeseSettings.pool.includes(c)) ? randomCount : 0;

  const update = (i: number, patch: Partial<PlayerInput>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Blank names fall back to "Player N".
    const named = players.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` }));
    const names = named.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      setError('Each player needs a different name.');
      return;
    }
    onStart(named, { timerSeconds, cheeses });
  };

  return (
    <main className="screen setup">
      <h1 className="title">Game of Cheeses</h1>
      <form onSubmit={submit} className="panel">
        <p className="setup-board">
          <button type="button" className="btn btn-small btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <span>
            Board: <strong>{board.title}</strong>
          </span>
        </p>
        <h2>Players</h2>
        <p className="hint">
          {MIN_PLAYERS}–{MAX_PLAYERS} players or teams. Players are fixed once the game starts.
        </p>
        <ol className="setup-players">
          {players.map((p, i) => (
            <li key={i} className="setup-player">
              <span className="setup-number">{i + 1}</span>
              <input
                className="text-input"
                value={p.name}
                placeholder={`Player ${i + 1}`}
                maxLength={20}
                aria-label={`Player ${i + 1} name`}
                onChange={(e) => {
                  update(i, { name: e.target.value });
                  setError(null);
                }}
              />
              <div className="swatches" role="radiogroup" aria-label={`Player ${i + 1} color`}>
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={p.color === c.value}
                    aria-label={c.name}
                    title={c.name}
                    className={`swatch${p.color === c.value ? ' swatch-on' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => update(i, { color: c.value })}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={players.length <= MIN_PLAYERS}
                onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}
                aria-label={`Remove player ${i + 1}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        <h2>Cheeses</h2>
        {available.length === 0 ? (
          <p className="hint">This board has no cheeses. Add some in the board editor.</p>
        ) : (
          <>
            <p className="hint">
              Switch off any cheese you don't want this game.{' '}
              {randomOn + fixedOn > 0
                ? `Up to ${randomOn + fixedOn} cheese${randomOn + fixedOn === 1 ? '' : 's'} will be hidden on the board.`
                : 'No cheeses will be hidden.'}
            </p>
            <ul className="setup-cheeses">
              {available.map((id) => {
                const c = CHEESES[id];
                const on = cheeses.includes(id);
                return (
                  <li key={id}>
                    <label className={`setup-cheese${on ? '' : ' setup-cheese-off'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setCheeses((cs) => (e.target.checked ? [...cs, id] : cs.filter((x) => x !== id)))}
                      />
                      <span className="cheese-emoji" aria-hidden>
                        {c.emoji}
                      </span>
                      <strong>{c.name}</strong>
                      <span className="hint">{c.rule}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <h2>Clue timer</h2>
        <p className="hint">Counts down while a clue is shown. It pauses while a player answers.</p>
        <div className="timer-choices" role="radiogroup" aria-label="Clue timer">
          {[null, ...TIMER_CHOICES].map((secs) => (
            <button
              key={secs ?? 'off'}
              type="button"
              role="radio"
              aria-checked={timerSeconds === secs}
              className={`btn btn-small${timerSeconds === secs ? ' btn-on' : ''}`}
              onClick={() => setTimerSeconds(secs)}
            >
              {secs === null ? 'Off' : `${secs}s`}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={players.length >= MAX_PLAYERS}
            onClick={() => setPlayers((ps) => [...ps, { name: '', color: nextFreeColor(ps) }])}
          >
            + Add player
          </button>
          <button type="submit" className="btn btn-primary">
            Start game
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
