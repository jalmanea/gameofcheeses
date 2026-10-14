// Hand-drawn inline-SVG portraits of the ten cheeses, plus the brand wedge.
// Every drawing lives in a 120x120 box, uses chunky "rind" outlines with a
// soft cream halo behind the silhouette so it reads on the dark card
// background, and has an optional idle animation (see cheeseArt.css).

import { useId, type ReactElement, type ReactNode } from 'react';
import type { CheeseId } from '../game/types';
import './cheeseArt.css';

const RIND = '#2a1a0d';
const CREAM = '#fff6dc';
const OUT = 4; // main outline width

/** Props spread on a <g> wrapping silhouette copies to paint the light rim. */
const HALO = {
  fill: CREAM,
  stroke: CREAM,
  strokeWidth: 11,
  strokeLinejoin: 'round' as const,
  opacity: 0.3,
};

/** Outline-only props for shapes that take their own fill. */
const LINE = {
  stroke: RIND,
  strokeWidth: OUT,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

type Drawing = (uid: string, animated: boolean) => ReactNode;

// ---------------------------------------------------------------- Gouda
const GOUDA_TOP = 'M60 46 L79.4 61.4 A46 17 0 1 1 106 46 Z';
const GOUDA_BAND = 'M79.4 61.4 L79.4 89.4 A46 17 0 0 1 14 74 L14 46 A46 17 0 0 0 79.4 61.4 Z';
const GOUDA_FACE = 'M60 46 H106 V74 H60 Z';

const gouda: Drawing = (uid, animated) => (
  <>
    <defs>
      <clipPath id={`${uid}-gouda`}>
        <path d={GOUDA_FACE} />
        <path d={GOUDA_BAND} />
        <path d={GOUDA_TOP} />
      </clipPath>
    </defs>
    <g {...HALO}>
      <path d={GOUDA_FACE} />
      <path d={GOUDA_BAND} />
      <path d={GOUDA_TOP} />
    </g>
    {/* cut face: golden paste with a thin wax skin on the outer edges */}
    <path d={GOUDA_FACE} fill="#f6c445" />
    <path d="M60 64 H106 V74 H60 Z" fill="#e8a317" />
    <path d="M60 46 H106 V49 H60 Z M102.5 46 H106 V74 H102.5 Z M60 71 H106 V74 H60 Z" fill="#c1272d" />
    <ellipse cx="74" cy="57" rx="3.4" ry="2.6" fill="#d99a1c" stroke={RIND} strokeWidth={1.5} />
    <ellipse cx="92" cy="63" rx="2.6" ry="2" fill="#d99a1c" stroke={RIND} strokeWidth={1.5} />
    <path d={GOUDA_FACE} fill="none" {...LINE} />
    {/* waxed side and top */}
    <path d={GOUDA_BAND} fill="#9e1d22" {...LINE} />
    <path d="M18 76 A44 15 0 0 0 76 88" fill="none" stroke="#7a1418" strokeWidth={3} strokeLinecap="round" />
    <path d={GOUDA_TOP} fill="#c1272d" {...LINE} />
    <path d="M22 41 Q34 32 56 30.5" fill="none" stroke="#ec6a6e" strokeWidth={3.5} strokeLinecap="round" />
    {/* gold coin seal on the rind */}
    <circle cx="42" cy="75" r="9" fill="#f6c445" stroke={RIND} strokeWidth={3} />
    <circle cx="42" cy="75" r="5" fill="none" stroke="#d99a1c" strokeWidth={2} />
    <path d="M39 71.5 Q41 70.5 42.5 71" fill="none" stroke="#fff3c4" strokeWidth={1.6} strokeLinecap="round" />
    {animated && (
      <g clipPath={`url(#${uid}-gouda)`}>
        <g className="ca-glint">
          <rect x="-26" y="0" width="12" height="120" fill="#fff6dc" opacity="0.6" transform="skewX(-22)" />
        </g>
      </g>
    )}
  </>
);

// ---------------------------------------------------------------- Swiss
const SWISS_TOP = 'M14 62 L70 30 L108 46 Z';
const SWISS_FRONT = 'M14 62 L108 46 L108 80 L14 96 Z';

function Hole({ cx, cy, r, i, color, inner }: { cx: number; cy: number; r: number; i: number; color: string; inner: string }) {
  return (
    <g className="ca-pop" style={{ animationDelay: `${i * -0.55}s` }}>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={RIND} strokeWidth={2.5} />
      <circle cx={cx + r * 0.25} cy={cy + r * 0.25} r={r * 0.6} fill={inner} />
    </g>
  );
}

const swiss: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={SWISS_TOP} />
      <path d={SWISS_FRONT} />
    </g>
    <path d={SWISS_FRONT} fill="#f2d675" />
    <path d="M14 88 L108 72 L108 80 L14 96 Z" fill="#dcb94a" />
    <path d={SWISS_FRONT} fill="none" {...LINE} />
    <path d={SWISS_TOP} fill="#ffe08a" {...LINE} />
    <Hole cx={34} cy={78} r={6.5} i={0} color="#b8902c" inner="#cfa63a" />
    <Hole cx={61} cy={69} r={8.5} i={1} color="#b8902c" inner="#cfa63a" />
    <Hole cx={88} cy={70} r={6.5} i={2} color="#b8902c" inner="#cfa63a" />
    <Hole cx={48} cy={86} r={3.2} i={3} color="#b8902c" inner="#cfa63a" />
    <Hole cx={100} cy={58} r={3.8} i={4} color="#b8902c" inner="#cfa63a" />
    <g className="ca-pop" style={{ animationDelay: '-1.2s' }}>
      <ellipse cx="64" cy="41" rx="8" ry="3.6" fill="#c9a23a" stroke={RIND} strokeWidth={2.5} />
    </g>
    <g className="ca-pop" style={{ animationDelay: '-2.1s' }}>
      <ellipse cx="86" cy="43" rx="5" ry="2.4" fill="#c9a23a" stroke={RIND} strokeWidth={2.5} />
    </g>
    <g className="ca-pop" style={{ animationDelay: '-0.4s' }}>
      <ellipse cx="44" cy="51" rx="4" ry="2" fill="#c9a23a" stroke={RIND} strokeWidth={2.2} />
    </g>
  </>
);

