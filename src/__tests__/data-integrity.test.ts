import { describe, it, expect, beforeAll } from 'vitest';
import { nhlPlayers } from '../data/generated/nhl';
import { nflPlayers } from '../data/generated/nfl';
import { nbaPlayers } from '../data/generated/nba';
import { mlbPlayers } from '../data/generated/mlb';
import { soccerPlayers } from '../data/generated/soccer';
import { generatePuzzle } from '../utils/puzzle';
import { playerSatisfiesCellCriteria, loadSport } from '../data';
import type { Player } from '../types';

// Minimum player counts — any sport dropping below these means the fetch broke
const MIN_COUNTS: Record<string, number> = {
  NHL: 4000,
  NFL: 8000,
  NBA: 2000,
  MLB: 5000,
  Soccer: 5000,
};

const SPORTS: Array<{ name: string; players: Player[] }> = [
  { name: 'NHL', players: nhlPlayers },
  { name: 'NFL', players: nflPlayers },
  { name: 'NBA', players: nbaPlayers },
  { name: 'MLB', players: mlbPlayers },
  { name: 'Soccer', players: soccerPlayers },
];

// ── Data integrity ────────────────────────────────────────────────────────────

describe('player counts', () => {
  for (const { name, players } of SPORTS) {
    it(`${name} has at least ${MIN_COUNTS[name]} players`, () => {
      expect(players.length).toBeGreaterThanOrEqual(MIN_COUNTS[name]);
    });
  }
});

describe('required fields', () => {
  for (const { name, players } of SPORTS) {
    it(`${name}: every player has a non-empty name`, () => {
      const bad = players.filter(p => !p.name?.trim());
      expect(bad, `${bad.length} players with missing name`).toHaveLength(0);
    });

    it(`${name}: every player has at least one team`, () => {
      const bad = players.filter(p => p.teams.length === 0);
      expect(bad.map(p => p.name), `${bad.length} players with no teams`).toHaveLength(0);
    });

    it(`${name}: awardTeams keys are a subset of awards`, () => {
      const bad = players.filter(p =>
        Object.keys(p.awardTeams ?? {}).some(k => !p.awards.includes(k))
      );
      expect(bad.map(p => p.name), 'awardTeams has keys not in awards').toHaveLength(0);
    });
  }
});

// ── Known player spot-checks ─────────────────────────────────────────────────

describe('known players', () => {
  it('Wayne Gretzky — Oilers, Stanley Cup', () => {
    const p = nhlPlayers.find(p => p.name === 'Wayne Gretzky');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Oilers');
    expect(p!.awards).toContain('Stanley Cup');
  });

  it('Sidney Crosby — Penguins, Hart Trophy', () => {
    const p = nhlPlayers.find(p => p.name === 'Sidney Crosby');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Penguins');
    expect(p!.awards).toContain('Hart Trophy');
  });

  it('Dan Marino — Dolphins, All-Pro', () => {
    const p = nflPlayers.find(p => p.name === 'Dan Marino');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Dolphins');
    expect(p!.awards).toContain('All-Pro');
  });

  it('Jerry Rice — 49ers, All-Pro', () => {
    const p = nflPlayers.find(p => p.name === 'Jerry Rice');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('49ers');
    expect(p!.awards).toContain('All-Pro');
  });

  it('LeBron James — Lakers, Finals MVP', () => {
    const p = nbaPlayers.find(p => p.name === 'LeBron James');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Lakers');
    expect(p!.awards).toContain('Finals MVP');
  });

  it('Lionel Messi — Barcelona, La Liga', () => {
    const p = soccerPlayers.find(p => p.name === 'Lionel Messi');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Barcelona');
    expect(p!.awards).toContain('La Liga');
  });

  it('Cristiano Ronaldo — Real Madrid, La Liga', () => {
    const p = soccerPlayers.find(p => p.name === 'Cristiano Ronaldo');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Real Madrid');
    expect(p!.awards).toContain('La Liga');
  });

  it('Zlatan Ibrahimovic — Ajax, PSG', () => {
    const p = soccerPlayers.find(p => p.id === 'zlatan-ibrahimovic');
    expect(p).toBeDefined();
    expect(p!.teams).toContain('Ajax');
    expect(p!.teams).toContain('PSG');
  });
});

// ── Puzzle generation ─────────────────────────────────────────────────────────

describe('puzzle generation', () => {
  // Pre-load player data into the cache so generatePuzzle's isPuzzleValid works
  beforeAll(async () => {
    await Promise.all((['nhl', 'nfl', 'nba', 'mlb', 'soccer'] as const).map(loadSport));
  }, 30_000);

  const TEST_DATES = ['2024-01-15', '2024-04-01', '2024-06-01', '2024-09-20', '2024-12-31'];

  const playerMap = { nhl: nhlPlayers, nfl: nflPlayers, nba: nbaPlayers, mlb: mlbPlayers, soccer: soccerPlayers };

  for (const sport of ['nhl', 'nfl', 'nba', 'mlb', 'soccer'] as const) {
    it(`${sport} puzzle: at least one of ${TEST_DATES.length} dates generates all valid cells`, () => {
      const players = playerMap[sport];
      for (const date of TEST_DATES) {
        const puzzle = generatePuzzle(sport, date);
        expect(puzzle.rows).toHaveLength(3);
        expect(puzzle.cols).toHaveLength(3);

        const allValid = puzzle.rows.every(row =>
          puzzle.cols.every(col =>
            players.some(p => playerSatisfiesCellCriteria(p, row, col))
          )
        );
        if (allValid) return;
      }
      // Report which cells failed for the last date tried
      const puzzle = generatePuzzle(sport, TEST_DATES.at(-1)!);
      for (const row of puzzle.rows) {
        for (const col of puzzle.cols) {
          const count = players.filter(p => playerSatisfiesCellCriteria(p, row, col)).length;
          if (count === 0) {
            expect(count, `No valid players for ${row.label} × ${col.label}`).toBeGreaterThan(0);
          }
        }
      }
    });
  }
});
