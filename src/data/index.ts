import type { Player, Criterion, Sport } from '../types';

// Criteria — tiny, always needed immediately
import { nbaCriteria } from './nba';
import { nflCriteria } from './nfl';
import { mlbCriteria } from './mlb';
import { nhlCriteria } from './nhl';
import { soccerCriteria } from './soccer';
import { mixedCriteria } from './mixed';

// All sport player data — lazy loaded on demand, split into separate chunks by Vite
const lazyLoaders: Partial<Record<Sport, () => Promise<Player[]>>> = {
  nba: () => import('./generated/nba').then(m => m.nbaPlayers),
  nfl: () => import('./generated/nfl').then(m => m.nflPlayers),
  mlb: () => import('./generated/mlb').then(m => m.mlbPlayers),
  nhl: () => import('./generated/nhl').then(m => m.nhlPlayers),
  soccer: () => import('./generated/soccer').then(m => m.soccerPlayers),
};

const playerCache = new Map<Sport, Player[]>();

/** Load a sport's player data into the cache. No-op if already loaded. */
export async function loadSport(sport: Sport): Promise<void> {
  if (sport === 'mixed' || sport === 'challenge') {
    await Promise.all(
      (['nfl', 'mlb', 'nhl', 'soccer'] as Sport[]).map(s => loadSport(s))
    );
    return;
  }
  if (playerCache.has(sport) || !lazyLoaders[sport]) return;
  const players = await lazyLoaders[sport]!();
  playerCache.set(sport, players);
}

export function isSportLoaded(sport: Sport): boolean {
  if (sport === 'mixed' || sport === 'challenge') {
    return (['nfl', 'mlb', 'nhl', 'soccer'] as Sport[]).every(s => playerCache.has(s));
  }
  return playerCache.has(sport);
}

export function getPlayersForSport(sport: Sport): Player[] {
  if (sport === 'mixed' || sport === 'challenge') {
    const all: Player[] = [];
    for (const players of playerCache.values()) all.push(...players);
    return all;
  }
  return playerCache.get(sport) ?? [];
}

export function getCriteriaForSport(sport: Sport): Criterion[] {
  const map: Record<Sport, Criterion[]> = {
    nba: nbaCriteria, nfl: nflCriteria, mlb: mlbCriteria,
    nhl: nhlCriteria, soccer: soccerCriteria,
    mixed: mixedCriteria, challenge: mixedCriteria,
  };
  return map[sport];
}

export function getPlayerById(id: string): Player | undefined {
  for (const players of playerCache.values()) {
    const found = players.find(p => p.id === id);
    if (found) return found;
  }
  return undefined;
}

export function playerSatisfiesCriterion(player: Player, criterion: Criterion): boolean {
  switch (criterion.type) {
    case 'team':
      return player.teams.includes(criterion.value);
    case 'award': {
      const a = player.awards;
      switch (criterion.value) {
        case 'meta:mvp':
          return a.includes('MVP') || a.includes('Hart Trophy');
        case 'meta:roty':
          return a.includes('Rookie of Year') || a.includes('Offensive ROY') || a.includes('Calder Trophy');
        case 'meta:dpoy':
          return a.includes('DPOY') || a.includes('Norris Trophy');
        case 'meta:finals-mvp':
          return a.includes('Finals MVP') || a.includes('Super Bowl MVP') || a.includes('Conn Smythe') || a.includes('World Series MVP');
        default:
          return a.includes(criterion.value);
      }
    }
    case 'country':
      return player.country === criterion.value;
    case 'position':
      return player.positions.includes(criterion.value);
    case 'sport':
      return player.sport === criterion.value;
    default:
      return false;
  }
}

export function getValidPlayersForCell(
  sport: Sport,
  rowCriterion: Criterion,
  colCriterion: Criterion
): Player[] {
  return getPlayersForSport(sport).filter(
    p => playerSatisfiesCriterion(p, rowCriterion) && playerSatisfiesCriterion(p, colCriterion)
  );
}

export function searchPlayers(sport: Sport, query: string): Player[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return getPlayersForSport(sport)
    .filter(p => p.name.toLowerCase().includes(lower))
    .slice(0, 10);
}
