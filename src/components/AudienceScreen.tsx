import { useEffect, useState } from 'react';
import { toKeyPress } from '../game/hostKeys';
import { toggleFullscreen } from '../fullscreen';
import { useAudienceLink, ViewContext } from '../presenter/presenter';
import { SoundOutputContext } from '../sound/useSounds';
import { GameStage } from './GameScreen';

const ignore = () => {};

function useIsFullscreen(): boolean {
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return full;
}

/**
 * The TV / projector window. It only shows what the host window broadcasts: no buttons,
 * no answers until they're revealed. Keys pressed here are passed to the host window, so
 * the host's shortcuts keep working if this window has the focus. F is fullscreen.
 */
export function AudienceScreen() {
  const { state, host, sendKey } = useAudienceLink();
  const fullscreen = useIsFullscreen();
  // The fullscreen tip covers part of the scores, so during a game it only shows for a while.
  const [tipTime, setTipTime] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setTipTime(false), 10_000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    document.title = 'Game of Cheeses · TV';
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        if (!e.repeat) toggleFullscreen();
        return;
      }
      // Leave browser shortcuts (reload, zoom, devtools…) alone; Ctrl+Z is the host's undo.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'z') return;
      if (e.key.startsWith('F') && e.key.length > 1) return; // F1–F12
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
      sendKey(toKeyPress(e));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sendKey]);

  return (
    <div className="game game-audience" onDoubleClick={toggleFullscreen}>
      {state ? (
        <ViewContext.Provider value="audience">
          <SoundOutputContext.Provider value>
            <GameStage state={state} dispatch={ignore} onExit={ignore} onRematch={ignore} />
          </SoundOutputContext.Provider>
        </ViewContext.Provider>
      ) : (
        <div className="audience-idle">
          <h1 className="audience-title">
            <span aria-hidden>🧀</span> Game of Cheeses
          </h1>
          <p className="hint">
            {host === 'connected'
              ? 'The game will appear here when the host starts or resumes it.'
              : host === 'gone'
                ? 'The host window was closed. Reopen it and resume the game.'
                : typeof BroadcastChannel === 'undefined'
                  ? "This browser can't link windows. Use one window instead."
                  : 'Waiting for the host window… Open Game of Cheeses in another window of this browser.'}
          </p>
        </div>
      )}
      {!fullscreen && (!state || tipTime) && (
        <p className="audience-tip">Move this window to the TV, then double-click or press F for fullscreen</p>
      )}
    </div>
  );
}
