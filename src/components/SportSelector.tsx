import type { Sport } from '../types';
import { SPORT_CONFIGS } from '../types';

interface Props {
  selected: Sport;
  onChange: (sport: Sport) => void;
}

const SPORT_ORDER: Sport[] = ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'mixed', 'challenge'];

export function SportSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {SPORT_ORDER.map(id => {
        const s = SPORT_CONFIGS[id];
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`sport-btn ${selected === s.id ? `active ${s.bgClass} border-transparent` : 'inactive'}`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span>{s.emoji} {s.name}</span>
              <span className="text-[8px] opacity-50 uppercase tracking-widest leading-none">
                {s.id === 'challenge' ? 'random' : 'daily'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
