import { useEffect, useReducer, useState } from 'react';
import { createGame } from './game/reducer';
import { canUndo, createSession, sessionReducer, type GameSession, type SessionAction } from './game/history';
import { browserStore, clearSave, loadSave, writeSave } from './game/persistence';
import { SAMPLE_BOARD } from './game/sampleBoard';
import type { Board, GameSettings, PlayerInput } from './game/types';
import { createBlankBoard, duplicateBoard, summarizeWarnings, validateBoard } from './boards/boardOps';
import { exportBoard, exportFileName, importBoard } from './boards/boardJson';
import { loadLibrary, newBoardId, saveLibrary, upsertBoard } from './boards/library';
import { downloadText } from './download';
import { LibraryScreen } from './components/LibraryScreen';
import { CheeseGuide } from './components/CheeseGuide';
import { BoardEditor } from './components/BoardEditor';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { useHostKeys } from './useHostKeys';

type Screen =
  | { kind: 'library' }
  | { kind: 'editor'; board: Board; isNew: boolean }
  | { kind: 'setup'; board: Board }
  | { kind: 'guide' }
  | { kind: 'game' };

/** Wraps sessionReducer so the whole session can also be replaced (new game / discard). */
type AppAction = SessionAction | { type: 'load'; session: GameSession | null };

function appReducer(session: GameSession | null, action: AppAction): GameSession | null {
  if (action.type === 'load') return action.session;
  return session ? sessionReducer(session, action) : session;
}

function inProgress(session: GameSession | null): boolean {
  return !!session && session.present.phase !== 'results';
}

export function App() {
  const [store] = useState(browserStore);
  const [screen, setScreen] = useState<Screen>({ kind: 'library' });
  const [session, dispatch] = useReducer(appReducer, store, (s) => (s ? (loadSave(s)?.session ?? null) : null));
  const [boards, setBoards] = useState(() => loadLibrary(store));
  const [storageError, setStorageError] = useState(false);

  // Auto-save the game after every change (and forget it once discarded).
  useEffect(() => {
    if (!store) return;
    if (session) writeSave(store, session);
    else clearSave(store);
  }, [store, session]);

  const updateBoards = (next: Board[]) => {
    setBoards(next);
    setStorageError(!saveLibrary(store, next));
  };

  useHostKeys(screen.kind === 'game' ? session : null, dispatch);

  /** Goes to game setup, after confirming if that would replace an unfinished game. */
  const playBoard = (board: Board, checkWarnings = true) => {
    const problems = summarizeWarnings(validateBoard(board));
    if (checkWarnings && problems.length && !window.confirm(`This board has problems:\n• ${problems.join('\n• ')}\n\nPlay anyway?`)) return;
    if (inProgress(session) && !window.confirm('Starting a new game will replace the game in progress. Continue?')) return;
    setScreen({ kind: 'setup', board });
  };

  const startGame = (board: Board, players: PlayerInput[], settings: GameSettings) => {
    dispatch({ type: 'load', session: createSession(createGame(board, players, settings)) });
    setScreen({ kind: 'game' });
  };

  switch (screen.kind) {
    case 'library':
      return (
        <LibraryScreen
          boards={boards}
          session={session}
          storageError={storageError}
          onResume={() => setScreen({ kind: 'game' })}
          onDiscardGame={() => {
            if (!inProgress(session) || window.confirm('Discard the game in progress? This cannot be undone.')) {
              dispatch({ type: 'load', session: null });
            }
          }}
          onPlay={(board) => playBoard(board)}
          onEdit={(board) => setScreen({ kind: 'editor', board, isNew: false })}
          onNew={() => setScreen({ kind: 'editor', board: createBlankBoard(newBoardId()), isNew: true })}
          onDuplicate={(board) => {
            const copy = duplicateBoard(board, newBoardId());
            const at = boards.findIndex((b) => b.id === board.id);
            updateBoards([...boards.slice(0, at + 1), copy, ...boards.slice(at + 1)]);
          }}
          onDelete={(board) => {
            if (window.confirm(`Delete "${board.title}"? Export it first if you might want it back.`)) {
              updateBoards(boards.filter((b) => b.id !== board.id));
            }
          }}
          onExport={(board) => downloadText(exportFileName(board), exportBoard(board))}
          onImport={(json) => {
            const result = importBoard(json, newBoardId());
            if (!result.ok) return result.error;
            updateBoards([...boards, result.board]);
            return null;
          }}
          onGuide={() => setScreen({ kind: 'guide' })}
          onRestoreSample={() => updateBoards([...boards, { ...structuredClone(SAMPLE_BOARD), id: newBoardId() }])}
        />
      );

    case 'guide':
      return <CheeseGuide onBack={() => setScreen({ kind: 'library' })} />;

    case 'editor':
      return (
        <BoardEditor
          // A new key resets the editor's draft when switching boards.
          key={screen.board.id}
          initial={screen.board}
          isNew={screen.isNew}
          onSave={(board) => updateBoards(upsertBoard(boards, board))}
          onClose={() => setScreen({ kind: 'library' })}
          onTestPlay={(board) => playBoard(board, false)}
        />
      );

    case 'setup':
      return (
        <SetupScreen
          board={screen.board}
          initialPlayers={session?.present.players}
          initialSettings={session?.present.settings}
          onStart={(players, settings) => startGame(screen.board, players, settings)}
          onBack={() => setScreen({ kind: 'library' })}
        />
      );

    case 'game':
      if (!session) return null;
      return (
        <GameScreen
          state={session.present}
          canUndo={canUndo(session)}
          dispatch={dispatch}
          onExit={() => setScreen({ kind: 'library' })}
          onRematch={() => {
            // Prefer the library's current version of the board, in case it was edited since.
            const played = session.present.board;
            playBoard(boards.find((b) => b.id === played.id) ?? played, false);
          }}
        />
      );
  }
}
