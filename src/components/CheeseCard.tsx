import type { CheeseInfo } from '../game/cheeses';
import { CheeseArt } from '../art/CheeseArt';

/** A cheese's name, ability and rule. Used for the reveal splash and the Cheese Guide. */
export function CheeseCard({ cheese, big = false }: { cheese: CheeseInfo; big?: boolean }) {
  return (
    <div className={`cheese-card${big ? ' cheese-card-big' : ''}`}>
      <div className="cheese-art" style={{ background: cheese.color }} aria-hidden>
        <CheeseArt id={cheese.id} size="82%" animated={big} />
      </div>
      <div className="cheese-text">
        <div className="cheese-name">{cheese.name}</div>
        <div className="cheese-ability">{cheese.ability}</div>
        <p className="cheese-rule">{cheese.rule}</p>
      </div>
    </div>
  );
}
