import type { Criterion } from '../types';
export { nflPlayers } from './generated/nfl';


export const nflCriteria: Criterion[] = [
  // Teams
  { id: 'team-patriots', type: 'team', value: 'Patriots', label: 'Patriots', emoji: '🦅' },
  { id: 'team-cowboys', type: 'team', value: 'Cowboys', label: 'Cowboys', emoji: '⭐' },
  { id: 'team-49ers', type: 'team', value: '49ers', label: '49ers', emoji: '🥇' },
  { id: 'team-packers', type: 'team', value: 'Packers', label: 'Packers', emoji: '🧀' },
  { id: 'team-chiefs', type: 'team', value: 'Chiefs', label: 'Chiefs', emoji: '🏹' },
  { id: 'team-steelers', type: 'team', value: 'Steelers', label: 'Steelers', emoji: '⚙️' },
  { id: 'team-giants', type: 'team', value: 'Giants', label: 'Giants', emoji: '🗽' },
  { id: 'team-bears', type: 'team', value: 'Bears', label: 'Bears', emoji: '🐻' },
  { id: 'team-dolphins', type: 'team', value: 'Dolphins', label: 'Dolphins', emoji: '🐬' },
  { id: 'team-ravens', type: 'team', value: 'Ravens', label: 'Ravens', emoji: '🐦' },
  { id: 'team-broncos', type: 'team', value: 'Broncos', label: 'Broncos', emoji: '🐎' },
  { id: 'team-buccaneers', type: 'team', value: 'Buccaneers', label: 'Buccaneers', emoji: '☠️' },
  { id: 'team-eagles', type: 'team', value: 'Eagles', label: 'Eagles', emoji: '🦅' },
  { id: 'team-vikings', type: 'team', value: 'Vikings', label: 'Vikings', emoji: '⚔️' },
  { id: 'team-bills', type: 'team', value: 'Bills', label: 'Bills', emoji: '🦬' },
  { id: 'team-lions', type: 'team', value: 'Lions', label: 'Lions', emoji: '🦁' },
  // Awards
  { id: 'award-sb-mvp', type: 'award', value: 'Super Bowl MVP', label: 'Super Bowl MVP', emoji: '💍' },
  { id: 'award-mvp', type: 'award', value: 'MVP', label: 'League MVP', emoji: '🏆' },
  { id: 'award-dpoy', type: 'award', value: 'DPOY', label: 'Defensive POY', emoji: '🛡️' },
  { id: 'award-off-roy', type: 'award', value: 'Offensive ROY', label: 'Offensive ROY', emoji: '⭐' },
  { id: 'award-all-pro', type: 'award', value: 'All-Pro', label: 'All-Pro', emoji: '🌟' },
  { id: 'award-pro-bowl', type: 'award', value: 'Pro Bowl', label: 'Pro Bowl', emoji: '🏝️' },
  // Positions
  { id: 'pos-qb', type: 'position', value: 'QB', label: 'Quarterback', emoji: '🏈' },
  { id: 'pos-rb', type: 'position', value: 'RB', label: 'Running Back', emoji: '🏃' },
  { id: 'pos-wr', type: 'position', value: 'WR', label: 'Wide Receiver', emoji: '🙌' },
  { id: 'pos-te', type: 'position', value: 'TE', label: 'Tight End', emoji: '💪' },
  { id: 'pos-de', type: 'position', value: 'DE', label: 'Defensive End', emoji: '🛡️' },
  { id: 'pos-lb', type: 'position', value: 'LB', label: 'Linebacker', emoji: '💥' },
  { id: 'pos-cb', type: 'position', value: 'CB', label: 'Cornerback', emoji: '🔒' },
  // Countries
  { id: 'country-usa', type: 'country', value: 'USA', label: 'American', emoji: '🇺🇸' },
];
