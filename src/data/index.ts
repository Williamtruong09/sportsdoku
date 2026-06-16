import type { Player, Criterion, Sport } from '../types';
import { nbaPlayers, nbaCriteria } from './nba';
import { nflPlayers, nflCriteria } from './nfl';
import { mlbPlayers, mlbCriteria } from './mlb';
import { nhlPlayers, nhlCriteria } from './nhl';
import { soccerPlayers, soccerCriteria } from './soccer';
import { mixedCriteria } from './mixed';

export const allPlayers: Player[] = [
  ...nbaPlayers,
  ...nflPlayers,
  ...mlbPlayers,
  ...nhlPlayers,
  ...soccerPlayers,
];

const criteriaMap: Record<Sport, Criterion[]> = {
  nba: nbaCriteria,
  nfl: nflCriteria,
  mlb: mlbCriteria,
  nhl: nhlCriteria,
  soccer: soccerCriteria,
  mixed: mixedCriteria,
  challenge: mixedCriteria,
};

export function getPlayersForSport(sport: Sport): Player[] {
  if (sport === 'mixed' || sport === 'challenge') return allPlayers;
  return allPlayers.filter(p => p.sport === sport);
}

export function getCriteriaForSport(sport: Sport): Criterion[] {
  return criteriaMap[sport];
}

export function getPlayerById(id: string): Player | undefined {
  return allPlayers.find(p => p.id === id);
}

export function playerSatisfiesCriterion(player: Player, criterion: Criterion): boolean {
  switch (criterion.type) {
    case 'team':
      return player.teams.includes(criterion.value);
    case 'award':
      return player.awards.includes(criterion.value);
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