// ---------------------------------------------------------------- Limburger
const LIMB_FRONT = 'M16 60 H84 V100 H16 Z';
const LIMB_TOP = 'M16 60 L36 42 H104 L84 60 Z';
const LIMB_SIDE = 'M84 60 L104 42 V82 L84 100 Z';
const WISP = 'M0 0 c-7 -5 7 -9 0 -14 s7 -9 0 -14';

const limburger: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={LIMB_FRONT} />
      <path d={LIMB_TOP} />
      <path d={LIMB_SIDE} />
    </g>
    <path d={LIMB_SIDE} fill="#a85a24" {...LINE} />
    <path d={LIMB_TOP} fill="#e08a3a" {...LINE} />
    <path d={LIMB_FRONT} fill="#c96f2c" {...LINE} />
    {/* cut face: pale paste inside the washed rind */}
    <rect x="22" y="66" width="56" height="28" rx="3" fill="#f1e2a6" />
    <path d="M22 88 H78 V91 Q78 94 75 94 H25 Q22 94 22 91 Z" fill="#dccb85" />
    <circle cx="36" cy="76" r="2" fill="#d6c27a" />
    <circle cx="60" cy="82" r="2.4" fill="#d6c27a" />
    <circle cx="68" cy="72" r="1.6" fill="#d6c27a" />
    {/* rind blotches */}
    <ellipse cx="50" cy="51" rx="6" ry="2.4" fill="#c66f28" />
    <ellipse cx="76" cy="48" rx="4" ry="1.8" fill="#c66f28" />
    <ellipse cx="96" cy="66" rx="2" ry="4" fill="#8a4618" />
    {/* stink */}
    {[
      { x: 38, d: '0s' },
      { x: 60, d: '-0.8s' },
      { x: 82, d: '-1.6s' },
    ].map((w) => (
      <g key={w.x} transform={`translate(${w.x} 40)`}>
        <g className="ca-stink" style={{ animationDelay: w.d }}>
          <path d={WISP} fill="none" stroke={RIND} strokeWidth={9} strokeLinecap="round" />
          <path d={WISP} fill="none" stroke="#9bb24a" strokeWidth={5} strokeLinecap="round" />
        </g>
      </g>
    ))}
  </>
);

