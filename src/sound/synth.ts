// Original sound effects, synthesised with the Web Audio API (no audio files).
import type { SoundCue } from '../game/soundCues';

export type SoundName = SoundCue | 'timesUp';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Browsers only let audio start after the user interacts with the page, so wake the
 * audio context on the first click or key press.
 */
export function unlockAudioOnFirstGesture(): () => void {
  const unlock = () => {
    audio();
    remove();
  };
  const remove = () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return remove;
}

interface Tone {
  freq: number;
  /** Glide to this frequency by the end of the note. */
  to?: number;
  start?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

/** One enveloped note, `start` seconds from now. */
function tone(c: AudioContext, out: AudioNode, { freq, to, start = 0, dur, type = 'sine', gain = 0.25 }: Tone) {
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.015, dur / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A bell: a sine plus a quieter, faster-fading overtone. */
function bell(c: AudioContext, out: AudioNode, freq: number, start: number, dur = 0.6, gain = 0.22) {
  tone(c, out, { freq, start, dur, gain });
  tone(c, out, { freq: freq * 2.76, start, dur: dur / 3, gain: gain / 4 });
}

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);
const C5 = NOTE(3);
const E5 = NOTE(7);
const G5 = NOTE(10);
const C6 = NOTE(15);

const SOUNDS: Record<SoundName, (c: AudioContext, out: AudioNode) => void> = {
  select(c, out) {
    tone(c, out, { freq: 520, to: 780, dur: 0.12, type: 'triangle', gain: 0.2 });
    tone(c, out, { freq: 780, start: 0.09, dur: 0.14, type: 'triangle', gain: 0.18 });
  },
  cheese(c, out) {
    [C5, E5, G5, C6].forEach((f, i) => tone(c, out, { freq: f, start: i * 0.09, dur: 0.22, type: 'square', gain: 0.08 }));
    [C6 * 1.5, C6 * 2].forEach((f, i) => bell(c, out, f, 0.4 + i * 0.07, 0.5, 0.08));
  },
  buzz(c, out) {
    tone(c, out, { freq: 150, to: 130, dur: 0.38, type: 'sawtooth', gain: 0.2 });
    tone(c, out, { freq: 153, to: 133, dur: 0.38, type: 'square', gain: 0.08 });
  },
  correct(c, out) {
    bell(c, out, E5, 0, 0.35);
    bell(c, out, NOTE(14), 0.12, 0.7); // B5
  },
  wrong(c, out) {
    tone(c, out, { freq: 330, to: 300, dur: 0.25, type: 'square', gain: 0.09 });
    tone(c, out, { freq: 280, to: 190, start: 0.25, dur: 0.45, type: 'square', gain: 0.09 });
  },
  reveal(c, out) {
    bell(c, out, G5, 0, 0.5, 0.15);
    bell(c, out, C6, 0.08, 0.8, 0.15);
  },
  spin(c, out) {
    // Ticks that slow down over about four seconds, like the wheel's pegs.
    let t = 0;
    let gap = 0.05;
    while (t < 3.9) {
      tone(c, out, { freq: 1800, start: t, dur: 0.03, type: 'square', gain: 0.05 });
      t += gap;
      gap *= 1.07;
    }
  },
  platterFound(c, out) {
    bell(c, out, C6, 0, 0.3, 0.18);
    bell(c, out, NOTE(19), 0.1, 0.6, 0.18); // E6
  },
  strike(c, out) {
    tone(c, out, { freq: 110, dur: 0.18, type: 'sawtooth', gain: 0.18 });
    tone(c, out, { freq: 110, start: 0.22, dur: 0.3, type: 'sawtooth', gain: 0.18 });
  },
  results(c, out) {
    const tune: [number, number, number][] = [
      [C5, 0, 0.15],
      [C5, 0.16, 0.15],
      [C5, 0.32, 0.15],
      [E5, 0.48, 0.45],
      [C5, 0.95, 0.15],
      [E5, 1.11, 0.15],
      [G5, 1.27, 0.9],
    ];
    for (const [freq, start, dur] of tune) {
      tone(c, out, { freq, start, dur, type: 'square', gain: 0.07 });
      tone(c, out, { freq: freq / 2, start, dur, type: 'triangle', gain: 0.12 });
    }
    [C6, E5 * 2, G5 * 2, C6 * 2].forEach((f, i) => bell(c, out, f, 1.4 + i * 0.08, 0.9, 0.07));
  },
  timesUp(c, out) {
    [0, 0.2, 0.4].forEach((start, i) => tone(c, out, { freq: 880 - i * 110, start, dur: 0.16, type: 'square', gain: 0.08 }));
  },
};

export function playSound(name: SoundName): void {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(c.destination);
  try {
    SOUNDS[name](c, out);
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}
