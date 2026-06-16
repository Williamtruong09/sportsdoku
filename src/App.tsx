import { useState, useCallback } from 'react';
import type { Sport, GameState, Player } from './types';
import { SPORT_CONFIGS } from './types';
import { playerSatisfiesCriterion, getValidPlayersForCell } from './data';
import { generatePuzzle, createInitialGameState, getTodayString } from './utils/puzzle';
import { Header } from './components/Header';
import { SportSelector } from './components/SportSelector';
import { Grid } from './components/Grid';
import { PlayerSearch } from './components/PlayerSearch';
import { GameOver } from './components/GameOver';
import { DonatePage } from './components/DonatePage';

const STORAGE_KEY = 'sportsdoku-state-v1';

function loadSavedState(sport: Sport, date: string): GameState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${sport}-${date}`);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Backfill score for saves created before scoring was added
    if (typeof state.score !== 'number') state.score = 0;
    return state;
  } catch {
    return null;
  }
}

function saveState(state: GameState) {
  if (state.puzzle.sport === 'challenge') return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY}-${state.puzzle.sport}-${state.puzzle.date}`,
      JSON.stringify(state)
    );
  } catch {
    // ignore storage errors
  }
}

function buildInitialState(sport: Sport): GameState {
  if (sport === 'challenge') {
    const puzzle = generatePuzzle('challenge', `challenge-${Date.now()}`);
    return createInitialGameState({ ...puzzle, date: getTodayString() });
  }
  const date = getTodayString();
  const saved = loadSavedState(sport, date);
  if (saved) return saved;
  const puzzle = generatePuzzle(sport, date);
  return createInitialGameState(puzzle);
}

const INITIAL_SPORT: Sport = 'nba';

export default function App() {
  const [sport, setSport] = useState<Sport>(INITIAL_SPORT);
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(INITIAL_SPORT));
  const [showHelp, setShowHelp] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  function updateState(next: GameState) {
    saveState(next);
    setGameState(next);
  }

  function handleSportChange(newSport: Sport) {
    setSport(newSport);
    setGameState(buildInitialState(newSport));
  }

  function handleCellClick(row: number, col: number) {
    if (gameState.status !== 'playing') return;
    if (gameState.cells[row][col].isCorrect) return;

    setGameState(prev => ({
      ...prev,
      selectedCell:
        prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col
          ? null
          : [row, col],
    }));
  }

  const handleGuess = useCallback(
    (player: Player) => {
      if (!gameState.selectedCell) return;
      const [row, col] = gameState.selectedCell;
      const rowCrit = gameState.puzzle.rows[row];
      const colCrit = gameState.puzzle.cols[col];

      const isCorrect =
        playerSatisfiesCriterion(player, rowCrit) &&
        playerSatisfiesCriterion(player, colCrit);

      const newCells = gameState.cells.map((r, ri) =>
        r.map((c, ci) => {
          if (ri === row && ci === col) {
            return { playerId: player.id, playerName: player.name, isCorrect };
          }
          return c;
        })
      );

      const newGuesses = gameState.guessesRemaining - 1;
      const newUsed = isCorrect
        ? [...gameState.usedPlayerIds, player.id]
        : gameState.usedPlayerIds;

      const allCorrect = newCells.flat().every(c => c.isCorrect);
      const newStatus =
        allCorrect ? 'won' : newGuesses <= 0 ? 'lost' : 'playing';

      const newScore = isCorrect
        ? gameState.score + Math.max(10, Math.round(1000 / Math.max(1, getValidPlayersForCell(gameState.puzzle.sport, rowCrit, colCrit).length)))
        : gameState.score;

      const next: GameState = {
        ...gameState,
        cells: newCells,
        guessesRemaining: newGuesses,
        usedPlayerIds: newUsed,
        selectedCell: isCorrect ? null : gameState.selectedCell,
        status: newStatus,
        score: newScore,
      };

      updateState(next);
    },
    [gameState]
  );

  function handleNewGame() {
    const date = getTodayString();
    const puzzle = generatePuzzle(sport, `${date}-${Date.now()}`);
    const fresh = createInitialGameState(puzzle);
    updateState(fresh);
  }

  function handleShuffle() {
    const puzzle = generatePuzzle('challenge', `challenge-${Date.now()}`);
    setGameState(createInitialGameState({ ...puzzle, date: getTodayString() }));
  }

  const { selectedCell, puzzle, status } = gameState;
  const sportCfg = SPORT_CONFIGS[sport];

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        guessesRemaining={gameState.guessesRemaining}
        date={gameState.puzzle.date}
        onHelp={() => setShowHelp(true)}
        onDonate={() => setShowDonate(true)}
      />

      <main className="flex-1 flex flex-col items-center gap-4 py-4 px-2">
        <SportSelector selected={sport} onChange={handleSportChange} />

        <div className="w-full max-w-lg">
          <div className="text-center mb-3">
            <div className={`text-xs font-semibold uppercase tracking-widest ${sportCfg.textClass}`}>
              {sportCfg.emoji} {sportCfg.name} {sport === 'challenge' ? 'Challenge' : 'Daily Puzzle'}
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-xs text-gray-500">
                Score: <span className="text-white font-bold">{gameState.score}</span>
              </span>
              {sport === 'challenge' && gameState.status === 'playing' && (
                <button
                  onClick={handleShuffle}
                  className="text-xs text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                >
                  🎲 New Puzzle
                </button>
              )}
            </div>
          </div>
          <Grid state={gameState} onCellClick={handleCellClick} />
        </div>

        <p className="text-xs text-gray-600 text-center max-w-xs">
          Click a cell, then guess a player who satisfies both the row and column criteria.
          You have {gameState.guessesRemaining} guess{gameState.guessesRemaining !== 1 ? 'es' : ''} remaining.
          Each player can only be used once.
        </p>
      </main>

      {/* Player search modal */}
      {selectedCell && status === 'playing' && (
        <PlayerSearch
          sport={puzzle.sport}
          rowCriterion={puzzle.rows[selectedCell[0]]}
          colCriterion={puzzle.cols[selectedCell[1]]}
          usedPlayerIds={gameState.usedPlayerIds}
          onGuess={handleGuess}
          onClose={() => setGameState(prev => ({ ...prev, selectedCell: null }))}
        />
      )}

      {/* Game over modal */}
      {status !== 'playing' && (
        <GameOver state={gameState} onNewGame={handleNewGame} />
      )}

      {/* Donate modal */}
      {showDonate && <DonatePage onClose={() => setShowDonate(false)} />}

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowHelp(false)}
        >
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black">How to Play</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
              <li>Choose a sport from the tabs above the grid.</li>
              <li>The 3×3 grid has <strong>row</strong> and <strong>column</strong> criteria (teams, awards, countries, positions).</li>
              <li>Click any cell and type a player's name who satisfies <em>both</em> that row's and column's criteria.</li>
              <li>You have <strong>9 total guesses</strong> — one per cell. Wrong guesses still cost a guess.</li>
              <li>Each player can only be used <strong>once</strong> across all cells.</li>
              <li>Fill all 9 cells correctly to win!</li>
            </ol>
            <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-7 gap-2 text-center text-xs text-gray-500">
              {(['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'mixed', 'challenge'] as Sport[]).map(s => (
                <div key={s}>
                  <div className="text-xl">{SPORT_CONFIGS[s].emoji}</div>
                  <div>{SPORT_CONFIGS[s].name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
