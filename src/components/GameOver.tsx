import { useState } from 'react';
import type { GameState } from '../types';
import { SPORT_CONFIGS } from '../types';
import { getValidPlayersForCell } from '../data';
import { getShareText } from '../utils/puzzle';

interface Props {
  state: GameState;
  onNewGame: () => void;
}

export function GameOver({ state, onNewGame }: Props) {
  const { puzzle, status } = state;
  const sport = SPORT_CONFIGS[puzzle.sport];
  const won = status === 'won';
  const filled = state.cells.flat().filter(c => c.isCorrect).length;
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const text = getShareText(state);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{won ? '🎉' : '😔'}</div>
          <h2 className="text-2xl font-black">
            {won ? 'Excellent!' : 'Game Over'}
          </h2>
          <p className="text-gray-400 mt-1">
            {filled}/9 cells correct · {sport.emoji} {sport.name}
          </p>
        </div>

        {/* Answer key */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-3">
            Answer key
          </h3>
          <div className="space-y-2">
            {puzzle.rows.flatMap((row, rowIdx) =>
              puzzle.cols.map((col, colIdx) => {
                const cell = state.cells[rowIdx][colIdx];
                const valid = getValidPlayersForCell(puzzle.sport, row, col);
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className={cell.isCorrect ? 'text-green-400' : 'text-red-400'}>
                      {cell.isCorrect ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-400">
                      <span className="font-semibold text-gray-200">
                        {row.label} + {col.label}:
                      </span>{' '}
                      {cell.playerName
                        ? <span className="text-green-300">{cell.playerName} · </span>
                        : null}
                      <span className="text-gray-500">
                        (also: {valid.slice(0, 2).map(p => p.name).join(', ')})
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {copied ? '✅ Copied!' : '📋 Share Results'}
          </button>
          <button
            onClick={onNewGame}
            className={`flex-1 ${sport.bgClass} hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-opacity text-sm`}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
