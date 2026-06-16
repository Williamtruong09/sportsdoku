import { useState, useEffect } from 'react';
import type { CellState } from '../types';

interface Props {
  cell: CellState;
  isSelected: boolean;
  isGameOver: boolean;
  onClick: () => void;
}

export function Cell({ cell, isSelected, isGameOver, onClick }: Props) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!cell.isCorrect && cell.playerId !== null) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [cell]);

  const className = [
    'cell-btn',
    cell.isCorrect ? 'correct' : '',
    isSelected && !cell.isCorrect ? 'selected' : '',
    shake ? 'shake' : '',
    isGameOver && !cell.isCorrect ? 'opacity-40 cursor-default' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={!cell.isCorrect && !isGameOver ? onClick : undefined}
      disabled={cell.isCorrect || isGameOver}
      aria-label={cell.playerName ?? 'Empty cell'}
    >
      {cell.isCorrect ? (
        <div className="animate-pop-in px-2 text-center">
          <div
            className="font-display font-bold leading-tight uppercase"
            style={{ fontSize: 'clamp(10px, 1.5vw, 14px)', letterSpacing: '0.04em' }}
          >
            {cell.playerName}
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 20, color: '#2a2a2a', fontWeight: 300 }}>+</span>
      )}
    </button>
  );
}