// ---------------------------------------------------------------- Brie
const BRIE_TOP = 'M58 50 L80 65.6 A44 18 0 1 1 102 50 Z';
const BRIE_BAND = 'M80 65.6 L80 83.6 A44 18 0 0 1 14 68 L14 50 A44 18 0 0 0 80 65.6 Z';
const BRIE_FACE = 'M58 50 H102 V68 H58 Z';
const BRIE_OOZE = 'M78 64 L102 66 C104 73 101 78 97 78 C96 86 90 90 87 85 C85 80 80 83 79 77 Z';

const brie: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={BRIE_FACE} />
      <path d={BRIE_BAND} />
      <path d={BRIE_TOP} />
      <path d={BRIE_OOZE} />
    </g>
    <path d={BRIE_FACE} fill="#f9e7a6" />
    <path d="M58 50 H102 V53 H58 Z M98.5 50 H102 V68 H98.5 Z" fill="#fbf8ef" />
    <path d={BRIE_FACE} fill="none" {...LINE} />
    <g className="ca-ooze">
      <path d={BRIE_OOZE} fill="#f6dc8c" {...LINE} />
      <path d="M84 70 Q90 72 96 70" fill="none" stroke="#fff3c8" strokeWidth={2.5} strokeLinecap="round" />
    </g>
    <path d={BRIE_BAND} fill="#e6dfcd" {...LINE} />
    <path d={BRIE_TOP} fill="#fbf8ef" {...LINE} />
    {/* bloomy specks */}
    {[
      [30, 44], [44, 38], [62, 37], [80, 41], [36, 56], [50, 60], [24, 52],
      [30, 74], [48, 79], [64, 80], [22, 66],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill="#cfc4a8" />
    ))}
    <g className="ca-drip">
      <ellipse cx="89" cy="94" rx="3" ry="3.8" fill="#f6dc8c" stroke={RIND} strokeWidth={2.5} />
    </g>
  </>
);

// ---------------------------------------------------------------- Mozzarella
const STRAND = 'M54 50 C49 38 63 33 59 24 C56 17 62 12 68 12';

const mozzarella: Drawing = () => (
  <>
    <g {...HALO}>
      <circle cx="50" cy="76" r="30" />
      <circle cx="91" cy="68" r="20" />
      <path d={STRAND} fill="none" />
      <circle cx="68" cy="12" r="4" />
    </g>
    <g className="ca-bob-small">
      <circle cx="91" cy="68" r="20" fill="#d3dee5" {...LINE} />
      <circle cx="88.5" cy="65" r="15.5" fill="#f6f9fb" />
      <ellipse cx="86" cy="58" rx="5" ry="2.8" fill="#ffffff" transform="rotate(-30 86 58)" />
      <circle cx="91" cy="68" r="20" fill="none" {...LINE} />
    </g>
    <g className="ca-stretch">
      <path d={STRAND} fill="none" stroke={RIND} strokeWidth={12} strokeLinecap="round" />
    </g>
    <g className="ca-squish">
      <circle cx="50" cy="76" r="30" fill="#d3dee5" />
      <circle cx="46" cy="71.5" r="24.5" fill="#f6f9fb" />
      <ellipse cx="37" cy="61" rx="8" ry="4.5" fill="#ffffff" transform="rotate(-35 37 61)" />
      <circle cx="30" cy="71" r="2" fill="#ffffff" />
      <circle cx="50" cy="76" r="30" fill="none" {...LINE} />
    </g>
    <g className="ca-stretch">
      <path d={STRAND} fill="none" stroke="#f6f9fb" strokeWidth={6} strokeLinecap="round" />
    </g>
    {/* basil */}
    <path d="M70 104 Q62 92 70 84 Q80 94 70 104 Z" fill="#4f9a3a" stroke={RIND} strokeWidth={3} strokeLinejoin="round" />
    <path d="M72 104 Q84 104 92 94 Q80 88 72 104 Z" fill="#5fae45" stroke={RIND} strokeWidth={3} strokeLinejoin="round" />
    <path d="M70 101 V89 M74 101 L86 95" fill="none" stroke="#2f6b22" strokeWidth={1.6} strokeLinecap="round" />
  </>
);

