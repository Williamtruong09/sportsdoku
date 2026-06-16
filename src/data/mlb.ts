import type { Criterion } from '../types';
export { mlbPlayers } from './generated/mlb';


export const mlbCriteria: Criterion[] = [
  // Teams
  { id: 'team-yankees', type: 'team', value: 'Yankees', label: 'Yankees', emoji: '🗽' },
  { id: 'team-dodgers', type: 'team', value: 'Dodgers', label: 'Dodgers', emoji: '💙' },
  { id: 'team-red-sox', type: 'team', value: 'Red Sox', label: 'Red Sox', emoji: '🧦' },
  { id: 'team-cubs', type: 'team', value: 'Cubs', label: 'Cubs', emoji: '🐻' },
  { id: 'team-cardinals', type: 'team', value: 'Cardinals', label: 'Cardinals', emoji: '🐦' },
  { id: 'team-giants-mlb', type: 'team', value: 'Giants', label: 'Giants (SF)', emoji: '🌉' },
  { id: 'team-braves', type: 'team', value: 'Braves', label: 'Braves', emoji: '🪓' },
  { id: 'team-phillies', type: 'team', value: 'Phillies', label: 'Phillies', emoji: '🔔' },
  { id: 'team-astros', type: 'team', value: 'Astros', label: 'Astros', emoji: '🚀' },
  { id: 'team-mariners', type: 'team', value: 'Mariners', label: 'Mariners', emoji: '⚓' },
  { id: 'team-athletics', type: 'team', value: 'Athletics', label: "A's", emoji: '🐘' },
  { id: 'team-reds', type: 'team', value: 'Reds', label: 'Reds', emoji: '🔴' },
  { id: 'team-pirates', type: 'team', value: 'Pirates', label: 'Pirates', emoji: '☠️' },
  { id: 'team-orioles', type: 'team', value: 'Orioles', label: 'Orioles', emoji: '🐦' },
  { id: 'team-mets', type: 'team', value: 'Mets', label: 'Mets', emoji: '🍎' },
  { id: 'team-angels', type: 'team', value: 'Angels', label: 'Angels', emoji: '😇' },
  { id: 'team-nationals', type: 'team', value: 'Nationals', label: 'Nationals', emoji: '🦅' },
  { id: 'team-blue-jays', type: 'team', value: 'Blue Jays', label: 'Blue Jays', emoji: '🐦' },
  { id: 'team-brewers', type: 'team', value: 'Brewers', label: 'Brewers', emoji: '🍺' },
  { id: 'team-marlins', type: 'team', value: 'Marlins', label: 'Marlins', emoji: '🐟' },
  { id: 'team-padres', type: 'team', value: 'Padres', label: 'Padres', emoji: '⛪' },
  { id: 'team-rays', type: 'team', value: 'Rays', label: 'Rays', emoji: '☀️' },
  { id: 'team-rockies', type: 'team', value: 'Rockies', label: 'Rockies', emoji: '🏔️' },
  { id: 'team-tigers', type: 'team', value: 'Tigers', label: 'Tigers', emoji: '🐯' },
  { id: 'team-twins', type: 'team', value: 'Twins', label: 'Twins', emoji: '👯' },
  { id: 'team-white-sox', type: 'team', value: 'White Sox', label: 'White Sox', emoji: '🧦' },
  { id: 'team-expos', type: 'team', value: 'Expos', label: 'Expos', emoji: '🇨🇦' },
  { id: 'team-indians', type: 'team', value: 'Indians', label: 'Indians', emoji: '🪶' },
  // Awards
  { id: 'award-mvp', type: 'award', value: 'MVP', label: 'Won MVP', emoji: '🏆' },
  { id: 'award-cy-young', type: 'award', value: 'Cy Young', label: 'Cy Young', emoji: '⚾' },
  { id: 'award-ws', type: 'award', value: 'World Series', label: 'World Series', emoji: '💍' },
  { id: 'award-ws-mvp', type: 'award', value: 'World Series MVP', label: 'WS MVP', emoji: '🏆' },
  { id: 'award-roy', type: 'award', value: 'Rookie of Year', label: 'Rookie of Year', emoji: '⭐' },
  { id: 'award-gold-glove', type: 'award', value: 'Gold Glove', label: 'Gold Glove', emoji: '🥇' },
  { id: 'award-all-star', type: 'award', value: 'All-Star', label: 'All-Star', emoji: '🌟' },
  // Countries
  { id: 'country-usa', type: 'country', value: 'USA', label: 'American', emoji: '🇺🇸' },
  { id: 'country-dominican', type: 'country', value: 'Dominican Republic', label: 'Dominican', emoji: '🇩🇴' },
  { id: 'country-japan', type: 'country', value: 'Japan', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'country-venezuela', type: 'country', value: 'Venezuela', label: 'Venezuelan', emoji: '🇻🇪' },
  // Positions
  { id: 'pos-sp', type: 'position', value: 'SP', label: 'Starting Pitcher', emoji: '⚾' },
  { id: 'pos-ss', type: 'position', value: 'SS', label: 'Shortstop', emoji: '🎯' },
  { id: 'pos-of', type: 'position', value: 'CF', label: 'Center Field', emoji: '🏃' },
  { id: 'pos-1b', type: 'position', value: '1B', label: 'First Base', emoji: '1️⃣' },
];
