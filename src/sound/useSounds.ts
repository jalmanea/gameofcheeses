import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { soundCues } from '../game/soundCues';
import type { GameState } from '../game/types';
import { playSound, unlockAudioOnFirstGesture, type SoundName } from './synth';

const SOUND_KEY = 'game-of-cheeses:sound';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Sound on/off, remembered in this browser. Windows of the same browser share it, so
 * muting in the host's window also mutes the TV window.
 */
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const [enabled, setEnabled] = useState(readEnabled);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SOUND_KEY || e.key === null) setEnabled(readEnabled());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const set = (on: boolean) => {
    setEnabled(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      // Not remembered; it still applies to this window.
    }
  };
  return [enabled, set];
}

/**
 * Whether this window plays the game's sounds. Only one window should: the TV window
 * when there is one (it has the speakers), otherwise the host's window.
 */
export const SoundOutputContext = createContext(false);

/** Plays a one-off sound if this window is the sound output and sound is on. */
export function useSoundPlayer(): (name: SoundName) => void {
  const output = useContext(SoundOutputContext);
  const [enabled] = useSoundSetting();
  const live = useRef(false);
  live.current = output && enabled;
  return useRef((name: SoundName) => {
    if (live.current) playSound(name);
  }).current;
}

/** Plays the sound cues for each change of game state (not for the state it starts with). */
export function useGameSounds(state: GameState | null): void {
  const play = useSoundPlayer();
  const prev = useRef(state);
  useEffect(() => unlockAudioOnFirstGesture(), []);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!before || !state) return;
    for (const cue of soundCues(before, state)) play(cue);
  }, [state, play]);
}