// ---------------------------------------------------------------- Feta
const FETA_FRONT = 'M18 50 H40 L44 54 L49 50 H78 V92 H18 Z';
const FETA_TOP = 'M18 50 L36 34 H84 L89 38 L93 35 L78 50 H49 L44 54 L40 50 Z';
const FETA_SIDE = 'M78 50 L93 35 L97 43 L94 50 L98 58 L95 67 L97 75 L78 92 Z';

function Crumb({ x, y, s, cls, delay }: { x: number; y: number; s: number; cls?: string; delay?: string }) {
  return (
    <g className={cls} style={delay ? { animationDelay: delay } : undefined}>
      <path
        d={`M${x - s} ${y - s * 0.6} L${x + s * 0.3} ${y - s} L${x + s} ${y - s * 0.2} L${x + s * 0.6} ${y + s * 0.9} L${x - s * 0.7} ${y + s * 0.7} Z`}
        fill="#f4f8f9"
        stroke={RIND}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </g>
  );
}

const feta: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={FETA_FRONT} />
      <path d={FETA_TOP} />
      <path d={FETA_SIDE} />
    </g>
    <path d={FETA_SIDE} fill="#c9d5db" {...LINE} />
    <path d={FETA_TOP} fill="#ffffff" {...LINE} />
    <path d={FETA_FRONT} fill="#eaf0f2" {...LINE} />
    {/* crumbly pocks */}
    {[
      [28, 62, 2.2], [42, 70, 1.6], [56, 62, 2], [66, 78, 2.4], [32, 82, 1.8], [52, 84, 1.4], [70, 60, 1.4],
      [86, 62, 1.6], [88, 78, 1.8],
    ].map(([x, y, r]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#b9c7ce" />
    ))}
    <path d="M60 41 l3 -2 l3 2" fill="none" stroke="#c9d5db" strokeWidth={1.6} strokeLinecap="round" />
    {/* resting crumbs */}
    <Crumb x={58} y={102} s={4} />
    <Crumb x={86} y={104} s={5} />
    <Crumb x={72} y={108} s={3} />
    {/* falling crumbs */}
    <Crumb x={100} y={84} s={3.4} cls="ca-crumb" delay="0s" />
    <Crumb x={92} y={94} s={2.6} cls="ca-crumb" delay="-0.7s" />
    <Crumb x={106} y={98} s={2.4} cls="ca-crumb" delay="-1.3s" />
  </>
);

