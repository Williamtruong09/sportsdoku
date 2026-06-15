import type { Puzzle, Sport, Criterion, GameState, CellState } from '../types';
import { getCriteriaForSport, getPlayersForSport, playerSatisfiesCriterion } from '../data';
import { mulberry32, hashString, shuffleArray } from './seededRandom';

const MAX_ATTEMPTS = 200;
const GRID_SIZE = 3;

function generateMixedPuzzle(dateStr: string): Puzzle {
  const seed = hashString(`mixed-${dateStr}`);
  const rng = mulberry32(seed);

  const allCriteria = getCriteriaForSport('mixed');
  const sportCriteria = allCriteria.filter(c => c.type === 'sport');
  const countryCriteria = allCriteria.filter(c => c.type === 'country');

  const players = getPlayersForSport('mixed');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffledSports = shuffleArray(sportCriteria, rng);
    const shuffledCountries = shuffleArray(countryCriteria, rng);

    // rows = 3 sport criteria, cols = 3 country criteria (or swap)
    const useSwap = (rng() & 1) === 1;
    const rows = (useSwap ? shuffledCountries : shuffledSports).slice(0, GRID_SIZE) as [Criterion, Criterion, Criterion];
    const cols = (useSwap ? shuffledSports : shuffledCountries).slice(0, GRID_SIZE) as [Criterion, Criterion, Criterion];

    const valid = rows.every(row =>
      cols.every(col =>
        players.some(p => playerSatisfiesCriterion(p, row) && playerSatisfiesCriterion(p, col))
      )
    );

    if (valid) return { sport: 'mixed', date: dateStr, rows, cols };
  }

  // Fallback: NBA/NFL/MLB × USA/Canada/France
  const fallbackRows = sportCriteria.slice(0, 3) as [Criterion, Criterion, Criterion];
  const fallbackCols = countryCriteria.slice(0, 3) as [Criterion, Criterion, Criterion];
  return { sport: 'mixed', date: dateStr, rows: fallbackRows, cols: fallbackCols };
}


function isPuzzleValid(
  sport: Sport,
  rows: Criterion[],
  cols: Criterion[]
): boolean {
  const players = getPlayersForSport(sport);
  for (const row of rows) {
    for (const col of cols) {
      const valid = players.filter(
        p => playerSatisfiesCriterion(p, row) && playerSatisfiesCriterion(p, col)
      );
      if (valid.length === 0) return false;
    }
  }
  return true;
}

export function generatePuzzle(sport: Sport, dateStr: string): Puzzle {
  if (sport === 'mixed') return generateMixedPuzzle(dateStr);
  const seed = hashString(`${sport}-${dateStr}`);
  const rng = mulberry32(seed);

  const allCriteria = getCriteriaForSport(sport);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Shuffle all criteria each attempt
    const shuffled = shuffleArray(allCriteria, rng);

    // Try to pick 6 criteria: prefer mixing types
    // Rows: pick 3, Cols: pick 3 (no overlap)
    const picked: Criterion[] = [];
    const usedTypes = new Map<string, number>();

    for (const c of shuffled) {
      if (picked.length >= 6) break;
      const count = usedTypes.get(c.type) ?? 0;
      // Allow at most 2 of any one type in rows and 2 in cols (4 total)
      if (count < 4) {
        picked.push(c);
        usedTypes.set(c.type, count + 1);
      }
    }

    if (picked.length < 6) {
      // fallback: just use first 6
      picked.splice(0, picked.length, ...shuffled.slice(0, 6));
    }

    const rows = picked.slice(0, GRID_SIZE) as [Criterion, Criterion, Criterion];
    const cols = picked.slice(GRID_SIZE, GRID_SIZE * 2) as [Criterion, Criterion, Criterion];

    // Ensure no duplicate criterion in same row/col
    const rowIds = new Set(rows.map(r => r.id));
    const colIds = new Set(cols.map(c => c.id));
    if (rowIds.size < GRID_SIZE || colIds.size < GRID_SIZE) continue;
    if ([...rowIds].some(id => colIds.has(id))) continue;

    if (isPuzzleValid(sport, rows, cols)) {
      return { sport, date: dateStr, rows, cols };
    }
  }

  // Hardcoded fallback puzzle per sport if generation fails
  return getFallbackPuzzle(sport, dateStr);
}

function getFallbackPuzzle(sport: Sport, dateStr: string): Puzzle {
  const criteria = getCriteriaForSport(sport);
  const teams = criteria.filter(c => c.type === 'team');
  const awards = criteria.filter(c => c.type === 'award');

  const rows: [Criterion, Criterion, Criterion] = [
    teams[0] ?? criteria[0],
    teams[1] ?? criteria[1],
    awards[0] ?? criteria[2],
  ];
  const cols: [Criterion, Criterion, Criterion] = [
    awards[1] ?? criteria[3],
    teams[2] ?? criteria[4],
    awards[2] ?? criteria[5],
  ];

  return { sport, date: dateStr, rows, cols };
}

export function createInitialGameState(puzzle: Puzzle): GameState {
  const cells: CellState[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      playerId: null,
      playerName: null,
      isCorrect: false,
    }))
  );

  return {
    puzzle,
    cells,
    guessesRemaining: 9,
    selectedCell: null,
    usedPlayerIds: [],
    status: 'playing',
  };
}

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getShareText(state: GameState): string {
  const { puzzle, cells, status } = state;
  const sportName = puzzle.sport.toUpperCase();
  const date = puzzle.date;

  const grid = cells
    .map(row => row.map(cell => (cell.isCorrect ? '✅' : '❌')).join(' '))
    .join('\n');

  const filled = cells.flat().filter(c => c.isCorrect).length;
  const result = status === 'won' ? `${filled}/9 ` : `${filled}/9 `;

  return `SportsDoku – ${sportName} – ${date}\n${grid}\n${result}cells correct\nsportsdoku.app`;
}
