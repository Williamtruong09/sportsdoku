import type { GameState } from '../types';
import { SPORT_CONFIGS } from '../types';
import { Cell } from './Cell';

interface Props {
  state: GameState;
  onCellClick: (row: number, col: number) => void;
}

export function Grid({ state, onCellClick }: Props) {
  const { puzzle, cells, selectedCell, status } = state;
  const isGameOver = status !== 'playing';
  const sport = SPORT_CONFIGS[puzzle.sport];

  return (
    <div className="w-full max-w-lg mx-auto px-2">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: '80px repeat(3, 1fr)' }}
      >
        {/* Top-left corner */}
        <div className={`flex items-center justify-center rounded-lg p-1 text-xl ${sport.textClass}`}>
          {sport.emoji}
        </div>

        {/* Column headers */}
        {puzzle.cols.map(col => (
          <div key={col.id} className="header-cell bg-gray-900 rounded-lg min-h-[56px]">
            <div>
              {col.emoji && <div className="text-base mb-0.5">{col.emoji}</div>}
              <div>{col.label}</div>
            </div>
          </div>
        ))}

        {/* Rows (row header + 3 cells per row) */}
        {puzzle.rows.map((row, rowIdx) => (
          <div key={row.id} className="contents">
            <div className="header-cell bg-gray-900 rounded-lg min-h-[80px]">
              <div>
                {row.emoji && <div className="text-base mb-0.5">{row.emoji}</div>}
                <div>{row.label}</div>
              </div>
            </div>

            {puzzle.cols.map((_col, colIdx) => (
              <Cell
                key={`${rowIdx}-${colIdx}`}
                cell={cells[rowIdx][colIdx]}
                isSelected={selectedCell?.[0] === rowIdx && selectedCell?.[1] === colIdx}
                isGameOver={isGameOver}
                onClick={() => onCellClick(rowIdx, colIdx)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
