import fs from 'fs';

// LeBron's NBA ID is 2544 (from earlier check)
const d = JSON.parse(fs.readFileSync('scripts/.cache/nba-awards-2544.json', 'utf8'));
const rs = d.resultSets?.find(r => r.name === 'PlayerAwards');
if (rs) {
  const h = rs.headers;
  const descIdx = h.indexOf('DESCRIPTION');
  const teamIdx = h.indexOf('TEAM');
  const seasonIdx = h.indexOf('SEASON');

  // Show all rows where team is Lakers or award is MVP-related
  for (const row of rs.rowSet ?? []) {
    const desc = row[descIdx] ?? '';
    const team = row[teamIdx] ?? '';
    const season = row[seasonIdx] ?? '';
    if (team.includes('Lakers') || desc.includes('Most Valuable') || desc.includes('MVP')) {
      console.log(`Season: ${season} | Team: ${team} | Desc: ${desc}`);
    }
  }
}
