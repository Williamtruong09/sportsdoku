import { useState, useRef, useEffect } from 'react';
import type { Sport, Criterion, Player } from '../types';
import { searchPlayers, getValidPlayersForCell } from '../data';

interface Props {
  sport: Sport;
  rowCriterion: Criterion;
  colCriterion: Criterion;
  usedPlayerIds: string[];
  onGuess: (player: Player) => void;
  onClose: () => void;
}

export function PlayerSearch({
  sport,
  rowCriterion,
  colCriterion,
  usedPlayerIds,
  onGuess,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const found = searchPlayers(sport, query).filter(p => !usedPlayerIds.includes(p.id));
    setResults(found);
    setHighlighted(0);
  }, [query, sport, usedPlayerIds]);

  function submitGuess(player: Player) {
    onGuess(player);
    setQuery('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[highlighted]) submitGuess(results[highlighted]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  // Show hint about valid players count (without revealing who)
  const validCount = getValidPlayersForCell(sport, rowCriterion, colCriterion).filter(
    p => !usedPlayerIds.includes(p.id)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md animate-fade-in overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4 }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <div className="flex items-center justify-between mb-2">
            <div
              className="font-display font-bold uppercase tracking-widest text-gray-400"
              style={{ fontSize: 11 }}
            >
              Find a player matching both
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">
              ×
            </button>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span
              className="font-display font-bold uppercase text-white"
              style={{ fontSize: 13, background: '#1a1a1a', padding: '2px 8px', borderRadius: 2 }}
            >
              {rowCriterion.emoji} {rowCriterion.label}
            </span>
            <span className="text-gray-600 font-bold">×</span>
            <span
              className="font-display font-bold uppercase text-white"
              style={{ fontSize: 13, background: '#1a1a1a', padding: '2px 8px', borderRadius: 2 }}
            >
              {colCriterion.emoji} {colCriterion.label}
            </span>
          </div>
          {validCount > 0 && (
            <p className="text-gray-600 mt-1.5 uppercase tracking-wider" style={{ fontSize: 10 }}>
              {validCount} valid player{validCount !== 1 ? 's' : ''} in database
            </p>
          )}
        </div>

        {/* Search input */}
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="TYPE A PLAYER NAME"
            className="w-full text-white placeholder-gray-700 outline-none font-display font-bold uppercase tracking-wide"
            style={{
              background: '#161616',
              border: '1px solid #2a2a2a',
              borderRadius: 2,
              padding: '10px 14px',
              fontSize: 14,
              letterSpacing: '0.06em',
            }}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul ref={listRef} className="max-h-64 overflow-y-auto pb-3 px-4 space-y-0.5">
            {results.map((player, i) => (
              <li key={player.id}>
                <button
                  className="w-full text-left transition-colors font-display font-bold uppercase"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 2,
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    background: i === highlighted ? '#1f1f1f' : 'transparent',
                    color: i === highlighted ? '#fff' : '#9ca3af',
                  }}
                  onClick={() => submitGuess(player)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  {player.name}
                  <span className="ml-2 font-normal normal-case" style={{ fontSize: 10, color: '#4b5563' }}>
                    {(sport === 'mixed' || sport === 'challenge') ? `${player.sport.toUpperCase()} · ` : ''}{player.teams.slice(-2).join(', ')} · {player.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="px-4 pb-4 text-center font-display uppercase tracking-wider text-gray-600" style={{ fontSize: 12 }}>
            No players found
          </div>
        )}

        {!query && (
          <div className="px-4 pb-4 text-center font-display uppercase tracking-widest text-gray-700" style={{ fontSize: 10 }}>
            Start typing to search
          </div>
        )}
      </div>
    </div>
  );
}