// ---------------------------------------------------------------- Parmesan
const PARM_FRONT = 'M22 94 L56 14 L90 94 Z';
const PARM_SIDE = 'M56 14 L104 84 L90 94 Z';
const PARM_RIND = 'M22 94 Q56 101 90 94 L104 84 L104 96 L90 106 Q56 113 22 106 Z';

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: string }) {
  return (
    <g className="ca-twinkle" style={{ animationDelay: delay }}>
      <path
        d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`}
        fill="#fffbe8"
        stroke={RIND}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </g>
  );
}

const parmesan: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={PARM_FRONT} />
      <path d={PARM_SIDE} />
      <path d={PARM_RIND} />
    </g>
    <path d={PARM_SIDE} fill="#c99c4e" {...LINE} />
    <path d={PARM_FRONT} fill="#ecc97f" {...LINE} />
    <path d="M56 14 L64 33 L46 60 Z" fill="#f4dc9e" opacity="0.8" />
    {/* grain */}
    {[
      [50, 44], [60, 52], [44, 66], [58, 70], [70, 80], [36, 84], [52, 86], [66, 62], [48, 76], [76, 88],
      [74, 60], [82, 74], [90, 70],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill="#c69a4a" />
    ))}
    <path d={PARM_RIND} fill="#b07a2a" {...LINE} />
    <path d="M90 94 L104 84 L104 96 L90 106 Z" fill="#8e6020" stroke={RIND} strokeWidth={3} strokeLinejoin="round" />
    {/* pin-dot rind lettering (abstract) */}
    {[28, 34, 40, 46, 52, 58, 64, 70, 76, 82].map((x) => {
      const t = (x - 22) / 68;
      const y = 100 + 6 * t * (1 - t) * 4 * 0.6;
      return (
        <g key={x}>
          <circle cx={x} cy={y - 1.5} r={1.2} fill="#5e3c12" />
          <circle cx={x + 3} cy={y + 2.5} r={1.2} fill="#5e3c12" />
        </g>
      );
    })}
    <Sparkle x={48} y={56} s={6} delay="0s" />
    <Sparkle x={66} y={74} s={6.5} delay="-0.9s" />
    <Sparkle x={40} y={82} s={4.8} delay="-1.7s" />
    <Sparkle x={58} y={36} s={4.4} delay="-2.4s" />
  </>
);

// ---------------------------------------------------------------- Blue
const BLUE_TOP = 'M12 48 L52 28 L108 66 Z';
const BLUE_FRONT = 'M12 48 L108 66 L108 96 L12 80 Z';

const blue: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={BLUE_TOP} />
      <path d={BLUE_FRONT} />
    </g>
    <path d={BLUE_FRONT} fill="#ece8d4" />
    <path d="M12 74 L108 90 L108 96 L12 80 Z" fill="#d8d2b8" />
    <g className="ca-vein" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 62 L30 58 L36 66 L48 60 L56 70" stroke="#4d7ea8" strokeWidth={3} />
      <path d="M62 80 L70 72 L80 78 L90 72 L100 82" stroke="#3f8a86" strokeWidth={3} />
      <path d="M36 66 L40 74 L50 76" stroke="#4d7ea8" strokeWidth={2.2} />
      <path d="M76 66 L82 70" stroke="#4d7ea8" strokeWidth={2.2} />
    </g>
    <g className="ca-vein ca-vein-b">
      <circle cx="28" cy="70" r="3" fill="#4d7ea8" />
      <circle cx="66" cy="66" r="3.6" fill="#3f8a86" />
      <circle cx="92" cy="86" r="2.6" fill="#4d7ea8" />
      <circle cx="46" cy="70" r="1.8" fill="#3f8a86" />
    </g>
    <path d={BLUE_FRONT} fill="none" {...LINE} />
    <path d={BLUE_TOP} fill="#f7f4e6" {...LINE} />
    <g className="ca-vein" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 46 L40 42 L46 48 L58 44" stroke="#4d7ea8" strokeWidth={2.6} />
      <path d="M62 54 L72 50 L80 58" stroke="#3f8a86" strokeWidth={2.6} />
    </g>
    <g className="ca-vein ca-vein-b">
      <circle cx="50" cy="38" r="2.6" fill="#3f8a86" />
      <circle cx="88" cy="60" r="2" fill="#4d7ea8" />
    </g>
  </>
);

// ---------------------------------------------------------------- Wheel
function segPath(k: number, r: number) {
  const a0 = ((k * 45 - 90 - 22.5) * Math.PI) / 180;
  const a1 = a0 + Math.PI / 4;
  const f = (n: number) => n.toFixed(2);
  return `M60 62 L${f(60 + r * Math.cos(a0))} ${f(62 + r * Math.sin(a0))} A${r} ${r} 0 0 1 ${f(60 + r * Math.cos(a1))} ${f(62 + r * Math.sin(a1))} Z`;
}
const WHEEL_SEGS = Array.from({ length: 8 }, (_, k) => segPath(k, 37));

const wheel: Drawing = () => (
  <>
    <g {...HALO}>
      <circle cx="60" cy="62" r="46" />
      <path d="M50 4 H70 L60 22 Z" />
    </g>
    <g className="ca-spin">
      <circle cx="60" cy="62" r="46" fill="#d99a1c" {...LINE} />
      <circle cx="60" cy="62" r="42" fill="none" stroke="#e8b040" strokeWidth={2} />
      {WHEEL_SEGS.map((d, k) => (
        <path key={k} d={d} fill={k % 2 ? '#f6c445' : '#ffe08a'} stroke={RIND} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {[0, 2, 4, 6].map((k) => {
        const a = ((k * 45 - 90) * Math.PI) / 180;
        return <circle key={k} cx={60 + 24 * Math.cos(a)} cy={62 + 24 * Math.sin(a)} r={3.6} fill="#d99a1c" stroke={RIND} strokeWidth={1.8} />;
      })}
      {[1, 3, 5, 7].map((k) => {
        const a = ((k * 45 - 90) * Math.PI) / 180;
        return <circle key={k} cx={60 + 28 * Math.cos(a)} cy={62 + 28 * Math.sin(a)} r={2.2} fill="#d99a1c" stroke={RIND} strokeWidth={1.5} />;
      })}
      <circle cx="60" cy="62" r="37" fill="none" {...LINE} />
      <circle cx="60" cy="62" r="7" fill="#c1272d" stroke={RIND} strokeWidth={3} />
    </g>
    {/* fixed pointer */}
    <path d="M50 4 H70 L60 22 Z" fill="#c1272d" {...LINE} />
    <path d="M55 8 H62" stroke="#ec6a6e" strokeWidth={2} strokeLinecap="round" />
  </>
);

// ---------------------------------------------------------------- Platter
function Cube({ x, y, s, top, front, side }: { x: number; y: number; s: number; top: string; front: string; side: string }) {
  const d = s * 0.36;
  return (
    <>
      <path d={`M${x} ${y} h${s} v${s} h${-s} Z`} fill={front} {...LINE} strokeWidth={3} />
      <path d={`M${x} ${y} l${d} ${-d} h${s} l${-d} ${d} Z`} fill={top} {...LINE} strokeWidth={3} />
      <path d={`M${x + s} ${y} l${d} ${-d} v${s} l${-d} ${d} Z`} fill={side} {...LINE} strokeWidth={3} />
    </>
  );
}

const BOARD = 'M8 72 Q8 64 16 64 H92 L100 70 H110 Q116 70 116 77 Q116 84 110 84 H100 L94 98 H16 Q8 98 8 90 Z';

const platter: Drawing = () => (
  <>
    <g {...HALO}>
      <path d={BOARD} />
      <path d="M8 90 V98 Q8 106 16 106 H94 L100 98 V84" />
      <path d="M12 76 L30 58 L46 66 L46 80 L12 90 Z" />
      <circle cx="88" cy="60" r="14" />
    </g>
    {/* board edge then top */}
    <path d="M8 88 V96 Q8 106 16 106 H92 Q98 106 100 98 V84" fill="#8f5a2a" {...LINE} />
    <path d={BOARD} fill="#c98b4a" {...LINE} />
    <path d="M18 74 Q50 70 86 76 M22 88 Q56 84 90 90" fill="none" stroke="#ad7136" strokeWidth={2} strokeLinecap="round" />
    <circle cx="110" cy="77" r="2.8" fill={RIND} />
    {/* mini wedge */}
    <g className="ca-bob">
      <path d="M12 76 L46 68 L46 82 L12 90 Z" fill="#f2c94c" {...LINE} strokeWidth={3} />
      <path d="M12 76 L30 60 L46 68 Z" fill="#ffe08a" {...LINE} strokeWidth={3} />
      <circle cx="26" cy="80" r="2.4" fill="#c99a2a" stroke={RIND} strokeWidth={1.4} />
      <circle cx="38" cy="76" r="1.8" fill="#c99a2a" stroke={RIND} strokeWidth={1.4} />
    </g>
    {/* cubes */}
    <g className="ca-bob" style={{ animationDelay: '-0.6s' }}>
      <Cube x={50} y={70} s={13} top="#f5a24a" front="#e5822a" side="#bf6418" />
    </g>
    <g className="ca-bob" style={{ animationDelay: '-1.2s' }}>
      <Cube x={58} y={84} s={10} top="#fffbe8" front="#f1ead2" side="#d4cbab" />
    </g>
    {/* grapes */}
    <g className="ca-bob" style={{ animationDelay: '-1.8s' }}>
      <path d="M88 48 Q90 42 96 41" fill="none" stroke="#5a3a1a" strokeWidth={3} strokeLinecap="round" />
      {[
        [82, 54], [94, 54], [88, 61], [78, 64], [98, 64], [83, 72], [93, 72], [88, 80],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={6} fill="#7b3f8c" stroke={RIND} strokeWidth={2.6} />
          <circle cx={x - 2} cy={y - 2} r={1.6} fill="#c79ad6" />
        </g>
      ))}
    </g>
  </>
);

const DRAWINGS: Record<CheeseId, Drawing> = {
  gouda,
  swiss,
  limburger,
  brie,
  mozzarella,
  feta,
  parmesan,
  blue,
  wheel,
  platter,
};

function useSafeId() {
  return 'ca' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

function Svg({
  size,
  className,
  title,
  extraClass,
  children,
}: {
  size: number | string;
  className?: string;
  title?: string;
  extraClass: string;
  children: ReactNode;
}) {
  const cls = ['ca-root', extraClass, className].filter(Boolean).join(' ');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cls}
      {...(title ? { role: 'img' } : { 'aria-hidden': true, focusable: 'false' })}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function CheeseArt({
  id,
  size = '1em',
  animated = false,
  className,
  title,
}: {
  id: CheeseId;
  size?: number | string;
  animated?: boolean;
  className?: string;
  title?: string;
}): ReactElement {
  const uid = useSafeId();
  const draw = DRAWINGS[id];
  return (
    <Svg size={size} className={className} title={title} extraClass={`ca-${id}${animated ? ' ca-anim' : ''}`}>
      {draw(uid, animated)}
    </Svg>
  );
}

/** Generic golden wedge used for the title / logo. */
export function CheeseWedge({ size = '1em', className }: { size?: number | string; className?: string }): ReactElement {
  const top = 'M10 70 L64 34 L110 52 Z';
  const front = 'M10 70 L110 52 L110 86 L10 104 Z';
  return (
    <Svg size={size} className={className} extraClass="ca-wedge">
      <g {...HALO}>
        <path d={top} />
        <path d={front} />
      </g>
      <path d={front} fill="#f6c445" />
      <path d="M10 96 L110 78 L110 86 L10 104 Z" fill="#d99a1c" />
      <path d={front} fill="none" {...LINE} />
      <path d={top} fill="#ffe08a" {...LINE} />
      <path d="M30 60 Q46 48 62 40" fill="none" stroke="#fff6dc" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="40" cy="84" r="7" fill="#d99a1c" stroke={RIND} strokeWidth={2.6} />
      <circle cx="74" cy="74" r="9" fill="#d99a1c" stroke={RIND} strokeWidth={2.6} />
      <circle cx="98" cy="70" r="4" fill="#d99a1c" stroke={RIND} strokeWidth={2.2} />
      <ellipse cx="70" cy="48" rx="7" ry="3" fill="#e8b040" stroke={RIND} strokeWidth={2.2} />
    </Svg>
  );
}
