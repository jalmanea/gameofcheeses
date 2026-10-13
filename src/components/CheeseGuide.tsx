import { CHEESE_ORDER, CHEESES } from '../game/cheeses';
import { CheeseCard } from './CheeseCard';

/** Every cheese and its rule, so players can learn them before (or during) a game. */
export function CheeseGuide({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen library">
      <h1 className="title">Cheese Guide</h1>
      <section className="panel panel-wide">
        <p className="setup-board">
          <button className="btn btn-small btn-ghost" onClick={onBack} autoFocus>
            ← Back
          </button>
          <span className="hint">
            Some tiles hide a cheese. When one is picked, its card appears and its rule applies to that clue.
          </span>
        </p>
        <div className="guide-grid">
          {CHEESE_ORDER.map((id) => (
            <CheeseCard key={id} cheese={CHEESES[id]} />
          ))}
        </div>
      </section>
    </main>
  );
}
