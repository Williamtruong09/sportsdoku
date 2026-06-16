import type { Sport } from '../types';
import { SPORT_CONFIGS } from '../types';

interface Props {
  selected: Sport;
  onChange: (sport: Sport) => void;
}

const SPORT_ORDER: Sport[] = ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'mixed', 'challenge'];

export function SportSelector({ selected, onChange }: Props) {
  return (
    <div className="w-full scrollbar-none overflow-x-auto" style={{ borderBottom: '1px solid #1f1f1f' }}>
      <div className="flex min-w-max mx-auto" style={{ maxWidth: 512 }}>
        {SPORT_ORDER.map(id => {
          const s = SPORT_CONFIGS[id];
          const isActive = selected === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`sport-btn flex-1 flex flex-col items-center gap-0.5 ${isActive ? 'active' : 'inactive'}`}
            >
              <span className="text-base sm:text-xl">{s.emoji}</span>
              <span className="text-[9px] sm:text-[11px]">{s.name.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
