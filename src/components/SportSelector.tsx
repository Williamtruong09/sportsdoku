import type { Sport } from '../types';
import { SPORT_CONFIGS } from '../types';

interface Props {
  selected: Sport;
  onChange: (sport: Sport) => void;
}

export function SportSelector({ selected, onChange }: Props) {
  const sports = Object.values(SPORT_CONFIGS);

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {sports.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`sport-btn ${selected === s.id ? `active ${s.bgClass} border-transparent` : 'inactive'}`}
        >
          {s.emoji} {s.name}
        </button>
      ))}
    </div>
  );
}
