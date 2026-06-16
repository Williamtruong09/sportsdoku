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
    <div className="w-full mx-auto px-2">
      <div className="game-grid">
        {/* Top-left corner */}
        <div
          className="flex items-center justify-center"
          style={{ background: '#000', fontSize: 22 }}
        >
          {sport.emoji}
        </div>

        {/* Column headers */}
        {puzzle.cols.map(col => (
          <div key={col.id} className="header-cell col-header">
            <div>
              {col.emoji && <div className="header-emoji">{col.emoji}</div>}
              <div>{col.label}</div>
            </div>
          </div>
        ))}

        {/* Rows */}
        {puzzle.rows.map((row, rowIdx) => (
          <div key={row.id} className="contents">
            <div className="header-cell row-header">
              <div>
                {row.emoji && <div className="header-emoji">{row.emoji}</div>}
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
