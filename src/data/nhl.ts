import type { Criterion } from '../types';
export { nhlPlayers } from './generated/nhl';


export const nhlCriteria: Criterion[] = [
  // Teams
  { id: 'team-oilers', type: 'team', value: 'Oilers', label: 'Oilers', emoji: '⛽' },
  { id: 'team-canadiens', type: 'team', value: 'Canadiens', label: 'Canadiens', emoji: '🍁' },
  { id: 'team-bruins', type: 'team', value: 'Bruins', label: 'Bruins', emoji: '🐻' },
  { id: 'team-penguins', type: 'team', value: 'Penguins', label: 'Penguins', emoji: '🐧' },
  { id: 'team-red-wings', type: 'team', value: 'Red Wings', label: 'Red Wings', emoji: '🚗' },
  { id: 'team-rangers', type: 'team', value: 'Rangers', label: 'Rangers', emoji: '🗽' },
  { id: 'team-lightning', type: 'team', value: 'Lightning', label: 'Lightning', emoji: '⚡' },
  { id: 'team-capitals', type: 'team', value: 'Capitals', label: 'Capitals', emoji: '🏛️' },
  { id: 'team-blackhawks', type: 'team', value: 'Blackhawks', label: 'Blackhawks', emoji: '🦅' },
  { id: 'team-kings', type: 'team', value: 'Kings', label: 'Kings', emoji: '👑' },
  { id: 'team-avalanche', type: 'team', value: 'Avalanche', label: 'Avalanche', emoji: '🏔️' },
  { id: 'team-maple-leafs', type: 'team', value: 'Maple Leafs', label: 'Maple Leafs', emoji: '🍁' },
  { id: 'team-flyers', type: 'team', value: 'Flyers', label: 'Flyers', emoji: '🛫' },
  { id: 'team-devils', type: 'team', value: 'Devils', label: 'Devils', emoji: '😈' },
  // Awards
  { id: 'award-hart', type: 'award', value: 'Hart Trophy', label: 'Hart Trophy (MVP)', emoji: '🏆' },
  { id: 'award-conn-smythe', type: 'award', value: 'Conn Smythe', label: 'Conn Smythe', emoji: '🥇' },
  { id: 'award-art-ross', type: 'award', value: 'Art Ross', label: 'Art Ross (Scoring)', emoji: '📊' },
  { id: 'award-norris', type: 'award', value: 'Norris Trophy', label: 'Norris (Best D)', emoji: '🛡️' },
  { id: 'award-vezina', type: 'award', value: 'Vezina Trophy', label: 'Vezina (Best G)', emoji: '🥅' },
  { id: 'award-rocket-richard', type: 'award', value: 'Rocket Richard Trophy', label: 'Rocket Richard', emoji: '🚀' },
  { id: 'award-calder', type: 'award', value: 'Calder Trophy', label: 'Calder (Rookie)', emoji: '⭐' },
  { id: 'award-stanley-cup', type: 'award', value: 'Stanley Cup', label: 'Stanley Cup', emoji: '🏆' },
  // Countries
  { id: 'country-canada', type: 'country', value: 'Canada', label: 'Canadian', emoji: '🇨🇦' },
  { id: 'country-russia', type: 'country', value: 'Russia', label: 'Russian', emoji: '🇷🇺' },
  { id: 'country-sweden', type: 'country', value: 'Sweden', label: 'Swedish', emoji: '🇸🇪' },
  { id: 'country-czech', type: 'country', value: 'Czech Republic', label: 'Czech', emoji: '🇨🇿' },
  { id: 'country-usa', type: 'country', value: 'USA', label: 'American', emoji: '🇺🇸' },
  { id: 'country-finland', type: 'country', value: 'Finland', label: 'Finnish', emoji: '🇫🇮' },
  { id: 'country-germany', type: 'country', value: 'Germany', label: 'German', emoji: '🇩🇪' },
  // Positions
  { id: 'pos-center', type: 'position', value: 'C', label: 'Center', emoji: '🎯' },
  { id: 'pos-lw', type: 'position', value: 'LW', label: 'Left Wing', emoji: '⬅️' },
  { id: 'pos-rw', type: 'position', value: 'RW', label: 'Right Wing', emoji: '➡️' },
  { id: 'pos-defenseman', type: 'position', value: 'D', label: 'Defenseman', emoji: '🛡️' },
  { id: 'pos-goalie', type: 'position', value: 'G', label: 'Goalie', emoji: '🥅' },
];
