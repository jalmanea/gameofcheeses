import { useEffect, useReducer, useRef, useState } from 'react';
import { createGame } from './game/reducer';
import { canUndo, createSession, sessionReducer, type GameSession, type SessionAction } from './game/history';
import { browserStore, clearSave, loadSave, writeSave, type SaveFile } from './game/persistence';
import { SAMPLE_BOARD } from './game/sampleBoard';
import type { PlayerInput } from './game/types';
import { SetupScreen } from './components/SetupScreen';
import { ResumePrompt } from './components/ResumePrompt';
import { GameScreen } from './components/GameScreen';
import { useHostKeys } from './useHostKeys';

type Screen = { kind: 'resume'; save: SaveFile } | { kind: 'setup' } | { kind: 'game' };

/** Wraps sessionReducer so the whole session can also be replaced (new game / resume). */
type AppAction = SessionAction | { type: 'load'; session: GameSession | null };

function appReducer(session: GameSession | null, action: AppAction): GameSession | null {
  if (action.type === 'load') return action.session;
  return session ? sessionReducer(session, action) : session;
}

export function App() {
  const store = browserStore();
  const [screen, setScreen] = useState<Screen>(() => {
    const save = store ? loadSave(store) : null;
    return save ? { kind: 'resume', save } : { kind: 'setup' };
  });
  const [session, dispatch] = useReducer(appReducer, null);

  // Auto-save every change while a game is running.
  const lastSaved = useRef<GameSession | null>(null);
  useEffect(() => {
    if (store && session && screen.kind === 'game' && session !== lastSaved.current) {
      writeSave(store, session);
      lastSaved.current = session;
    }
  }, [store, session, screen.kind]);

  useHostKeys(screen.kind === 'game' ? session : null, dispatch);

  const startGame = (players: PlayerInput[]) => {
    dispatch({ type: 'load', session: createSession(createGame(SAMPLE_BOARD, players)) });
    setScreen({ kind: 'game' });
  };

  const newGame = () => {
    if (store) clearSave(store);
    lastSaved.current = null;
    dispatch({ type: 'load', session: null });
    setScreen({ kind: 'setup' });
  };

  switch (screen.kind) {
    case 'resume':
      return (
        <ResumePrompt
          save={screen.save}
          onResume={() => {
            dispatch({ type: 'load', session: screen.save.session });
            setScreen({ kind: 'game' });
          }}
          onNewGame={newGame}
        />
      );
    case 'setup':
      return <SetupScreen onStart={startGame} />;
    case 'game':
      if (!session) return null;
      return (
        <GameScreen
          state={session.present}
          canUndo={canUndo(session)}
          dispatch={dispatch}
          onNewGame={newGame}
        />
      );
  }
}
