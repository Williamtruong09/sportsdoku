import { useState, useCallback, useEffect } from 'react';
import type { Sport, GameState, Player, Puzzle } from './types';
import { SPORT_CONFIGS } from './types';
import { playerSatisfiesCriterion, getValidPlayersForCell } from './data';
import { generatePuzzle, createInitialGameState, getTodayString, puzzleCriteriaKey } from './utils/puzzle';
import { Header } from './components/Header';
import { SportSelector } from './components/SportSelector';
import { Grid } from './components/Grid';
import { PlayerSearch } from './components/PlayerSearch';
import { GameOver } from './components/GameOver';
import { DonatePage } from './components/DonatePage';
import { Analytics } from '@vercel/analytics/react';


function buildInitialState(sport: Sport): GameState {
  if (sport === 'challenge') {
    const puzzle = generatePuzzle('challenge', `challenge-${Date.now()}`);
    return createInitialGameState({ ...puzzle, date: getTodayString() });
  }
  const puzzle = generatePuzzle(sport, getTodayString());
  return createInitialGameState(puzzle);
}

const INITIAL_SPORT: Sport = 'nba';

export default function App() {
  const [sport, setSport] = useState<Sport>(INITIAL_SPORT);
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(INITIAL_SPORT));
  const [showHelp, setShowHelp] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [lostAnimPlaying, setLostAnimPlaying] = useState(false);
  const [lastGuessWasWrong, setLastGuessWasWrong] = useState(false);

  function updateState(next: GameState) {
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

      // Only wrong guesses cost a life (correct guesses are free)
      const newGuesses = isCorrect ? gameState.guessesRemaining : gameState.guessesRemaining - 1;
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

      setLastGuessWasWrong(!isCorrect);
      if (newStatus === 'lost') {
        setLostAnimPlaying(true);
      }
      updateState(next);
    },
    [gameState]
  );

  useEffect(() => {
    if (!lostAnimPlaying) return;
    const timer = setTimeout(() => setLostAnimPlaying(false), 850);
    return () => clearTimeout(timer);
  }, [lostAnimPlaying]);

  function handleNewGame() {
    const date = getTodayString();
    const puzzle = generatePuzzle(sport, `${date}-${Date.now()}`);
    const fresh = createInitialGameState(puzzle);
    updateState(fresh);
  }

  function handleShuffle() {
    const currentKey = puzzleCriteriaKey(gameState.puzzle);
    let puzzle: Puzzle;
    let counter = 0;
    do {
      puzzle = generatePuzzle('challenge', `challenge-${Date.now()}-${counter}`, currentKey);
      counter++;
    } while (puzzleCriteriaKey(puzzle) === currentKey && counter < 50);
    setGameState(createInitialGameState({ ...puzzle, date: getTodayString() }));
  }

  const { selectedCell, puzzle, status } = gameState;
  const sportCfg = SPORT_CONFIGS[sport];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000' }}>
      <Header
        guessesRemaining={gameState.guessesRemaining}
        date={gameState.puzzle.date}
        onHelp={() => setShowHelp(true)}
        onDonate={() => setShowDonate(true)}
        lastGuessWasWrong={lastGuessWasWrong}
      />

      <SportSelector selected={sport} onChange={handleSportChange} />

      <main className="flex-1 flex flex-col items-center gap-4 py-4 px-2">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between px-2 mb-2">
            <div
              className={`font-display font-bold uppercase tracking-widest ${sportCfg.textClass}`}
              style={{ fontSize: 11 }}
            >
              {sportCfg.emoji} {sportCfg.name} {sport === 'challenge' ? 'Challenge' : 'Daily'}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-pixel text-orange-400" style={{ fontSize: 8, textShadow: '0 0 8px #f97316' }}>
                {String(gameState.score).padStart(5, '0')}
              </span>
              {sport === 'challenge' && gameState.status === 'playing' && (
                <button
                  onClick={handleShuffle}
                  className="font-display font-bold uppercase tracking-widest text-pink-400 hover:text-pink-300 transition-colors"
                  style={{ fontSize: 11 }}
                >
                  🎲 Shuffle
                </button>
              )}
            </div>
          </div>
          <Grid state={gameState} onCellClick={handleCellClick} />
        </div>

        <p className="font-display uppercase tracking-wider text-center max-w-xs" style={{ fontSize: 10, color: '#374151' }}>
          Wrong guesses cost a life · each player used once
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

      {/* Loss flash overlay */}
      {lostAnimPlaying && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-loss-flash" />
      )}

      {/* Game over modal — delayed until loss animation finishes */}
      {status !== 'playing' && !lostAnimPlaying && (
        <GameOver state={gameState} onNewGame={handleNewGame} />
      )}

      {/* Donate modal */}
      {showDonate && <DonatePage onClose={() => setShowDonate(false)} />}

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm animate-fade-in p-6"
            style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4 }}
          >
            <div className="flex justify-between items-center mb-5">
              <h2
                className="font-display font-black uppercase tracking-widest text-white"
                style={{ fontSize: 20, letterSpacing: '0.12em' }}
              >
                How to Play
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-600 hover:text-white text-2xl leading-none">
                ×
              </button>
            </div>
            <ol className="space-y-3 text-gray-400 list-decimal list-inside" style={{ fontSize: 13 }}>
              <li>Pick a sport from the tab bar.</li>
              <li>The 3×3 grid has row and column criteria — teams, awards, nationalities, positions.</li>
              <li>Click a cell and type a player who satisfies <strong className="text-white">both</strong> the row and column.</li>
              <li>You have <strong className="text-white">3 lives</strong> — only wrong guesses cost one. Correct guesses are free.</li>
              <li>Each player can only be used <strong className="text-white">once</strong>.</li>
              <li>Fill all 9 cells correctly to win!</li>
            </ol>
            <div className="mt-5 pt-4 grid grid-cols-7 gap-1 text-center" style={{ borderTop: '1px solid #1f1f1f' }}>
              {(['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'mixed', 'challenge'] as Sport[]).map(s => (
                <div key={s} className="text-gray-600" style={{ fontSize: 10 }}>
                  <div style={{ fontSize: 18 }}>{SPORT_CONFIGS[s].emoji}</div>
                  <div className="font-display uppercase tracking-wider" style={{ fontSize: 8 }}>{SPORT_CONFIGS[s].name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
}
