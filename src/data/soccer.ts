import type { Criterion } from '../types';
export { soccerPlayers } from './generated/soccer';


export const soccerCriteria: Criterion[] = [
  // Teams
  { id: 'team-real-madrid', type: 'team', value: 'Real Madrid', label: 'Real Madrid', emoji: '👑' },
  { id: 'team-barcelona', type: 'team', value: 'Barcelona', label: 'Barcelona', emoji: '🔵🔴' },
  { id: 'team-manchester-united', type: 'team', value: 'Manchester United', label: 'Man United', emoji: '🔴' },
  { id: 'team-liverpool', type: 'team', value: 'Liverpool', label: 'Liverpool', emoji: '🔴' },
  { id: 'team-arsenal', type: 'team', value: 'Arsenal', label: 'Arsenal', emoji: '🔴' },
  { id: 'team-chelsea', type: 'team', value: 'Chelsea', label: 'Chelsea', emoji: '💙' },
  { id: 'team-manchester-city', type: 'team', value: 'Manchester City', label: 'Man City', emoji: '💙' },
  { id: 'team-juventus', type: 'team', value: 'Juventus', label: 'Juventus', emoji: '⚫⚪' },
  { id: 'team-psg', type: 'team', value: 'PSG', label: 'PSG', emoji: '🗼' },
  { id: 'team-bayern-munich', type: 'team', value: 'Bayern Munich', label: 'Bayern Munich', emoji: '🔴⚪' },
  { id: 'team-inter-milan', type: 'team', value: 'Inter Milan', label: 'Inter Milan', emoji: '🔵⚫' },
  { id: 'team-milan', type: 'team', value: 'Milan', label: 'AC Milan', emoji: '🔴⚫' },
  { id: 'team-borussia-dortmund', type: 'team', value: 'Borussia Dortmund', label: 'Dortmund', emoji: '🟡' },
  { id: 'team-tottenham', type: 'team', value: 'Tottenham', label: 'Tottenham', emoji: '⚪' },
  { id: 'team-ajax', type: 'team', value: 'Ajax', label: 'Ajax', emoji: '🇳🇱' },
  // Awards
  { id: 'award-ballon-dor', type: 'award', value: "Ballon d'Or", label: "Ballon d'Or", emoji: '🏅' },
  { id: 'award-world-cup', type: 'award', value: 'World Cup', label: 'World Cup', emoji: '🌍' },
  { id: 'award-champions-league', type: 'award', value: 'Champions League', label: 'Champions League', emoji: '🏆' },
  { id: 'award-copa-america', type: 'award', value: 'Copa America', label: 'Copa América', emoji: '🌎' },
  { id: 'award-euro', type: 'award', value: 'Euro', label: 'European Championship', emoji: '🇪🇺' },
  // Leagues played in (stored in player awards field by the ESPN fetch)
  { id: 'award-premier-league', type: 'award', value: 'Premier League', label: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'award-la-liga', type: 'award', value: 'La Liga', label: 'La Liga', emoji: '🇪🇸' },
  { id: 'award-bundesliga', type: 'award', value: 'Bundesliga', label: 'Bundesliga', emoji: '🇩🇪' },
  { id: 'award-serie-a', type: 'award', value: 'Serie A', label: 'Serie A', emoji: '🇮🇹' },
  { id: 'award-ligue-1', type: 'award', value: 'Ligue 1', label: 'Ligue 1', emoji: '🇫🇷' },
  // Countries
  { id: 'country-argentina', type: 'country', value: 'Argentina', label: 'Argentine', emoji: '🇦🇷' },
  { id: 'country-brazil', type: 'country', value: 'Brazil', label: 'Brazilian', emoji: '🇧🇷' },
  { id: 'country-france', type: 'country', value: 'France', label: 'French', emoji: '🇫🇷' },
  { id: 'country-portugal', type: 'country', value: 'Portugal', label: 'Portuguese', emoji: '🇵🇹' },
  { id: 'country-spain', type: 'country', value: 'Spain', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'country-germany', type: 'country', value: 'Germany', label: 'German', emoji: '🇩🇪' },
  { id: 'country-england', type: 'country', value: 'England', label: 'English', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'country-netherlands', type: 'country', value: 'Netherlands', label: 'Dutch', emoji: '🇳🇱' },
  { id: 'country-italy', type: 'country', value: 'Italy', label: 'Italian', emoji: '🇮🇹' },
  { id: 'country-croatia', type: 'country', value: 'Croatia', label: 'Croatian', emoji: '🇭🇷' },
  // Positions
  { id: 'pos-forward', type: 'position', value: 'Forward', label: 'Forward', emoji: '⚡' },
  { id: 'pos-midfielder', type: 'position', value: 'Midfielder', label: 'Midfielder', emoji: '🎯' },
  { id: 'pos-defender', type: 'position', value: 'Defender', label: 'Defender', emoji: '🛡️' },
  { id: 'pos-goalkeeper', type: 'position', value: 'Goalkeeper', label: 'Goalkeeper', emoji: '🥅' },
];
