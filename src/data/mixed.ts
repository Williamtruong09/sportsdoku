import type { Criterion } from '../types';

export const mixedCriteria: Criterion[] = [
  // Sport criteria
  { id: 'sport-nba', type: 'sport', value: 'nba', label: 'NBA Player', emoji: '🏀' },
  { id: 'sport-nfl', type: 'sport', value: 'nfl', label: 'NFL Player', emoji: '🏈' },
  { id: 'sport-mlb', type: 'sport', value: 'mlb', label: 'MLB Player', emoji: '⚾' },
  { id: 'sport-nhl', type: 'sport', value: 'nhl', label: 'NHL Player', emoji: '🏒' },
  { id: 'sport-soccer', type: 'sport', value: 'soccer', label: 'Soccer Player', emoji: '⚽' },
  // Country criteria (countries with enough players across sports)
  { id: 'country-usa', type: 'country', value: 'USA', label: 'American', emoji: '🇺🇸' },
  { id: 'country-canada', type: 'country', value: 'Canada', label: 'Canadian', emoji: '🇨🇦' },
  { id: 'country-france', type: 'country', value: 'France', label: 'French', emoji: '🇫🇷' },
  { id: 'country-germany', type: 'country', value: 'Germany', label: 'German', emoji: '🇩🇪' },
  { id: 'country-brazil', type: 'country', value: 'Brazil', label: 'Brazilian', emoji: '🇧🇷' },
  { id: 'country-argentina', type: 'country', value: 'Argentina', label: 'Argentine', emoji: '🇦🇷' },
  { id: 'country-sweden', type: 'country', value: 'Sweden', label: 'Swedish', emoji: '🇸🇪' },
  { id: 'country-spain', type: 'country', value: 'Spain', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'country-russia', type: 'country', value: 'Russia', label: 'Russian', emoji: '🇷🇺' },
  { id: 'country-dominican', type: 'country', value: 'Dominican Republic', label: 'Dominican', emoji: '🇩🇴' },
  { id: 'country-japan', type: 'country', value: 'Japan', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'country-england', type: 'country', value: 'England', label: 'English', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  // Cross-sport award criteria — generator skips cells with 0 valid players automatically
  { id: 'award-meta-mvp', type: 'award', value: 'meta:mvp', label: 'Won League MVP', emoji: '🏆' },
  { id: 'award-meta-roty', type: 'award', value: 'meta:roty', label: 'Won Rookie of Year', emoji: '🌟' },
  { id: 'award-meta-dpoy', type: 'award', value: 'meta:dpoy', label: 'Won Defensive Award', emoji: '🛡️' },
  { id: 'award-meta-finals', type: 'award', value: 'meta:finals-mvp', label: 'Won Championship MVP', emoji: '🥇' },
];
