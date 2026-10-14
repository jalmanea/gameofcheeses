import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheeseArt, CheeseWedge } from './CheeseArt';
import type { CheeseId } from '../game/types';

const IDS: CheeseId[] = ['gouda', 'swiss', 'limburger', 'brie', 'mozzarella', 'feta', 'parmesan', 'blue', 'wheel', 'platter'];

describe('CheeseArt', () => {
  it('renders every cheese as a decorative svg by default', () => {
    for (const id of IDS) {
      const html = renderToStaticMarkup(<CheeseArt id={id} />);
      expect(html).toMatch(/^<svg/);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain(`ca-${id}`);
      expect(html).toContain('width="1em"');
    }
  });

  it('exposes a title and role when titled, and an animation class when animated', () => {
    const html = renderToStaticMarkup(<CheeseArt id="brie" title="Brie" animated size={300} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('<title>Brie</title>');
    expect(html).toContain('ca-anim');
    expect(html).toContain('width="300"');
  });

  it('uses unique clip ids per instance', () => {
    const html = renderToStaticMarkup(
      <>
        <CheeseArt id="gouda" animated />
        <CheeseArt id="gouda" animated />
      </>,
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('renders the brand wedge', () => {
    expect(renderToStaticMarkup(<CheeseWedge size={64} className="logo" />)).toContain('ca-wedge logo');
  });
});
