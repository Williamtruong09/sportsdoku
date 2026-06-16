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

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[highlighted]) onGuess(results[highlighted]);
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
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Find a player who satisfies both:
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2 text-sm flex-wrap">
            <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded-full">
              {rowCriterion.emoji} {rowCriterion.label}
            </span>
            <span className="text-gray-500">+</span>
            <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded-full">
              {colCriterion.emoji} {colCriterion.label}
            </span>
          </div>
          {validCount > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">
              {validCount} valid player{validCount !== 1 ? 's' : ''} available
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
            placeholder="Type a player name…"
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul ref={listRef} className="max-h-64 overflow-y-auto pb-4 px-4 space-y-1">
            {results.map((player, i) => (
              <li key={player.id}>
                <button
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    i === highlighted
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                  onClick={() => onGuess(player)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="font-medium">{player.name}</span>
                  <span className="text-gray-500 ml-2 text-xs">
                    {(sport === 'mixed' || sport === 'challenge') ? `${player.sport.toUpperCase()} · ` : ''}{player.teams.slice(-2).join(', ')} · {player.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="px-4 pb-4 text-sm text-gray-500 text-center">
            No players found for "{query}"
          </div>
        )}

        {!query && (
          <div className="px-4 pb-4 text-xs text-gray-600 text-center">
            Start typing to search players
          </div>
        )}
      </div>
    </div>
  );
}
