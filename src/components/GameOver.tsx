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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md animate-fade-in p-6"
        style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4 }}
      >
        {/* Result */}
        <div className="text-center mb-6">
          <div
            className="font-pixel mb-3"
            style={{
              fontSize: won ? 18 : 14,
              color: won ? '#00ff44' : '#ff2222',
              textShadow: won
                ? '0 0 10px #00ff44, 0 0 30px #00ff44, 0 0 60px #00cc33'
                : '0 0 10px #ff2222, 0 0 30px #ff2222, 0 0 60px #cc0000',
              lineHeight: 1.6,
            }}
          >
            {won ? 'WINNER!' : 'GAME OVER'}
          </div>
          <div className="font-display uppercase tracking-widest text-gray-500" style={{ fontSize: 12 }}>
            {sport.emoji} {sport.name} · {filled}/9 correct
          </div>
          <div
            className="font-pixel text-orange-400 mt-3"
            style={{ fontSize: 10, textShadow: '0 0 8px #f97316, 0 0 20px #f97316' }}
          >
            {String(state.score).padStart(5, '0')} PTS
          </div>
        </div>

        {/* Answer key */}
        <div className="mb-6">
          <div
            className="font-display font-bold uppercase tracking-widest text-gray-600 mb-3"
            style={{ fontSize: 10, borderBottom: '1px solid #1f1f1f', paddingBottom: 8 }}
          >
            Answer Key
          </div>
          <div className="space-y-2">
            {puzzle.rows.flatMap((row, rowIdx) =>
              puzzle.cols.map((col, colIdx) => {
                const cell = state.cells[rowIdx][colIdx];
                const valid = getValidPlayersForCell(puzzle.sport, row, col);
                return (
                  <div key={`${rowIdx}-${colIdx}`} className="flex items-start gap-2">
                    <span style={{ fontSize: 11, color: cell.isCorrect ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                      {cell.isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="font-display uppercase" style={{ fontSize: 11, color: '#6b7280' }}>
                      <span style={{ color: '#d1d5db' }}>{row.label} × {col.label}: </span>
                      {cell.playerName && (
                        <span style={{ color: '#4ade80' }}>{cell.playerName} · </span>
                      )}
                      {valid.slice(0, 2).map(p => p.name).join(', ')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 font-display font-bold uppercase tracking-widest transition-colors"
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 2,
              padding: '12px',
              fontSize: 13,
              color: copied ? '#4ade80' : '#fff',
              letterSpacing: '0.08em',
            }}
          >
            {copied ? '✓ COPIED' : '📋 SHARE'}
          </button>
          <button
            onClick={onNewGame}
            className="flex-1 font-display font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
            style={{
              background: sport.color ?? '#f97316',
              borderRadius: 2,
              padding: '12px',
              fontSize: 13,
              color: '#fff',
              letterSpacing: '0.08em',
              border: 'none',
            }}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
