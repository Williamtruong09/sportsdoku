export type Sport = 'nba' | 'nfl' | 'mlb' | 'nhl' | 'soccer' | 'mixed' | 'challenge';

export type CriterionType = 'team' | 'award' | 'country' | 'position' | 'sport';

export interface Player {
  id: string;
  name: string;
  sport: Sport;
  teams: string[];
  awards: string[];
  country: string;
  positions: string[];
}

export interface Criterion {
  id: string;
  type: CriterionType;
  value: string;
  label: string;
  emoji?: string;
}

export interface Puzzle {
  sport: Sport;
  date: string;
  rows: [Criterion, Criterion, Criterion];
  cols: [Criterion, Criterion, Criterion];
}

export interface CellState {
  playerId: string | null;
  playerName: string | null;
  isCorrect: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  puzzle: Puzzle;
  cells: CellState[][];
  guessesRemaining: number;
  selectedCell: [number, number] | null;
  usedPlayerIds: string[];
  status: GameStatus;
  score: number;
}

export interface SportConfig {
  id: Sport;
  name: string;
  emoji: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const SPORT_CONFIGS: Record<Sport, SportConfig> = {
  challenge: {
    id: 'challenge',
    name: 'Challenge',
    emoji: '🎲',
    color: '#ec4899',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500',
  },
  mixed: {
    id: 'mixed',
    name: 'Mixed',
    emoji: '🌐',
    color: '#a855f7',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500',
  },
  nba: {
    id: 'nba',
    name: 'NBA',
    emoji: '🏀',
    color: '#f97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500',
  },
  nfl: {
    id: 'nfl',
    name: 'NFL',
    emoji: '🏈',
    color: '#3b82f6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500',
  },
  mlb: {
    id: 'mlb',
    name: 'MLB',
    emoji: '⚾',
    color: '#ef4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-400',
    borderClass: 'border-red-500',
  },
  nhl: {
    id: 'nhl',
    name: 'NHL',
    emoji: '🏒',
    color: '#6366f1',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500',
  },
  soccer: {
    id: 'soccer',
    name: 'Soccer',
    emoji: '⚽',
    color: '#22c55e',
    bgClass: 'bg-green-500',
    textClass: 'text-green-400',
    borderClass: 'border-green-500',
  },
};
