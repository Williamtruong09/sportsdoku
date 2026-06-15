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
    isGameOver && !cell.isCorrect ? 'opacity-50 cursor-default' : '',
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
        <div className="animate-pop-in px-1 text-center">
          <div className="text-lg mb-0.5">✅</div>
          <div className="text-xs font-bold leading-tight">{cell.playerName}</div>
        </div>
      ) : (
        <span className="text-2xl text-gray-600 group-hover:text-gray-400">+</span>
      )}
    </button>
  );
}
