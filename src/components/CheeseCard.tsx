import type { CheeseInfo } from '../game/cheeses';

/** A cheese's name, ability and rule. Used for the reveal splash and the Cheese Guide. */
export function CheeseCard({ cheese, big = false }: { cheese: CheeseInfo; big?: boolean }) {
  return (
    <div className={`cheese-card${big ? ' cheese-card-big' : ''}${cheese.playable ? '' : ' cheese-card-soon'}`}>
      <div className="cheese-art" style={{ background: cheese.color }} aria-hidden>
        {cheese.emoji}
      </div>
      <div className="cheese-text">
        <div className="cheese-name">{cheese.name}</div>
        <div className="cheese-ability">
          {cheese.ability}
          {!cheese.playable && ' · coming soon'}
        </div>
        <p className="cheese-rule">{cheese.rule}</p>
      </div>
    </div>
  );
}
