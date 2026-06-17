#!/usr/bin/env node
/**
 * Fetches all-time historical players from official sports APIs.
 * Writes generated player arrays to src/data/generated/{sport}.ts
 *
 * Usage:
 *   node scripts/fetch-players.mjs          # all sports
 *   node scripts/fetch-players.mjs mlb      # single sport
 *   node scripts/fetch-players.mjs mlb nhl  # multiple sports
 *
 * Raw API responses are cached in scripts/.cache/ so reruns are fast.
 * Delete .cache/ to force a fresh fetch.
 *
 * APIs used (all free, no auth required except where noted):
 *   MLB  → statsapi.mlb.com          (official)
 *   NHL  → api-web.nhle.com          (official v1)
 *   NBA  → stats.nba.com             (unofficial, needs browser headers)
 *   NFL  → sports.core.api.espn.com  (unofficial ESPN)
 *   Soccer → sports.core.api.espn.com (unofficial ESPN — historical rosters 2003-2022)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, '.cache');
const OUT = join(__dirname, '..', 'src', 'data', 'generated');

// ─── Shared utilities ─────────────────────────────────────────────────────────

function ensureDirs() {
  [CACHE, OUT].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, cacheKey, headers = {}) {
  const file = join(CACHE, `${cacheKey}.json`);
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  await sleep(300); // polite rate limiting
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SportsDoku/1.0 player-data-fetcher', ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const data = await res.json();
  writeFileSync(file, JSON.stringify(data));
  return data;
}

/** Normalize a name to a URL-safe id slug, handling accented characters. */
function slug(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dedupe(players) {
  const seen = new Set();
  return players.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function writeTS(sport, players) {
  const unique = dedupe(players).filter(p => p.name && p.teams.length > 0);
  unique.sort((a, b) => a.name.localeCompare(b.name));

  const lines = unique.map(p => {
    const name = p.name.replace(/'/g, "\\'");
    const awardTeams = p.awardTeams ?? {};
    return `  { id: '${p.id}', name: '${name}', sport: '${sport}', teams: ${JSON.stringify(p.teams)}, awards: ${JSON.stringify(p.awards)}, awardTeams: ${JSON.stringify(awardTeams)}, country: '${p.country}', positions: ${JSON.stringify(p.positions)} }`;
  });

  const content = [
    `// AUTO-GENERATED — do not edit by hand.`,
    `// Run: node scripts/fetch-players.mjs ${sport}`,
    `import type { Player } from '../../types';`,
    ``,
    `export const ${sport}Players: Player[] = [`,
    lines.join(',\n'),
    `];`,
    ``,
  ].join('\n');

  writeFileSync(join(OUT, `${sport}.ts`), content);
  console.log(`  ✓ Wrote ${unique.length} ${sport.toUpperCase()} players → src/data/generated/${sport}.ts`);
}

// ─── MLB ──────────────────────────────────────────────────────────────────────

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

const MLB_AWARD_IDS = {
  ALMVP: 'MVP', NLMVP: 'MVP',
  ALCYA: 'Cy Young', NLCYA: 'Cy Young',
  ALROY: 'Rookie of Year', NLROY: 'Rookie of Year',
  ALGG: 'Gold Glove', NLGG: 'Gold Glove',
  WSMVP: 'World Series MVP',
};

const MLB_TEAM_IDS = {
  108: 'Angels', 109: 'Diamondbacks', 110: 'Orioles', 111: 'Red Sox',
  112: 'Cubs', 113: 'Reds', 114: 'Indians', 115: 'Rockies',
  116: 'Tigers', 117: 'Astros', 118: 'Royals', 119: 'Dodgers',
  120: 'Nationals', 121: 'Mets', 133: 'Athletics', 134: 'Pirates',
  135: 'Padres', 136: 'Mariners', 137: 'Giants', 138: 'Cardinals',
  139: 'Rays', 140: 'Rangers', 141: 'Blue Jays', 142: 'Twins',
  143: 'Phillies', 144: 'Braves', 145: 'White Sox', 146: 'Marlins',
  147: 'Yankees', 158: 'Brewers', 137: 'Giants',
};

const MLB_TEAM_NAMES = {
  'New York Yankees': 'Yankees', 'Boston Red Sox': 'Red Sox',
  'Los Angeles Dodgers': 'Dodgers', 'Chicago Cubs': 'Cubs',
  'St. Louis Cardinals': 'Cardinals', 'San Francisco Giants': 'Giants',
  'Atlanta Braves': 'Braves', 'Philadelphia Phillies': 'Phillies',
  'Houston Astros': 'Astros', 'Seattle Mariners': 'Mariners',
  'Oakland Athletics': 'Athletics', 'Cincinnati Reds': 'Reds',
  'Pittsburgh Pirates': 'Pirates', 'Baltimore Orioles': 'Orioles',
  'New York Mets': 'Mets', 'Los Angeles Angels': 'Angels',
  'Anaheim Angels': 'Angels', 'California Angels': 'Angels',
  'Washington Nationals': 'Nationals', 'Montreal Expos': 'Expos',
  'Minnesota Twins': 'Twins', 'Cleveland Guardians': 'Indians',
  'Cleveland Indians': 'Indians', 'Texas Rangers': 'Rangers',
  'Detroit Tigers': 'Tigers', 'Toronto Blue Jays': 'Blue Jays',
  'Miami Marlins': 'Marlins', 'Florida Marlins': 'Marlins',
  'Chicago White Sox': 'White Sox', 'San Diego Padres': 'Padres',
  'Colorado Rockies': 'Rockies', 'Kansas City Royals': 'Royals',
  'Milwaukee Brewers': 'Brewers', 'Tampa Bay Rays': 'Rays',
  'Tampa Bay Devil Rays': 'Rays', 'Arizona Diamondbacks': 'Diamondbacks',
};

const MLB_COUNTRIES = {
  'USA': 'USA', 'D.R.': 'Dominican Republic',
  'Dominican Republic': 'Dominican Republic', 'Venezuela': 'Venezuela',
  'Cuba': 'Cuba', 'Panama': 'Panama', 'Puerto Rico': 'Puerto Rico',
  'Japan': 'Japan', 'South Korea': 'South Korea', 'Korea': 'South Korea',
  'Mexico': 'Mexico', 'Canada': 'Canada', 'Colombia': 'Colombia',
  'Netherlands': 'Netherlands', 'Curacao': 'Curacao',
  'Nicaragua': 'Nicaragua', 'Australia': 'Australia',
  'Brazil': 'Brazil', 'Bahamas': 'Bahamas', 'Aruba': 'Aruba',
};

async function fetchMLB() {
  console.log('\n=== MLB ===');
  const byId = new Map(); // mlbId → { name, awards, teams, positions, country }

  // 1. Discover ALL players via per-team rosters by season — correctly maps team per season
  //    (sports/1/players?season=year returns wrong currentTeam — reflects today's team, not that year's)
  const MLB_ALL_TEAM_IDS = Object.keys(MLB_TEAM_IDS).map(Number);
  console.log(`  Discovering MLB players via per-team rosters (${MLB_ALL_TEAM_IDS.length} teams × 31 seasons)...`);
  let mlbRostersDone = 0;
  for (let year = 1994; year <= 2024; year++) {
    for (const teamId of MLB_ALL_TEAM_IDS) {
      try {
        const d = await get(
          `${MLB_BASE}/teams/${teamId}/roster?season=${year}&rosterType=active`,
          `mlb-teamroster-${year}-${teamId}`,
        );
        for (const entry of d.roster ?? []) {
          const person = entry.person;
          if (!person?.id) continue;
          const key = String(person.id);
          const teamName = MLB_TEAM_IDS[teamId];
          const pos = entry.position?.abbreviation;
          if (!byId.has(key)) {
            byId.set(key, { name: person.fullName ?? '', awards: new Set(), teams: new Set(), positions: pos ? [pos] : [], country: 'USA', awardTeams: {} });
          }
          if (teamName) byId.get(key).teams.add(teamName);
        }
        mlbRostersDone++;
      } catch { /* invalid team/season combo */ }
    }
  }
  console.log(`  Discovered ${byId.size} MLB players from ${mlbRostersDone} team-seasons`);

  // 2. Add awards from award endpoints
  for (const [awardId, ourAward] of Object.entries(MLB_AWARD_IDS)) {
    try {
      const d = await get(
        `${MLB_BASE}/awards/${awardId}/recipients?sportId=1&limit=2000`,
        `mlb-award-${awardId}`,
      );
      for (const entry of d.awards ?? []) {
        const p = entry.player;
        if (!p?.id) continue;
        const key = String(p.id);
        if (!byId.has(key)) {
          byId.set(key, { name: p.fullName ?? p.nameFirstLast ?? '', awards: new Set(), teams: new Set(), positions: [], country: 'USA', awardTeams: {} });
        }
        const rec = byId.get(key);
        rec.awards.add(ourAward);
        const teamShort = MLB_TEAM_IDS[entry.team?.id];
        if (teamShort) {
          if (!rec.awardTeams[ourAward]) rec.awardTeams[ourAward] = new Set();
          rec.awardTeams[ourAward].add(teamShort);
          rec.teams.add(teamShort);
        }
      }
    } catch (e) {
      console.warn(`  ⚠ MLB award ${awardId}: ${e.message}`);
    }
  }

  // 3. Targeted enrichment for players still missing team data (pre-1994 award winners etc.)
  const needsEnrichment = [...byId.entries()].filter(([, p]) => p.teams.size === 0);
  console.log(`  Enriching ${needsEnrichment.length} players missing team data...`);
  let enrichDone = 0;
  for (const [mlbId, p] of needsEnrichment) {
    enrichDone++;
    if (enrichDone % 50 === 0) console.log(`  Enrich: ${enrichDone}/${needsEnrichment.length}`);
    try {
      const d = await get(`${MLB_BASE}/people/${mlbId}?hydrate=currentTeam`, `mlb-person-${mlbId}`);
      const person = d.people?.[0];
      if (!person) continue;
      p.country = MLB_COUNTRIES[person.birthCountry] ?? person.birthCountry ?? 'USA';
      if (!p.positions.length) p.positions = [person.primaryPosition?.abbreviation].filter(Boolean);
      p.name = person.fullName ?? p.name;
      if (person.currentTeam?.name) {
        const t = MLB_TEAM_NAMES[person.currentTeam.name];
        if (t) p.teams.add(t);
      }
      try {
        const sd = await get(
          `${MLB_BASE}/people/${mlbId}/stats?stats=yearByYear&group=hitting,pitching&sportId=1`,
          `mlb-stats-${mlbId}`,
        );
        for (const statGroup of sd.stats ?? []) {
          for (const split of statGroup.splits ?? []) {
            const t = MLB_TEAM_NAMES[split.team?.name];
            if (t) p.teams.add(t);
          }
        }
      } catch { /* stats optional */ }
    } catch (e) {
      console.warn(`  ⚠ MLB person ${mlbId}: ${e.message}`);
    }
  }

  // 4. Build final player list
  const players = [];
  for (const [, p] of byId) {
    if (!p.name) continue;
    players.push({
      id: slug(p.name),
      name: p.name,
      sport: 'mlb',
      teams: [...p.teams],
      awards: [...p.awards],
      awardTeams: Object.fromEntries(Object.entries(p.awardTeams).map(([k, v]) => [k, [...v]])),
      country: p.country,
      positions: p.positions,
    });
  }

  return players;
}

// ─── NHL ──────────────────────────────────────────────────────────────────────

const NHL_BASE = 'https://api-web.nhle.com/v1';

const NHL_TEAM_NAMES = {
  'Edmonton Oilers': 'Oilers', 'Montréal Canadiens': 'Canadiens',
  'Montreal Canadiens': 'Canadiens', 'Boston Bruins': 'Bruins',
  'Pittsburgh Penguins': 'Penguins', 'Detroit Red Wings': 'Red Wings',
  'New York Rangers': 'Rangers', 'Tampa Bay Lightning': 'Lightning',
  'Washington Capitals': 'Capitals', 'Chicago Blackhawks': 'Blackhawks',
  'Los Angeles Kings': 'Kings', 'Colorado Avalanche': 'Avalanche',
  'Toronto Maple Leafs': 'Maple Leafs', 'Philadelphia Flyers': 'Flyers',
  'New Jersey Devils': 'Devils', 'Dallas Stars': 'Stars',
  'Calgary Flames': 'Flames', 'Vancouver Canucks': 'Canucks',
  'St. Louis Blues': 'Blues', 'Anaheim Ducks': 'Ducks',
  'Buffalo Sabres': 'Sabres', 'San Jose Sharks': 'Sharks',
  'Nashville Predators': 'Predators', 'Ottawa Senators': 'Senators',
  'New York Islanders': 'Islanders', 'Carolina Hurricanes': 'Hurricanes',
  'Minnesota Wild': 'Wild', 'Columbus Blue Jackets': 'Blue Jackets',
  'Florida Panthers': 'Panthers', 'Arizona Coyotes': 'Coyotes',
  'Winnipeg Jets': 'Jets', 'Vegas Golden Knights': 'Golden Knights',
  'Seattle Kraken': 'Kraken', 'Utah Hockey Club': 'Utah HC',
  'Quebec Nordiques': 'Nordiques', 'Hartford Whalers': 'Whalers',
  'Atlanta Thrashers': 'Thrashers', 'Mighty Ducks of Anaheim': 'Ducks',
  'Minnesota North Stars': 'Stars', 'Atlanta Flames': 'Flames',
};

const NHL_COUNTRIES = {
  CAN: 'Canada', USA: 'USA', RUS: 'Russia', SWE: 'Sweden',
  FIN: 'Finland', CZE: 'Czech Republic', SVK: 'Slovakia',
  DEU: 'Germany', CHE: 'Switzerland', LVA: 'Latvia',
  BLR: 'Belarus', UKR: 'Ukraine', SVN: 'Slovenia',
  DNK: 'Denmark', NOR: 'Norway', AUT: 'Austria',
};

const NHL_ALL_TEAM_ABBREVS = [
  // Current 32 franchises
  'ANA', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL', 'DAL', 'DET',
  'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NJD', 'NSH', 'NYI', 'NYR', 'OTT',
  'PHI', 'PIT', 'SEA', 'SJS', 'STL', 'TBL', 'TOR', 'UTA', 'VAN', 'VGK',
  'WPG', 'WSH',
  // Historical franchises active since 1990
  'ARI', 'PHX', 'ATL', 'HFD', 'QUE',
];

async function fetchNHL() {
  console.log('\n=== NHL ===');
  const byId = new Map();

  // Build season ID list: 19901991 → 20242025 (35 seasons)
  const seasons = [];
  for (let y = 1990; y <= 2024; y++) {
    seasons.push(`${y}${y + 1}`);
  }

  // 0. Discover ALL NHL players via team rosters across every season
  console.log(`  Discovering NHL players via team rosters (${NHL_ALL_TEAM_ABBREVS.length} teams × ${seasons.length} seasons)...`);
  let rostersDone = 0;
  for (const teamAbbr of NHL_ALL_TEAM_ABBREVS) {
    for (const season of seasons) {
      try {
        const d = await get(
          `${NHL_BASE}/roster/${teamAbbr}/${season}`,
          `nhl-roster-${teamAbbr}-${season}`,
        );
        for (const group of [d.forwards, d.defensemen, d.goalies]) {
          for (const player of group ?? []) {
            if (!player.id) continue;
            const pid = String(player.id);
            if (!byId.has(pid)) {
              byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [], country: 'Canada' });
            }
          }
        }
        rostersDone++;
      } catch { /* invalid team/season combo — silently skip */ }
    }
  }
  console.log(`  Roster discovery: ${rostersDone} valid team-seasons, ${byId.size} unique players found`);

  // 1. Skater scoring leaders (forwards + defensemen) — captures Art Ross/Hart/Norris candidates
  console.log(`  Fetching skater scoring leaders (${seasons.length} seasons)...`);
  let skaterSeasons = 0;
  for (const season of seasons) {
    try {
      const d = await get(
        `${NHL_BASE}/skater-stats-leaders/${season}/2?categories=points&limit=50`,
        `nhl-scoring-${season}`,
      );
      for (const p of d.points ?? []) {
        if (!p.id) continue;
        const pid = String(p.id);
        if (!byId.has(pid)) {
          byId.set(pid, { name: `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim(), awards: new Set(), teams: new Set(), positions: [], country: 'Canada', awardTeams: {} });
        }
      }
      skaterSeasons++;
    } catch { /* older seasons may not be available */ }
  }
  console.log(`  Got scoring leaders from ${skaterSeasons} seasons`);

  // 2. Goalie wins leaders — captures Vezina/Stanley Cup goalie candidates
  let goalieSeasons = 0;
  for (const season of seasons) {
    try {
      const d = await get(
        `${NHL_BASE}/goalie-stats-leaders/${season}/2?categories=wins&limit=20`,
        `nhl-goalies-${season}`,
      );
      for (const p of d.wins ?? []) {
        if (!p.id) continue;
        const pid = String(p.id);
        if (!byId.has(pid)) {
          byId.set(pid, { name: `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim(), awards: new Set(), teams: new Set(), positions: ['G'], country: 'Canada', awardTeams: {} });
        }
      }
      goalieSeasons++;
    } catch { /* goalie endpoint optional */ }
  }
  if (goalieSeasons > 0) console.log(`  Got goalie leaders from ${goalieSeasons} seasons`);

  console.log(`  Collected ${byId.size} unique NHL players, enriching from landing pages...`);

  // 3. Enrich with career details from player landing pages
  const players = [];
  let done = 0;
  for (const [pid, p] of byId) {
    done++;
    if (done % 100 === 0) console.log(`  Progress: ${done}/${byId.size}`);
    try {
      const d = await get(`${NHL_BASE}/player/${pid}/landing`, `nhl-player-${pid}`);

      const firstName = d.firstName?.default ?? '';
      const lastName = d.lastName?.default ?? '';
      const name = `${firstName} ${lastName}`.trim();
      if (!name) continue;

      p.country = NHL_COUNTRIES[d.birthCountry] ?? d.birthCountry ?? 'Canada';
      p.positions = [d.position].filter(Boolean);

      // Career teams from NHL season totals only
      for (const season of d.seasonTotals ?? []) {
        if (season.leagueAbbrev !== 'NHL') continue;
        const t = NHL_TEAM_NAMES[season.teamName?.default ?? ''];
        if (t) p.teams.add(t);
      }

      // Build season→team lookup from NHL season totals for award team matching
      const nhlSeasonTeam = new Map();
      for (const s of d.seasonTotals ?? []) {
        if (s.leagueAbbrev !== 'NHL') continue;
        const t = NHL_TEAM_NAMES[s.teamName?.default ?? ''];
        if (t && s.season) nhlSeasonTeam.set(String(s.season), t);
      }

      // Awards — fuzzy matching handles encoding variants (curly quotes, etc.)
      for (const award of d.awards ?? []) {
        const t = award.trophy?.default ?? '';
        let ourAward = null;
        if (t.includes('Hart')) ourAward = 'Hart Trophy';
        else if (t.includes('Art Ross')) ourAward = 'Art Ross';
        else if (t.includes('Conn Smythe')) ourAward = 'Conn Smythe';
        else if (t.includes('Norris')) ourAward = 'Norris Trophy';
        else if (t.includes('Vezina')) ourAward = 'Vezina Trophy';
        else if (t.includes('Calder')) ourAward = 'Calder Trophy';
        else if (t.includes('Rocket') || t.includes('Richard')) ourAward = 'Rocket Richard Trophy';
        else if (t.toLowerCase().includes('stanley')) ourAward = 'Stanley Cup';
        if (!ourAward) continue;
        p.awards.add(ourAward);
        // Record which team they were on when they won it
        const seasonId = String(award.seasons?.[0]?.seasonId ?? '');
        const awardTeam = nhlSeasonTeam.get(seasonId);
        if (awardTeam) {
          if (!p.awardTeams[ourAward]) p.awardTeams[ourAward] = new Set();
          p.awardTeams[ourAward].add(awardTeam);
        }
      }

      players.push({
        id: slug(name),
        name,
        sport: 'nhl',
        teams: [...p.teams],
        awards: [...p.awards],
        awardTeams: Object.fromEntries(Object.entries(p.awardTeams).map(([k, v]) => [k, [...v]])),
        country: p.country,
        positions: p.positions,
      });
    } catch (e) {
      console.warn(`  ⚠ NHL player ${pid}: ${e.message}`);
    }
  }

  return players;
}

// ─── NBA ──────────────────────────────────────────────────────────────────────

// stats.nba.com blocks default Node fetch — these headers mimic a browser request
const NBA_HEADERS = {
  'Host': 'stats.nba.com',
  'Referer': 'https://www.nba.com/',
  'Origin': 'https://www.nba.com',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

const NBA_AWARD_KEYWORDS = {
  'Finals Most Valuable Player': 'Finals MVP',
  'Most Valuable Player': 'MVP',
  'Defensive Player of the Year': 'DPOY',
  'Rookie of the Year': 'Rookie of Year',
  'Sixth Man of the Year': 'Sixth Man',
  'Most Improved Player': 'MIP',
  'Scoring Champion': 'Scoring Title',
};

const NBA_TEAM_NAMES = {
  'Atlanta Hawks': 'Hawks', 'Boston Celtics': 'Celtics',
  'Brooklyn Nets': 'Nets', 'New Jersey Nets': 'Nets',
  'Charlotte Hornets': 'Hornets', 'Charlotte Bobcats': 'Hornets',
  'Chicago Bulls': 'Bulls', 'Cleveland Cavaliers': 'Cavaliers',
  'Dallas Mavericks': 'Mavericks', 'Denver Nuggets': 'Nuggets',
  'Detroit Pistons': 'Pistons', 'Golden State Warriors': 'Warriors',
  'Houston Rockets': 'Rockets', 'Indiana Pacers': 'Pacers',
  'Los Angeles Clippers': 'Clippers', 'Los Angeles Lakers': 'Lakers',
  'Memphis Grizzlies': 'Grizzlies', 'Vancouver Grizzlies': 'Grizzlies',
  'Miami Heat': 'Heat', 'Milwaukee Bucks': 'Bucks',
  'Minnesota Timberwolves': 'Timberwolves', 'New Orleans Pelicans': 'Pelicans',
  'New Orleans Hornets': 'Hornets', 'New York Knicks': 'Knicks',
  'Oklahoma City Thunder': 'Thunder', 'Seattle SuperSonics': 'Sonics',
  'Orlando Magic': 'Magic', 'Philadelphia 76ers': '76ers',
  'Phoenix Suns': 'Suns', 'Portland Trail Blazers': 'Trail Blazers',
  'Sacramento Kings': 'Kings', 'San Antonio Spurs': 'Spurs',
  'Toronto Raptors': 'Raptors', 'Utah Jazz': 'Jazz',
  'Washington Wizards': 'Wizards', 'Washington Bullets': 'Wizards',
};

const NBA_COUNTRIES = {
  'USA': 'USA', 'France': 'France', 'Germany': 'Germany',
  'Serbia': 'Serbia', 'Greece': 'Greece', 'Slovenia': 'Slovenia',
  'Canada': 'Canada', 'Nigeria': 'Nigeria', 'Cameroon': 'Cameroon',
  'Australia': 'Australia', 'Spain': 'Spain', 'Argentina': 'Argentina',
  'Brazil': 'Brazil', 'Lithuania': 'Lithuania', 'Croatia': 'Croatia',
  'Democratic Republic of the Congo': 'DRC', 'Congo': 'DRC',
  'Senegal': 'Senegal', 'Finland': 'Finland', 'Latvia': 'Latvia',
  'Jamaica': 'Jamaica', 'Austria': 'Austria',
};

// Team abbreviation → short name (for leagueleaders + career stats responses)
const NBA_TEAM_ABBREVS = {
  ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', NJN: 'Nets', NJ: 'Nets',
  CHA: 'Hornets', CHH: 'Hornets', CHB: 'Hornets', CHI: 'Bulls',
  CLE: 'Cavaliers', DAL: 'Mavericks', DEN: 'Nuggets', DET: 'Pistons',
  GSW: 'Warriors', GS: 'Warriors', HOU: 'Rockets', IND: 'Pacers',
  LAC: 'Clippers', LAL: 'Lakers', MEM: 'Grizzlies', VAN: 'Grizzlies',
  MIA: 'Heat', MIL: 'Bucks', MIN: 'Timberwolves', NOP: 'Pelicans',
  NOH: 'Pelicans', NOK: 'Pelicans', NYK: 'Knicks', OKC: 'Thunder',
  SEA: 'Sonics', ORL: 'Magic', PHI: '76ers', PHX: 'Suns',
  POR: 'Trail Blazers', SAC: 'Kings', SAS: 'Spurs', TOR: 'Raptors',
  UTA: 'Jazz', WAS: 'Wizards', WSB: 'Wizards',
};

async function fetchNBA() {
  console.log('\n=== NBA ===');
  const byId = new Map(); // pid → { name, country, positions, teams: Set, awards: Set }

  // Step 1: playerindex returns ALL historical players in one request — name, country, position, years active
  console.log('  Fetching full player index...');
  try {
    const d = await get(
      'https://stats.nba.com/stats/playerindex?Historical=1&LeagueID=00&Season=2024-25&SeasonType=Regular+Season&TeamID=0&College=&Country=&DraftPick=&DraftRound=&DraftYear=&Height=&Weight=',
      'nba-playerindex-historical',
      NBA_HEADERS,
    );
    const rs = d.resultSets?.[0] ?? d.resultSet;
    if (rs) {
      const h = rs.headers;
      const pidIdx    = h.indexOf('PERSON_ID');
      const firstIdx  = h.indexOf('PLAYER_FIRST_NAME');
      const lastIdx   = h.indexOf('PLAYER_LAST_NAME');
      const posIdx    = h.indexOf('POSITION');
      const countryIdx = h.indexOf('COUNTRY');
      const fromIdx   = h.indexOf('FROM_YEAR');
      const toIdx     = h.indexOf('TO_YEAR');

      for (const row of rs.rowSet ?? []) {
        const fromYear = parseInt(row[fromIdx] ?? 0);
        const toYear   = parseInt(row[toIdx]   ?? 0);
        // Keep players active since 1975 (covers Bird, Magic, Kareem, Dr. J era and forward)
        if (toYear < 1975 && fromYear < 1975) continue;

        const pid     = String(row[pidIdx]);
        const name    = `${row[firstIdx] ?? ''} ${row[lastIdx] ?? ''}`.trim();
        if (!name || !pid) continue;

        const country = NBA_COUNTRIES[row[countryIdx]] ?? row[countryIdx] ?? 'USA';
        const posRaw  = (row[posIdx] ?? '').split('-')[0].trim();

        byId.set(pid, {
          name,
          country,
          positions: posRaw ? [posRaw] : [],
          teams: new Set(),
          awards: new Set(),
          awardTeams: {},
        });
      }
    }
    console.log(`  Player index: ${byId.size} players active since 1994`);
  } catch (e) {
    console.warn(`  ⚠ playerindex failed: ${e.message} — falling back to stat leaders`);
  }

  // Step 2 & 3: Per player — career teams + awards (both cached after first run)
  console.log(`  Fetching career teams + awards for ${byId.size} players...`);
  const players = [];
  let done = 0;
  for (const [pid, p] of byId) {
    done++;
    if (done % 250 === 0) console.log(`  Progress: ${done}/${byId.size}`);

    try {
      const careerD = await get(
        `https://stats.nba.com/stats/playercareerstats?PlayerID=${pid}&PerMode=Totals`,
        `nba-career-${pid}`,
        NBA_HEADERS,
      );
      const seasonRS = careerD.resultSets?.find(r => r.name === 'SeasonTotalsRegularSeason');
      if (seasonRS) {
        const th = seasonRS.headers;
        const teamIdx = th.indexOf('TEAM_ABBREVIATION');
        for (const srow of seasonRS.rowSet ?? []) {
          const team = NBA_TEAM_ABBREVS[srow[teamIdx] ?? ''];
          if (team) p.teams.add(team);
        }
      }
    } catch { /* career stats optional */ }

    try {
      const awardD = await get(
        `https://stats.nba.com/stats/playerawards?PlayerID=${pid}`,
        `nba-awards-${pid}`,
        NBA_HEADERS,
      );
      const awardRS = awardD.resultSets?.find(r => r.name === 'PlayerAwards');
      if (awardRS) {
        const h = awardRS.headers;
        const descIdx = h.indexOf('DESCRIPTION');
        const teamIdx = h.indexOf('TEAM');
        for (const row of awardRS.rowSet ?? []) {
          const desc = row[descIdx] ?? '';
          const teamFull = row[teamIdx] ?? '';
          const teamShort = NBA_TEAM_NAMES[teamFull];
          const addAwardTeam = (award) => {
            if (!teamShort) return;
            if (!p.awardTeams[award]) p.awardTeams[award] = new Set();
            p.awardTeams[award].add(teamShort);
          };
          // Handle All-Star / Slam Dunk first and skip season-award matching
          // (prevents "All-Star Most Valuable Player" from falsely mapping to MVP)
          if (desc.includes('All-Star')) { p.awards.add('All-Star'); addAwardTeam('All-Star'); continue; }
          if (desc.includes('Slam Dunk')) { p.awards.add('Slam Dunk Contest'); addAwardTeam('Slam Dunk Contest'); continue; }
          if (desc.includes('Cup Most Valuable Player')) continue; // skip NBA Cup/In-Season Tournament MVP
          const ourAward = Object.entries(NBA_AWARD_KEYWORDS).find(([k]) => desc.includes(k))?.[1];
          if (ourAward) { p.awards.add(ourAward); addAwardTeam(ourAward); }
        }
      }
    } catch { /* awards optional */ }

    // Skip players who never appeared in any season
    if (p.teams.size === 0) continue;

    players.push({
      id: slug(p.name),
      name: p.name,
      sport: 'nba',
      teams: [...p.teams],
      awards: [...p.awards],
      awardTeams: Object.fromEntries(Object.entries(p.awardTeams).map(([k, v]) => [k, [...v]])),
      country: p.country,
      positions: p.positions,
    });
  }

  return players;
}

// ─── NFL ──────────────────────────────────────────────────────────────────────

const NFL_BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

const NFL_TEAM_NAMES = {
  'Arizona Cardinals': 'Cardinals', 'Atlanta Falcons': 'Falcons',
  'Baltimore Ravens': 'Ravens', 'Buffalo Bills': 'Bills',
  'Carolina Panthers': 'Panthers', 'Chicago Bears': 'Bears',
  'Cincinnati Bengals': 'Bengals', 'Cleveland Browns': 'Browns',
  'Dallas Cowboys': 'Cowboys', 'Denver Broncos': 'Broncos',
  'Detroit Lions': 'Lions', 'Green Bay Packers': 'Packers',
  'Houston Texans': 'Texans', 'Indianapolis Colts': 'Colts',
  'Jacksonville Jaguars': 'Jaguars', 'Kansas City Chiefs': 'Chiefs',
  'Las Vegas Raiders': 'Raiders', 'Oakland Raiders': 'Raiders',
  'Los Angeles Chargers': 'Chargers', 'San Diego Chargers': 'Chargers',
  'Los Angeles Rams': 'Rams', 'St. Louis Rams': 'Rams',
  'Miami Dolphins': 'Dolphins', 'Minnesota Vikings': 'Vikings',
  'New England Patriots': 'Patriots', 'New Orleans Saints': 'Saints',
  'New York Giants': 'Giants', 'New York Jets': 'Jets',
  'Philadelphia Eagles': 'Eagles', 'Pittsburgh Steelers': 'Steelers',
  'San Francisco 49ers': '49ers', 'Seattle Seahawks': 'Seahawks',
  'Tampa Bay Buccaneers': 'Buccaneers', 'Tennessee Titans': 'Titans',
  'Washington Commanders': 'Redskins', 'Washington Football Team': 'Redskins',
  'Washington Redskins': 'Redskins',
};

// ESPN team ID → short name used in game criteria
const ESPN_NFL_TEAM_IDS = {
  1: 'Falcons', 2: 'Bills', 3: 'Bears', 4: 'Bengals', 5: 'Browns',
  6: 'Cowboys', 7: 'Broncos', 8: 'Lions', 9: 'Packers', 10: 'Titans',
  11: 'Colts', 12: 'Chiefs', 13: 'Raiders', 14: 'Rams', 15: 'Dolphins',
  16: 'Vikings', 17: 'Patriots', 18: 'Saints', 19: 'Giants', 20: 'Jets',
  21: 'Eagles', 22: 'Cardinals', 23: 'Steelers', 24: 'Chargers', 25: '49ers',
  26: 'Seahawks', 27: 'Buccaneers', 28: 'Redskins', 29: 'Panthers', 30: 'Jaguars',
  33: 'Ravens', 34: 'Texans',
};

async function fetchNFL() {
  console.log('\n=== NFL ===');
  const byId = new Map(); // pid → { name, awards, teams, positions, awardTeams }

  const years = [];
  for (let y = 1990; y <= 2023; y++) years.push(y);

  // 1. Award winners — MVP, Super Bowl MVP, DPOY, Offensive ROY, All-Pro, Pro Bowl
  console.log(`  Fetching NFL season awards (${years.length} seasons)...`);
  let seasonsDone = 0;
  for (const year of years) {
    try {
      const d = await get(
        `${NFL_BASE}/seasons/${year}/awards?limit=50`,
        `nfl-season-awards-${year}`,
      );
      for (const awardItem of d.items ?? []) {
        const awardRef = awardItem.$ref;
        if (!awardRef) continue;
        const awardId = awardRef.split('/awards/')[1]?.split('?')[0];
        try {
          const ad = await get(awardRef, `nfl-season-award-${year}-${awardId}`);
          const ourAward = mapNFLAward(ad.name ?? '');
          if (!ourAward) continue;
          for (const winner of ad.winners ?? []) {
            const athleteRef = winner.athlete?.$ref;
            const teamRef = winner.team?.$ref;
            if (!athleteRef) continue;
            const pid = athleteRef.split('/athletes/')[1]?.split('?')[0];
            if (!pid) continue;
            const teamId = parseInt(teamRef?.split('/teams/')[1]?.split('?')[0] ?? '0');
            const teamName = ESPN_NFL_TEAM_IDS[teamId];
            if (!byId.has(pid)) {
              byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [], awardTeams: {} });
            }
            const p = byId.get(pid);
            p.awards.add(ourAward);
            if (teamName) {
              p.teams.add(teamName);
              if (!p.awardTeams[ourAward]) p.awardTeams[ourAward] = new Set();
              p.awardTeams[ourAward].add(teamName);
              if (['MVP', 'Super Bowl MVP', 'DPOY', 'Offensive ROY'].includes(ourAward)) {
                p.awards.add('Pro Bowl');
                p.awards.add('All-Pro');
                if (!p.awardTeams['Pro Bowl']) p.awardTeams['Pro Bowl'] = new Set();
                p.awardTeams['Pro Bowl'].add(teamName);
                if (!p.awardTeams['All-Pro']) p.awardTeams['All-Pro'] = new Set();
                p.awardTeams['All-Pro'].add(teamName);
              }
            }
          }
        } catch { /* skip individual award errors */ }
      }
      seasonsDone++;
    } catch (e) {
      console.warn(`  ⚠ NFL season ${year}: ${e.message}`);
    }
  }
  console.log(`  Processed ${seasonsDone} award seasons, ${byId.size} players so far`);

  // 2. Per-team stat leaders per season — returns actual historical data unlike the roster endpoint
  //    (seasons/{year}/teams/{teamId}/athletes ignores year and returns current roster)
  const ESPN_NFL_ALL_TEAM_IDS = Object.keys(ESPN_NFL_TEAM_IDS).map(Number);
  console.log(`  Discovering NFL players via per-team stat leaders (${ESPN_NFL_ALL_TEAM_IDS.length} teams × ${years.length} seasons)...`);
  let rostersDone = 0;
  for (const year of years) {
    for (const teamId of ESPN_NFL_ALL_TEAM_IDS) {
      try {
        const d = await get(
          `${NFL_BASE}/seasons/${year}/types/2/teams/${teamId}/leaders?limit=50`,
          `nfl-teamleaders-${year}-${teamId}`,
        );
        for (const cat of d.categories ?? []) {
          for (const leader of cat.leaders ?? []) {
            const athleteRef = leader.athlete?.$ref;
            if (!athleteRef) continue;
            const pid = athleteRef.split('/athletes/')[1]?.split('?')[0];
            if (!pid) continue;
            if (!byId.has(pid)) {
              byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [], awardTeams: {} });
            }
            const teamName = ESPN_NFL_TEAM_IDS[teamId];
            if (teamName) byId.get(pid).teams.add(teamName);
          }
        }
        rostersDone++;
      } catch { /* invalid season/team combo — silently skip */ }
    }
  }
  console.log(`  Team leaders discovery: ${rostersDone} valid team-seasons, ${byId.size} players total`);

  // 3. Stat leaders per season — top 25 in 10 key categories each year
  //    Gives us notable QBs, RBs, WRs, DBs, pass rushers beyond just award winners
  const STAT_CATS = [
    'passingYards', 'rushingYards', 'receivingYards',
    'totalTackles', 'sacks', 'interceptions',
    'passingTouchdowns', 'rushingTouchdowns', 'receptions', 'passesDefended',
  ];
  console.log(`  Fetching NFL stat leaders (${years.length} seasons × ${STAT_CATS.length} categories)...`);
  let statSeasonsDone = 0;
  for (const year of years) {
    try {
      const d = await get(
        `${NFL_BASE}/seasons/${year}/types/2/leaders`,
        `nfl-stat-leaders-${year}`,
      );
      for (const cat of d.categories ?? []) {
        if (!STAT_CATS.includes(cat.name)) continue;
        for (const leader of (cat.leaders ?? []).slice(0, 25)) {
          const athleteRef = leader.athlete?.$ref;
          const teamRef = leader.team?.$ref;
          if (!athleteRef) continue;
          const pid = athleteRef.split('/athletes/')[1]?.split('?')[0];
          if (!pid) continue;
          const teamId = parseInt(teamRef?.split('/teams/')[1]?.split('?')[0] ?? '0');
          const teamName = ESPN_NFL_TEAM_IDS[teamId];
          if (!byId.has(pid)) {
            byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [], awardTeams: {} });
          }
          if (teamName) byId.get(pid).teams.add(teamName);
        }
      }
      statSeasonsDone++;
    } catch (e) {
      console.warn(`  ⚠ NFL stat leaders ${year}: ${e.message}`);
    }
  }
  console.log(`  Stat leaders done (${statSeasonsDone} seasons), total unique players: ${byId.size}`);

  // 4. Bio enrichment — name, birthPlace.country, position for every player
  const players = [];
  let done = 0;
  for (const [pid, p] of byId) {
    done++;
    if (done % 100 === 0) console.log(`  Bio: ${done}/${byId.size}`);
    try {
      const d = await get(
        `${NFL_BASE}/athletes/${pid}`,
        `nfl-athlete-${pid}`,
      );
      const name = d.fullName ?? d.displayName ?? '';
      if (!name) continue;
      p.name = name;
      p.positions = [d.position?.abbreviation].filter(Boolean);
      for (const teamRef of d.teams ?? []) {
        const teamId = parseInt(teamRef.$ref?.split('/teams/')[1]?.split('?')[0] ?? '0');
        const teamName = ESPN_NFL_TEAM_IDS[teamId];
        if (teamName) p.teams.add(teamName);
      }
      players.push({
        id: slug(name),
        name,
        sport: 'nfl',
        teams: [...p.teams],
        awards: [...p.awards],
        awardTeams: Object.fromEntries(Object.entries(p.awardTeams).map(([k, v]) => [k, [...v]])),
        country: d.birthPlace?.country ?? 'USA',
        positions: p.positions,
      });
    } catch (e) {
      console.warn(`  ⚠ NFL athlete ${pid}: ${e.message}`);
    }
  }

  // Supplement: notable All-Pro/Pro Bowl players whose awards aren't in ESPN's awards API
  const NFL_AP_SUPPLEMENT = [
    // MIAMI DOLPHINS
    { name: 'Dan Marino',        team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Zach Thomas',       team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jason Taylor',      team: 'Dolphins',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Richmond Webb',     team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mark Clayton',      team: 'Dolphins',  awards: ['Pro Bowl'] },
    { name: 'Mark Duper',        team: 'Dolphins',  awards: ['Pro Bowl'] },
    { name: 'Bob Griese',        team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Larry Csonka',      team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Nick Buoniconti',   team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Larry Little',      team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Dwight Stephenson', team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Paul Warfield',     team: 'Dolphins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mercury Morris',    team: 'Dolphins',  awards: ['Pro Bowl'] },
    { name: 'Nat Moore',         team: 'Dolphins',  awards: ['Pro Bowl'] },
    { name: 'Jim Langer',        team: 'Dolphins',  awards: ['All-Pro'] },
    // BALTIMORE RAVENS
    { name: 'Ray Lewis',         team: 'Ravens',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Ed Reed',           team: 'Ravens',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Jonathan Ogden',    team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Terrell Suggs',     team: 'Ravens',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Haloti Ngata',      team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Marshal Yanda',     team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Peter Boulware',    team: 'Ravens',    awards: ['Pro Bowl'] },
    { name: 'Todd Heap',         team: 'Ravens',    awards: ['Pro Bowl'] },
    { name: 'Ray Rice',          team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jamal Lewis',       team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Derrick Mason',     team: 'Ravens',    awards: ['Pro Bowl'] },
    { name: 'Chris McAlister',   team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    // BUFFALO BILLS
    { name: 'Jim Kelly',         team: 'Bills',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Andre Reed',        team: 'Bills',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bruce Smith',       team: 'Bills',     awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Thurman Thomas',    team: 'Bills',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Cornelius Bennett', team: 'Bills',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Kent Hull',         team: 'Bills',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Howard Ballard',    team: 'Bills',     awards: ['Pro Bowl'] },
    { name: 'Darryl Talley',     team: 'Bills',     awards: ['Pro Bowl'] },
    // NEW ENGLAND PATRIOTS
    { name: 'Rob Gronkowski',    team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Vince Wilfork',     team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Darrelle Revis',    team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Randy Moss',        team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Wes Welker',        team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Logan Mankins',     team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Matt Light',        team: 'Patriots',  awards: ['Pro Bowl'] },
    { name: 'Richard Seymour',   team: 'Patriots',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mike Vrabel',       team: 'Patriots',  awards: ['Pro Bowl'] },
    { name: 'Tedy Bruschi',      team: 'Patriots',  awards: ['Pro Bowl'] },
    // DALLAS COWBOYS
    { name: 'Emmitt Smith',      team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Michael Irvin',     team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Troy Aikman',       team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Deion Sanders',     team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Larry Allen',       team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jay Novacek',       team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Darren Woodson',    team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Erik Williams',     team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mark Stepnoski',    team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Charles Haley',     team: 'Cowboys',   awards: ['All-Pro','Pro Bowl'] },
    // PITTSBURGH STEELERS
    { name: 'Jerome Bettis',     team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Troy Polamalu',     team: 'Steelers',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Alan Faneca',       team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Hines Ward',        team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'James Harrison',    team: 'Steelers',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Antonio Brown',     team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Carnell Lake',      team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Levon Kirkland',    team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Rod Woodson',       team: 'Steelers',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Greg Lloyd',        team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Dermontti Dawson',  team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    // SAN FRANCISCO 49ERS
    { name: 'Jerry Rice',        team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Steve Young',       team: '49ers',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Joe Montana',       team: '49ers',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Deion Sanders',     team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Patrick Willis',    team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Justin Smith',      team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Frank Gore',        team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Vernon Davis',      team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bryant Young',      team: '49ers',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Garrison Hearst',   team: '49ers',     awards: ['Pro Bowl'] },
    // GREEN BAY PACKERS
    { name: 'Brett Favre',       team: 'Packers',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Reggie White',      team: 'Packers',   awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Charles Woodson',   team: 'Packers',   awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Donald Driver',     team: 'Packers',   awards: ['Pro Bowl'] },
    { name: 'LeRoy Butler',      team: 'Packers',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Gilbert Brown',     team: 'Packers',   awards: ['Pro Bowl'] },
    { name: 'Antonio Freeman',   team: 'Packers',   awards: ['Pro Bowl'] },
    { name: 'Bubba Franks',      team: 'Packers',   awards: ['Pro Bowl'] },
    // DENVER BRONCOS
    { name: 'John Elway',        team: 'Broncos',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Shannon Sharpe',    team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Ed McCaffrey',      team: 'Broncos',   awards: ['Pro Bowl'] },
    { name: 'Tom Nalen',         team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Rod Smith',         team: 'Broncos',   awards: ['Pro Bowl'] },
    { name: 'Bill Romanowski',   team: 'Broncos',   awards: ['Pro Bowl'] },
    { name: 'Terrell Davis',     team: 'Broncos',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Karl Mecklenburg',  team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Von Miller',        team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Demaryius Thomas',  team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Champ Bailey',      team: 'Broncos',   awards: ['All-Pro','Pro Bowl'] },
    // NEW YORK GIANTS
    { name: 'Lawrence Taylor',   team: 'Giants',    awards: ['All-Pro','Pro Bowl','DPOY','MVP'] },
    { name: 'Michael Strahan',   team: 'Giants',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Eli Manning',       team: 'Giants',    awards: ['Pro Bowl'] },
    { name: 'Amani Toomer',      team: 'Giants',    awards: ['Pro Bowl'] },
    { name: 'Jeremy Shockey',    team: 'Giants',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Plaxico Burress',   team: 'Giants',    awards: ['Pro Bowl'] },
    { name: 'Tiki Barber',       team: 'Giants',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jessie Armstead',   team: 'Giants',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Osi Umenyiora',     team: 'Giants',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Justin Tuck',       team: 'Giants',    awards: ['All-Pro','Pro Bowl'] },
    // CHICAGO BEARS
    { name: 'Brian Urlacher',    team: 'Bears',     awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Mike Brown',        team: 'Bears',     awards: ['Pro Bowl'] },
    { name: 'Olin Kreutz',       team: 'Bears',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Tommie Harris',     team: 'Bears',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Lance Briggs',      team: 'Bears',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Devin Hester',      team: 'Bears',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Walter Payton',     team: 'Bears',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Mike Singletary',   team: 'Bears',     awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Richard Dent',      team: 'Bears',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jim McMahon',       team: 'Bears',     awards: ['Pro Bowl'] },
    // MINNESOTA VIKINGS
    { name: 'Cris Carter',       team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Randy Moss',        team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'John Randle',       team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Randall McDaniel',  team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Gary Zimmerman',    team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Daunte Culpepper',  team: 'Vikings',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mewelde Moore',     team: 'Vikings',   awards: ['Pro Bowl'] },
    { name: 'Adrian Peterson',   team: 'Vikings',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Chad Greenway',     team: 'Vikings',   awards: ['Pro Bowl'] },
    // KANSAS CITY CHIEFS
    { name: 'Patrick Mahomes',   team: 'Chiefs',    awards: ['All-Pro','Pro Bowl','MVP','Super Bowl MVP'] },
    { name: 'Travis Kelce',      team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Tyreek Hill',       team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Chris Jones',       team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Derrick Thomas',    team: 'Chiefs',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Will Shields',      team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Tony Gonzalez',     team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Priest Holmes',     team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jamaal Charles',    team: 'Chiefs',    awards: ['All-Pro','Pro Bowl'] },
    // SEATTLE SEAHAWKS
    { name: 'Marshawn Lynch',    team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Richard Sherman',   team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Earl Thomas',       team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Kam Chancellor',    team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Russell Wilson',    team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bobby Wagner',      team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Steve Largent',     team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Walter Jones',      team: 'Seahawks',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Cortez Kennedy',    team: 'Seahawks',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    // LOS ANGELES RAMS
    { name: 'Orlando Pace',      team: 'Rams',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Isaac Bruce',       team: 'Rams',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Torry Holt',        team: 'Rams',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Marshall Faulk',    team: 'Rams',      awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Kurt Warner',       team: 'Rams',      awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'London Fletcher',   team: 'Rams',      awards: ['Pro Bowl'] },
    { name: 'Aaron Donald',      team: 'Rams',      awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Cooper Kupp',       team: 'Rams',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jalen Ramsey',      team: 'Rams',      awards: ['All-Pro','Pro Bowl'] },
    // PHILADELPHIA EAGLES
    { name: 'Donovan McNabb',    team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Brian Westbrook',   team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Reggie White',      team: 'Eagles',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Seth Joyner',       team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Tra Thomas',        team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Fletcher Cox',      team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Lane Johnson',      team: 'Eagles',    awards: ['All-Pro','Pro Bowl'] },
    // INDIANAPOLIS COLTS
    { name: 'Peyton Manning',    team: 'Colts',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Marvin Harrison',   team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Reggie Wayne',      team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Dallas Clark',      team: 'Colts',     awards: ['Pro Bowl'] },
    { name: 'Dwight Freeney',    team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Robert Mathis',     team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jeff Saturday',     team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Tarik Glenn',       team: 'Colts',     awards: ['All-Pro','Pro Bowl'] },
    // NEW ORLEANS SAINTS
    { name: 'Drew Brees',        team: 'Saints',    awards: ['All-Pro','Pro Bowl','Super Bowl MVP'] },
    { name: 'Marques Colston',   team: 'Saints',    awards: ['Pro Bowl'] },
    { name: 'Jimmy Graham',      team: 'Saints',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Roman Harper',      team: 'Saints',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Will Smith',        team: 'Saints',    awards: ['Pro Bowl'] },
    // ATLANTA FALCONS
    { name: 'Matt Ryan',         team: 'Falcons',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Julio Jones',       team: 'Falcons',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Michael Turner',    team: 'Falcons',   awards: ['Pro Bowl'] },
    { name: 'Roddy White',       team: 'Falcons',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Warrick Dunn',      team: 'Falcons',   awards: ['Pro Bowl'] },
    { name: 'Jamal Anderson',    team: 'Falcons',   awards: ['Pro Bowl'] },
    { name: 'Tony Gonzalez',     team: 'Falcons',   awards: ['All-Pro','Pro Bowl'] },
    // CAROLINA PANTHERS
    { name: 'Steve Smith',       team: 'Panthers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jonathan Stewart',  team: 'Panthers',  awards: ['Pro Bowl'] },
    { name: 'Julius Peppers',    team: 'Panthers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Luke Kuechly',      team: 'Panthers',  awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Cam Newton',        team: 'Panthers',  awards: ['All-Pro','Pro Bowl','MVP','Offensive ROY'] },
    { name: 'Greg Olsen',        team: 'Panthers',  awards: ['All-Pro','Pro Bowl'] },
    // TAMPA BAY BUCCANEERS
    { name: 'Derrick Brooks',    team: 'Buccaneers',awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Warren Sapp',       team: 'Buccaneers',awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'Ronde Barber',      team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mike Alstott',      team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    { name: 'John Lynch',        team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mike Evans',        team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    { name: 'Rob Gronkowski',    team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    { name: 'Lavonte David',     team: 'Buccaneers',awards: ['All-Pro','Pro Bowl'] },
    // ARIZONA CARDINALS
    { name: 'Larry Fitzgerald',  team: 'Cardinals', awards: ['All-Pro','Pro Bowl'] },
    { name: 'Anquan Boldin',     team: 'Cardinals', awards: ['All-Pro','Pro Bowl'] },
    { name: 'Adrian Wilson',     team: 'Cardinals', awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bertrand Berry',    team: 'Cardinals', awards: ['Pro Bowl'] },
    { name: 'Kurt Warner',       team: 'Cardinals', awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Patrick Peterson',  team: 'Cardinals', awards: ['All-Pro','Pro Bowl'] },
    // CINCINNATI BENGALS
    { name: 'Chad Johnson',      team: 'Bengals',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'T.J. Houshmandzadeh', team: 'Bengals', awards: ['All-Pro','Pro Bowl'] },
    { name: 'Corey Dillon',      team: 'Bengals',   awards: ['Pro Bowl'] },
    { name: 'Willie Anderson',   team: 'Bengals',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Andrew Whitworth',  team: 'Bengals',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Joe Burrow',        team: 'Bengals',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Ja\'Marr Chase',    team: 'Bengals',   awards: ['All-Pro','Pro Bowl','Offensive ROY'] },
    { name: 'Tee Higgins',       team: 'Bengals',   awards: ['Pro Bowl'] },
    // CLEVELAND BROWNS
    { name: 'Joe Thomas',        team: 'Browns',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Josh Cribbs',       team: 'Browns',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Nick Chubb',        team: 'Browns',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Myles Garrett',     team: 'Browns',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Ozzie Newsome',     team: 'Browns',    awards: ['All-Pro','Pro Bowl'] },
    // HOUSTON TEXANS
    { name: 'Andre Johnson',     team: 'Texans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Arian Foster',      team: 'Texans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'J.J. Watt',         team: 'Texans',    awards: ['All-Pro','Pro Bowl','DPOY'] },
    { name: 'DeAndre Hopkins',   team: 'Texans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Brian Cushing',     team: 'Texans',    awards: ['All-Pro','Pro Bowl','Offensive ROY'] },
    // JACKSONVILLE JAGUARS
    { name: 'Fred Taylor',       team: 'Jaguars',   awards: ['Pro Bowl'] },
    { name: 'Mark Brunell',      team: 'Jaguars',   awards: ['Pro Bowl'] },
    { name: 'Tony Boselli',      team: 'Jaguars',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Jimmy Smith',       team: 'Jaguars',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Keenan McCardell',  team: 'Jaguars',   awards: ['Pro Bowl'] },
    { name: 'Kevin Hardy',       team: 'Jaguars',   awards: ['Pro Bowl'] },
    { name: 'Josh Allen',        team: 'Jaguars',   awards: ['All-Pro','Pro Bowl'] },
    // TENNESSEE TITANS
    { name: 'Steve McNair',      team: 'Titans',    awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Eddie George',      team: 'Titans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Derrick Henry',     team: 'Titans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bruce Matthews',    team: 'Titans',    awards: ['All-Pro','Pro Bowl'] },
    { name: 'Keith Bulluck',     team: 'Titans',    awards: ['Pro Bowl'] },
    // LAS VEGAS RAIDERS
    { name: 'Jerry Rice',        team: 'Raiders',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Charles Woodson',   team: 'Raiders',   awards: ['All-Pro','Pro Bowl','Offensive ROY'] },
    { name: 'Tim Brown',         team: 'Raiders',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Rich Gannon',       team: 'Raiders',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Howie Long',        team: 'Raiders',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Bo Jackson',        team: 'Raiders',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Marcus Allen',      team: 'Raiders',   awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Rod Woodson',       team: 'Raiders',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Sebastian Janikowski', team: 'Raiders', awards: ['Pro Bowl'] },
    // LOS ANGELES CHARGERS
    { name: 'LaDainian Tomlinson', team: 'Chargers', awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Philip Rivers',     team: 'Chargers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Antonio Gates',     team: 'Chargers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Keenan Allen',      team: 'Chargers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Junior Seau',       team: 'Chargers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Eric Weddle',       team: 'Chargers',  awards: ['All-Pro','Pro Bowl'] },
    // DETROIT LIONS
    { name: 'Calvin Johnson',    team: 'Lions',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Barry Sanders',     team: 'Lions',     awards: ['All-Pro','Pro Bowl','MVP'] },
    { name: 'Herman Moore',      team: 'Lions',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Lomas Brown',       team: 'Lions',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Chris Spielman',    team: 'Lions',     awards: ['All-Pro','Pro Bowl'] },
    { name: 'Amon-Ra St. Brown', team: 'Lions',     awards: ['All-Pro','Pro Bowl'] },
    // NEW YORK JETS
    { name: 'Wayne Chrebet',     team: 'Jets',      awards: ['Pro Bowl'] },
    { name: 'Curtis Martin',     team: 'Jets',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Keyshawn Johnson',  team: 'Jets',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Darrelle Revis',    team: 'Jets',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Nick Mangold',      team: 'Jets',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'D\'Brickashaw Ferguson', team: 'Jets', awards: ['Pro Bowl'] },
    { name: 'Mo Lewis',          team: 'Jets',      awards: ['All-Pro','Pro Bowl'] },
    { name: 'Marvin Jones',      team: 'Jets',      awards: ['Pro Bowl'] },
    // WASHINGTON COMMANDERS
    { name: 'Art Monk',          team: 'Redskins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Darrell Green',     team: 'Redskins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mark Rypien',       team: 'Redskins',  awards: ['All-Pro','Pro Bowl','Super Bowl MVP'] },
    { name: 'Dexter Manley',     team: 'Redskins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Ken Harvey',        team: 'Redskins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Clinton Portis',    team: 'Redskins',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Santana Moss',      team: 'Redskins',  awards: ['Pro Bowl'] },
    // GREEN BAY PACKERS (more)
    { name: 'Sterling Sharpe',   team: 'Packers',   awards: ['All-Pro','Pro Bowl'] },
    { name: 'Mark Chmura',       team: 'Packers',   awards: ['Pro Bowl'] },
    // BALTIMORE RAVENS (more)
    { name: 'Matt Birk',         team: 'Ravens',    awards: ['All-Pro','Pro Bowl'] },
    // PITTSBURGH STEELERS (more)
    { name: 'Ben Roethlisberger',team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
    { name: 'Le\'Veon Bell',     team: 'Steelers',  awards: ['All-Pro','Pro Bowl'] },
  ];

  for (const entry of NFL_AP_SUPPLEMENT) {
    const id = slug(entry.name);
    const existing = players.find(p => p.id === id);
    if (existing) {
      // Merge awards and awardTeams into existing player
      for (const award of entry.awards) {
        if (!existing.awards.includes(award)) existing.awards.push(award);
        if (!existing.awardTeams[award]) existing.awardTeams[award] = [];
        if (!existing.awardTeams[award].includes(entry.team)) existing.awardTeams[award].push(entry.team);
        if (!existing.teams.includes(entry.team)) existing.teams.push(entry.team);
      }
    } else {
      players.push({
        id,
        name: entry.name,
        sport: 'nfl',
        teams: [entry.team],
        awards: entry.awards,
        awardTeams: Object.fromEntries(entry.awards.map(a => [a, [entry.team]])),
        country: 'USA',
        positions: [],
      });
    }
  }

  return players;
}

function mapNFLAward(name) {
  const n = name.toLowerCase();
  // Check Super Bowl before generic MVP to avoid false match
  if (n.includes('super bowl') && (n.includes('mvp') || n.includes('most valuable'))) return 'Super Bowl MVP';
  if (n.includes('most valuable') || n.includes('nfl mvp') || n === 'mvp') return 'MVP';
  if (n.includes('defensive player') && n.includes('year')) return 'DPOY';
  if (n.includes('offensive rookie') || (n.includes('rookie') && n.includes('offensive'))) return 'Offensive ROY';
  if (n.includes('all-pro') || n.includes('all pro')) return 'All-Pro';
  if (n.includes('pro bowl')) return 'Pro Bowl';
  return null;
}

// ─── Soccer ───────────────────────────────────────────────────────────────────

const ESPN_SOC_BASE = 'https://sports.core.api.espn.com/v2/sports/soccer';

const ESPN_SOC_LEAGUES = {
  'eng.1': 'Premier League',
  'esp.1': 'La Liga',
  'ger.1': 'Bundesliga',
  'ita.1': 'Serie A',
  'fra.1': 'Ligue 1',
};

// Maps ESPN displayName → internal team name where they differ
const ESPN_SOC_TEAM_MAP = {
  // Premier League oddities
  'Tottenham Hotspur': 'Tottenham', 'Spurs': 'Tottenham',
  'Manchester City': 'Manchester City', 'Man City': 'Manchester City',
  'Manchester United': 'Manchester United', 'Man United': 'Manchester United',
  'West Ham United': 'West Ham',
  'Newcastle United': 'Newcastle',
  'Blackburn Rovers': 'Blackburn',
  'Leicester City': 'Leicester',
  'Leeds United': 'Leeds',
  'Wolverhampton Wanderers': 'Wolverhampton',
  'Birmingham City': 'Birmingham',
  'Stoke City': 'Stoke',
  'Wigan Athletic': 'Wigan',
  'Bolton Wanderers': 'Bolton',
  // La Liga
  'Atlético Madrid': 'Atletico Madrid',
  'Atletico de Madrid': 'Atletico Madrid',
  'Club Atletico de Madrid': 'Atletico Madrid',
  'Valencia CF': 'Valencia',
  'Sevilla FC': 'Sevilla',
  'Villarreal CF': 'Villarreal',
  'Deportivo de La Coruna': 'Deportivo',
  'RC Deportivo': 'Deportivo',
  'Deportivo La Coruña': 'Deportivo',
  'Málaga CF': 'Malaga', 'Malaga CF': 'Malaga',
  'RCD Espanyol': 'Espanyol',
  'RC Celta de Vigo': 'Celta Vigo', 'Celta Vigo': 'Celta Vigo',
  'Athletic Club': 'Athletic Bilbao',
  'Real Sociedad': 'Real Sociedad',
  'Real Zaragoza': 'Real Zaragoza',
  // Bundesliga
  'FC Bayern Munich': 'Bayern Munich', 'Bayern München': 'Bayern Munich',
  'Bayern Munich': 'Bayern Munich',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'FC Schalke 04': 'Schalke', 'Schalke 04': 'Schalke',
  'SV Werder Bremen': 'Werder Bremen',
  'Hamburger SV': 'Hamburg', 'HSV Hamburg': 'Hamburg',
  'Borussia Mönchengladbach': 'Borussia Mönchengladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt',
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  'VfL Wolfsburg': 'Wolfsburg',
  'RB Leipzig': 'RB Leipzig',
  '1. FC Köln': 'Cologne',
  // Serie A
  'AC Milan': 'Milan',
  'Internazionale': 'Inter Milan', 'FC Internazionale Milano': 'Inter Milan',
  'AS Roma': 'Roma',
  'SSC Napoli': 'Napoli',
  'ACF Fiorentina': 'Fiorentina',
  'SS Lazio': 'Lazio',
  'Parma Calcio 1913': 'Parma', 'Parma Calcio': 'Parma',
  'Atalanta BC': 'Atalanta',
  'Torino FC': 'Torino',
  'Udinese Calcio': 'Udinese',
  'UC Sampdoria': 'Sampdoria',
  'AC ChievoVerona': 'Chievo', 'ChievoVerona': 'Chievo',
  'Bologna FC 1909': 'Bologna',
  'Cagliari Calcio': 'Cagliari',
  // Ligue 1
  'Paris Saint-Germain': 'PSG', 'Paris Saint-Germain FC': 'PSG',
  'Olympique Lyonnais': 'Lyon',
  'AS Monaco FC': 'Monaco', 'AS Monaco': 'Monaco',
  'Olympique de Marseille': 'Marseille',
  'LOSC Lille': 'Lille',
  'OGC Nice': 'Nice',
  'Stade Rennais FC': 'Rennes', 'Stade Rennais': 'Rennes',
  'FC Girondins de Bordeaux': 'Bordeaux', 'Girondins de Bordeaux': 'Bordeaux',
  'AJ Auxerre': 'Auxerre',
  'RC Lens': 'Lens',
  'Montpellier HSC': 'Montpellier',
  'Toulouse FC': 'Toulouse',
  'Stade de Reims': 'Reims',
  // Dutch (Ajax is in criteria)
  'Ajax Amsterdam': 'Ajax',
};

function normalizeSoccerTeam(display) {
  return ESPN_SOC_TEAM_MAP[display] ?? display;
}

async function fetchSoccer() {
  console.log('\n=== Soccer (ESPN) ===');

  const byName = new Map();       // nameSlug → {name, country, positions, teams: Set, awards: Set}
  const athleteCache = new Map(); // athleteId → profile

  const YEARS = [];
  for (let y = 2003; y <= 2022; y++) YEARS.push(y);

  for (const [leagueCode, leagueName] of Object.entries(ESPN_SOC_LEAGUES)) {
    let yearCount = 0;
    for (const year of YEARS) {
      let teamsData;
      try {
        teamsData = await get(
          `${ESPN_SOC_BASE}/leagues/${leagueCode}/seasons/${year}/teams?limit=30`,
          `espn-soc-teams-${leagueCode}-${year}`,
        );
      } catch { continue; }

      if (!teamsData.items?.length) continue;
      yearCount++;

      for (const teamItem of teamsData.items) {
        const teamId = teamItem.$ref?.match(/teams\/(\d+)/)?.[1];
        if (!teamId) continue;

        let teamName;
        try {
          const teamData = await get(
            `${ESPN_SOC_BASE}/leagues/${leagueCode}/teams/${teamId}`,
            `espn-soc-team-${leagueCode}-${teamId}`,
          );
          teamName = normalizeSoccerTeam(teamData.displayName);
        } catch { continue; }

        let rosterData;
        try {
          rosterData = await get(
            `${ESPN_SOC_BASE}/leagues/${leagueCode}/seasons/${year}/teams/${teamId}/athletes?limit=60`,
            `espn-soc-roster-${leagueCode}-${year}-${teamId}`,
          );
        } catch { continue; }

        for (const playerItem of rosterData.items ?? []) {
          const athleteId = playerItem.$ref?.match(/athletes\/(\d+)/)?.[1];
          if (!athleteId) continue;

          if (!athleteCache.has(athleteId)) {
            try {
              const profile = await get(
                `${ESPN_SOC_BASE}/athletes/${athleteId}`,
                `espn-soc-athlete-${athleteId}`,
              );
              athleteCache.set(athleteId, {
                name: profile.displayName ?? '',
                country: profile.citizenship ?? profile.birthCountry ?? 'Unknown',
                position: mapSoccerPos(profile.position?.abbreviation),
              });
            } catch { continue; }
          }

          const profile = athleteCache.get(athleteId);
          if (!profile?.name) continue;

          const nameId = slug(profile.name);
          if (!byName.has(nameId)) {
            byName.set(nameId, {
              name: profile.name,
              country: profile.country,
              positions: profile.position ? [profile.position] : [],
              teams: new Set([teamName]),
              awards: new Set([leagueName]),
            });
          } else {
            byName.get(nameId).teams.add(teamName);
            byName.get(nameId).awards.add(leagueName);
          }
        }
      }
    }
    console.log(`  ${leagueName}: ${yearCount} seasons`);
  }

  console.log(`  ESPN athletes collected: ${byName.size}`);

  const players = [...byName.values()].map(p => ({
    id: slug(p.name),
    name: p.name,
    sport: 'soccer',
    teams: [...p.teams],
    awards: [...p.awards],
    awardTeams: {},
    country: mapSoccerNationality(p.country),
    positions: p.positions,
  }));

  // Historical players not in the API's free tier — broad supplement covering major leagues 1990-2020
  const supplement = [
    // ── SPAIN ──────────────────────────────────────────────────────────────────
    // ── SPAIN ──────────────────────────────────────────────────────────────────
    { name: 'Andrés Iniesta', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Xavi', country: 'Spain', teams: ['Barcelona', 'Al Sadd'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Carles Puyol', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Cesc Fàbregas', country: 'Spain', teams: ['Arsenal', 'Barcelona', 'Chelsea', 'Monaco'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Fernando Torres', country: 'Spain', teams: ['Atletico Madrid', 'Liverpool', 'Chelsea'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'David Villa', country: 'Spain', teams: ['Valencia', 'Barcelona', 'Atletico Madrid'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Xabi Alonso', country: 'Spain', teams: ['Real Sociedad', 'Liverpool', 'Real Madrid', 'Bayern Munich'], awards: ['Premier League', 'La Liga', 'Bundesliga'], positions: ['Midfielder'] },
    { name: 'Iker Casillas', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Goalkeeper'] },
    { name: 'Raúl', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'David Silva', country: 'Spain', teams: ['Valencia', 'Manchester City'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Juan Mata', country: 'Spain', teams: ['Valencia', 'Chelsea', 'Manchester United'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Pepe Reina', country: 'Spain', teams: ['Liverpool', 'Napoli'], awards: ['Premier League', 'Serie A'], positions: ['Goalkeeper'] },
    { name: 'Alvaro Morata', country: 'Spain', teams: ['Real Madrid', 'Juventus', 'Chelsea', 'Atletico Madrid'], awards: ['La Liga', 'Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Jordi Alba', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Sergio Busquets', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Gerard Piqué', country: 'Spain', teams: ['Manchester United', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    { name: 'Dani Carvajal', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Nacho Fernández', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Santi Cazorla', country: 'Spain', teams: ['Villarreal', 'Malaga', 'Arsenal'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Jesús Navas', country: 'Spain', teams: ['Sevilla', 'Manchester City'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Míchel Salgado', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Fernando Hierro', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Alfonso', country: 'Spain', teams: ['Real Betis'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Víctor Valdés', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Goalkeeper'] },
    { name: 'Albert Celades', country: 'Spain', teams: ['Barcelona', 'Real Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    // ── FRANCE ─────────────────────────────────────────────────────────────────
    { name: 'Zinedine Zidane', country: 'France', teams: ['Juventus', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Thierry Henry', country: 'France', teams: ['Arsenal', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Patrick Vieira', country: 'France', teams: ['Arsenal', 'Juventus', 'Inter Milan', 'Manchester City'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Robert Pirès', country: 'France', teams: ['Arsenal', 'Villarreal'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Lilian Thuram', country: 'France', teams: ['Parma', 'Juventus', 'Barcelona'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Marcel Desailly', country: 'France', teams: ['Milan', 'Chelsea'], awards: ['Premier League', 'Serie A'], positions: ['Defender'] },
    { name: 'Claude Makélélé', country: 'France', teams: ['Real Madrid', 'Chelsea'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Nicolas Anelka', country: 'France', teams: ['Arsenal', 'Real Madrid', 'Liverpool', 'Manchester City', 'Chelsea'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'William Gallas', country: 'France', teams: ['Chelsea', 'Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'David Trezeguet', country: 'France', teams: ['Monaco', 'Juventus'], awards: ['Ligue 1', 'Serie A'], positions: ['Forward'] },
    { name: 'Sylvain Wiltord', country: 'France', teams: ['Marseille', 'Arsenal', 'Lyon'], awards: ['Premier League', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Florent Malouda', country: 'France', teams: ['Lyon', 'Chelsea'], awards: ['Premier League', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Éric Abidal', country: 'France', teams: ['Lyon', 'Barcelona'], awards: ['La Liga', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Franck Ribéry', country: 'France', teams: ['Marseille', 'Bayern Munich'], awards: ['Bundesliga', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Samir Nasri', country: 'France', teams: ['Marseille', 'Arsenal', 'Manchester City'], awards: ['Premier League', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Gael Clichy', country: 'France', teams: ['Arsenal', 'Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Olivier Giroud', country: 'France', teams: ['Arsenal', 'Chelsea', 'Milan'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Bacary Sagna', country: 'France', teams: ['Arsenal', 'Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Emmanuel Petit', country: 'France', teams: ['Arsenal', 'Barcelona', 'Chelsea'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Ludovic Giuly', country: 'France', teams: ['Monaco', 'Barcelona', 'Roma'], awards: ['La Liga', 'Ligue 1', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Sidney Govou', country: 'France', teams: ['Lyon'], awards: ['Ligue 1'], positions: ['Forward'] },
    { name: 'Juninho', country: 'Brazil', teams: ['Lyon'], awards: ['Ligue 1'], positions: ['Midfielder'] },
    // ── BRAZIL ─────────────────────────────────────────────────────────────────
    { name: 'Ronaldinho', country: 'Brazil', teams: ['PSG', 'Barcelona', 'Milan'], awards: ['La Liga', 'Ligue 1', 'Serie A'], positions: ['Forward'] },
    { name: 'Ronaldo', country: 'Brazil', teams: ['Barcelona', 'Inter Milan', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Roberto Carlos', country: 'Brazil', teams: ['Inter Milan', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Cafu', country: 'Brazil', teams: ['Roma', 'Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Kaká', country: 'Brazil', teams: ['Milan', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Rivaldo', country: 'Brazil', teams: ['Barcelona', 'Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Adriano', country: 'Brazil', teams: ['Inter Milan'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Romário', country: 'Brazil', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Aldair', country: 'Brazil', teams: ['Roma'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Emerson', country: 'Brazil', teams: ['Roma', 'Juventus', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Thiago Silva', country: 'Brazil', teams: ['Milan', 'PSG', 'Chelsea'], awards: ['Serie A', 'Ligue 1', 'Premier League'], positions: ['Defender'] },
    { name: 'Dani Alves', country: 'Brazil', teams: ['Sevilla', 'Barcelona', 'Juventus', 'PSG'], awards: ['La Liga', 'Serie A', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Maicon', country: 'Brazil', teams: ['Inter Milan', 'Roma'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Lúcio', country: 'Brazil', teams: ['Bayer Leverkusen', 'Bayern Munich', 'Inter Milan'], awards: ['Bundesliga', 'Serie A'], positions: ['Defender'] },
    { name: 'Alex', country: 'Brazil', teams: ['Chelsea', 'PSG'], awards: ['Premier League', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Gilberto Silva', country: 'Brazil', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Anderson', country: 'Brazil', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Éder Militão', country: 'Brazil', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Pato', country: 'Brazil', teams: ['Milan', 'Chelsea'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Robinho', country: 'Brazil', teams: ['Real Madrid', 'Manchester City', 'Milan'], awards: ['La Liga', 'Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Hulk', country: 'Brazil', teams: ['Porto', 'Zenit'], awards: ['Primeira Liga'], positions: ['Forward'] },
    { name: 'Fred', country: 'Brazil', teams: ['Lyon', 'Manchester United'], awards: ['Ligue 1', 'Premier League'], positions: ['Forward'] },
    // ── PORTUGAL ───────────────────────────────────────────────────────────────
    { name: 'Luís Figo', country: 'Portugal', teams: ['Barcelona', 'Real Madrid', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Rui Costa', country: 'Portugal', teams: ['Fiorentina', 'Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Deco', country: 'Portugal', teams: ['Barcelona', 'Chelsea'], awards: ['La Liga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Nani', country: 'Portugal', teams: ['Manchester United', 'Sporting CP'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'João Moutinho', country: 'Portugal', teams: ['Porto', 'Monaco', 'Wolverhampton'], awards: ['Primeira Liga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Ricardo Carvalho', country: 'Portugal', teams: ['Porto', 'Chelsea', 'Real Madrid'], awards: ['Premier League', 'La Liga', 'Primeira Liga'], positions: ['Defender'] },
    { name: 'Simão Sabrosa', country: 'Portugal', teams: ['Barcelona', 'Atletico Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Hélder Postiga', country: 'Portugal', teams: ['Porto', 'Tottenham'], awards: ['Premier League', 'Primeira Liga'], positions: ['Forward'] },
    { name: 'Pepe', country: 'Portugal', teams: ['Porto', 'Real Madrid', 'Besiktas'], awards: ['La Liga', 'Primeira Liga'], positions: ['Defender'] },
    { name: 'Vítor Baía', country: 'Portugal', teams: ['Porto', 'Barcelona'], awards: ['La Liga', 'Primeira Liga'], positions: ['Goalkeeper'] },
    // ── NETHERLANDS ────────────────────────────────────────────────────────────
    { name: 'Arjen Robben', country: 'Netherlands', teams: ['Chelsea', 'Real Madrid', 'Bayern Munich'], awards: ['Premier League', 'La Liga', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Wesley Sneijder', country: 'Netherlands', teams: ['Ajax', 'Real Madrid', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Robin van Persie', country: 'Netherlands', teams: ['Arsenal', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Ruud van Nistelrooy', country: 'Netherlands', teams: ['Manchester United', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Edwin van der Sar', country: 'Netherlands', teams: ['Ajax', 'Manchester United'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Patrick Kluivert', country: 'Netherlands', teams: ['Ajax', 'Barcelona'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Dennis Bergkamp', country: 'Netherlands', teams: ['Ajax', 'Arsenal'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Marc Overmars', country: 'Netherlands', teams: ['Ajax', 'Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Clarence Seedorf', country: 'Netherlands', teams: ['Ajax', 'Real Madrid', 'Inter Milan', 'Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Edgar Davids', country: 'Netherlands', teams: ['Ajax', 'Juventus', 'Milan', 'Barcelona'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Phillip Cocu', country: 'Netherlands', teams: ['PSV', 'Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Frank de Boer', country: 'Netherlands', teams: ['Ajax', 'Barcelona'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Ronald de Boer', country: 'Netherlands', teams: ['Ajax', 'Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Giovanni van Bronckhorst', country: 'Netherlands', teams: ['Arsenal', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    { name: 'Jaap Stam', country: 'Netherlands', teams: ['Manchester United', 'Lazio', 'Milan'], awards: ['Premier League', 'Serie A'], positions: ['Defender'] },
    { name: 'Mark van Bommel', country: 'Netherlands', teams: ['PSV', 'Barcelona', 'Bayern Munich', 'Milan'], awards: ['La Liga', 'Bundesliga', 'Serie A'], positions: ['Midfielder'] },
    // ── GERMANY ────────────────────────────────────────────────────────────────
    { name: 'Oliver Kahn', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Goalkeeper'] },
    { name: 'Michael Ballack', country: 'Germany', teams: ['Bayern Munich', 'Chelsea'], awards: ['Premier League', 'Bundesliga'], positions: ['Midfielder'] },
    { name: 'Bastian Schweinsteiger', country: 'Germany', teams: ['Bayern Munich', 'Manchester United'], awards: ['Bundesliga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Philipp Lahm', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Miroslav Klose', country: 'Germany', teams: ['Werder Bremen', 'Bayern Munich', 'Lazio'], awards: ['Bundesliga', 'Serie A'], positions: ['Forward'] },
    { name: 'Per Mertesacker', country: 'Germany', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Mesut Özil', country: 'Germany', teams: ['Real Madrid', 'Arsenal'], awards: ['La Liga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Thomas Müller', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Jens Lehmann', country: 'Germany', teams: ['Borussia Dortmund', 'Arsenal'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Carsten Jancker', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Dietmar Hamann', country: 'Germany', teams: ['Liverpool', 'Manchester City'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Stefan Kießling', country: 'Germany', teams: ['Bayer Leverkusen'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Sami Khedira', country: 'Germany', teams: ['Real Madrid', 'Juventus'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Mats Hummels', country: 'Germany', teams: ['Borussia Dortmund', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Mario Götze', country: 'Germany', teams: ['Borussia Dortmund', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'André Schürrle', country: 'Germany', teams: ['Chelsea', 'Borussia Dortmund'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Lukas Podolski', country: 'Germany', teams: ['Arsenal', 'Inter Milan'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Kevin Großkreutz', country: 'Germany', teams: ['Borussia Dortmund'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Robert Lewandowski', country: 'Poland', teams: ['Borussia Dortmund', 'Bayern Munich', 'Barcelona'], awards: ['Bundesliga', 'La Liga'], positions: ['Forward'] },
    // ── ITALY ──────────────────────────────────────────────────────────────────
    { name: 'Francesco Totti', country: 'Italy', teams: ['Roma'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Alessandro Del Piero', country: 'Italy', teams: ['Juventus'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Gianluigi Buffon', country: 'Italy', teams: ['Juventus', 'PSG'], awards: ['Serie A', 'Ligue 1'], positions: ['Goalkeeper'] },
    { name: 'Andrea Pirlo', country: 'Italy', teams: ['Milan', 'Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Fabio Cannavaro', country: 'Italy', teams: ['Juventus', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Paolo Maldini', country: 'Italy', teams: ['Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Filippo Inzaghi', country: 'Italy', teams: ['Juventus', 'Milan'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Roberto Baggio', country: 'Italy', teams: ['Juventus', 'Milan', 'Inter Milan'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Alessandro Nesta', country: 'Italy', teams: ['Lazio', 'Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Gennaro Gattuso', country: 'Italy', teams: ['Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Clarence Seedorf', country: 'Netherlands', teams: ['Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Daniele De Rossi', country: 'Italy', teams: ['Roma'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Antonio Cassano', country: 'Italy', teams: ['Roma', 'Real Madrid', 'Milan'], awards: ['La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Christian Vieri', country: 'Italy', teams: ['Inter Milan', 'Lazio'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Gianluca Zambrotta', country: 'Italy', teams: ['Juventus', 'Barcelona', 'Milan'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Massimo Ambrosini', country: 'Italy', teams: ['Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Mauro Camoranesi', country: 'Italy', teams: ['Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Giorgio Chiellini', country: 'Italy', teams: ['Juventus'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Leonardo Bonucci', country: 'Italy', teams: ['Juventus', 'Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Claudio Marchisio', country: 'Italy', teams: ['Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Simone Perrotta', country: 'Italy', teams: ['Roma'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Antonio Conte', country: 'Italy', teams: ['Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Gianluca Vialli', country: 'Italy', teams: ['Juventus', 'Chelsea'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Demetrio Albertini', country: 'Italy', teams: ['Milan', 'Atletico Madrid'], awards: ['Serie A', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Ciro Ferrara', country: 'Italy', teams: ['Napoli', 'Juventus'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Marco Materazzi', country: 'Italy', teams: ['Inter Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Esteban Cambiasso', country: 'Argentina', teams: ['Real Madrid', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Walter Samuel', country: 'Argentina', teams: ['Roma', 'Real Madrid', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Javier Zanetti', country: 'Argentina', teams: ['Inter Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Dejan Stanković', country: 'Serbia', teams: ['Lazio', 'Inter Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    // ── ARGENTINA ──────────────────────────────────────────────────────────────
    { name: 'Gabriel Batistuta', country: 'Argentina', teams: ['Fiorentina', 'Roma'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Hernán Crespo', country: 'Argentina', teams: ['Lazio', 'Inter Milan', 'Chelsea', 'Milan'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Juan Sebastián Verón', country: 'Argentina', teams: ['Lazio', 'Manchester United', 'Chelsea', 'Inter Milan'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Carlos Tévez', country: 'Argentina', teams: ['West Ham', 'Manchester United', 'Manchester City', 'Juventus'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Diego Forlán', country: 'Uruguay', teams: ['Manchester United', 'Atletico Madrid', 'Inter Milan'], awards: ['Premier League', 'La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Sergio Agüero', country: 'Argentina', teams: ['Atletico Madrid', 'Manchester City'], awards: ['La Liga', 'Premier League'], positions: ['Forward'] },
    { name: 'Pablo Aimar', country: 'Argentina', teams: ['Valencia', 'Real Zaragoza'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Claudio Caniggia', country: 'Argentina', teams: ['Fiorentina', 'Juventus'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Mauricio Pochettino', country: 'Argentina', teams: ['PSG', 'Tottenham'], awards: ['Premier League', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Pablo Zabaleta', country: 'Argentina', teams: ['Espanyol', 'Manchester City'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    // ── ENGLAND ────────────────────────────────────────────────────────────────
    { name: 'David Beckham', country: 'England', teams: ['Manchester United', 'Real Madrid', 'Milan', 'PSG'], awards: ['Premier League', 'La Liga', 'Serie A', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Steven Gerrard', country: 'England', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Frank Lampard', country: 'England', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'John Terry', country: 'England', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Wayne Rooney', country: 'England', teams: ['Everton', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Michael Owen', country: 'England', teams: ['Liverpool', 'Real Madrid', 'Newcastle'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Rio Ferdinand', country: 'England', teams: ['Leeds', 'Manchester United'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Paul Scholes', country: 'England', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Sol Campbell', country: 'England', teams: ['Tottenham', 'Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Ashley Cole', country: 'England', teams: ['Arsenal', 'Chelsea'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Roy Keane', country: 'Republic of Ireland', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Ryan Giggs', country: 'Wales', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Peter Schmeichel', country: 'Denmark', teams: ['Manchester United', 'Manchester City'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Andy Cole', country: 'England', teams: ['Newcastle', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Dwight Yorke', country: 'Trinidad and Tobago', teams: ['Aston Villa', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Teddy Sheringham', country: 'England', teams: ['Tottenham', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Ole Gunnar Solskjaer', country: 'Norway', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Ronny Johnsen', country: 'Norway', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Gary Neville', country: 'England', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Phil Neville', country: 'England', teams: ['Manchester United', 'Everton'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Nicky Butt', country: 'England', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Mikael Silvestre', country: 'France', teams: ['Manchester United', 'Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Patrice Evra', country: 'France', teams: ['Manchester United', 'Juventus'], awards: ['Premier League', 'Serie A'], positions: ['Defender'] },
    { name: 'Nemanja Vidić', country: 'Serbia', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Ji-Sung Park', country: 'South Korea', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Michael Carrick', country: 'England', teams: ['West Ham', 'Tottenham', 'Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Dimitar Berbatov', country: 'Bulgaria', teams: ['Bayer Leverkusen', 'Tottenham', 'Manchester United'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Javier Hernández', country: 'Mexico', teams: ['Manchester United', 'Bayer Leverkusen', 'West Ham'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Robbie Fowler', country: 'England', teams: ['Liverpool', 'Manchester City'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Emile Heskey', country: 'England', teams: ['Leicester', 'Liverpool', 'Birmingham', 'Aston Villa'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Jamie Carragher', country: 'England', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Sami Hyypiä', country: 'Finland', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'John Arne Riise', country: 'Norway', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Luis García', country: 'Spain', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Peter Crouch', country: 'England', teams: ['Liverpool', 'Tottenham', 'Stoke'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Jermain Defoe', country: 'England', teams: ['Tottenham', 'West Ham', 'Sunderland'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Tim Cahill', country: 'Australia', teams: ['Everton'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Alan Shearer', country: 'England', teams: ['Blackburn', 'Newcastle'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Robbie Keane', country: 'Republic of Ireland', teams: ['Leeds', 'Liverpool', 'Tottenham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Chris Sutton', country: 'England', teams: ['Blackburn', 'Chelsea', 'Celtic'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Andrew Cole', country: 'England', teams: ['Blackburn', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Kevin Gallacher', country: 'Scotland', teams: ['Blackburn'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Damien Duff', country: 'Republic of Ireland', teams: ['Blackburn', 'Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Tugay', country: 'Turkey', teams: ['Blackburn'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Darren Anderton', country: 'England', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Teddy Sheringham', country: 'England', teams: ['Tottenham', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Luka Modrić', country: 'Croatia', teams: ['Tottenham', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Gareth Bale', country: 'Wales', teams: ['Southampton', 'Tottenham', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Aaron Lennon', country: 'England', teams: ['Tottenham', 'Everton'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Ledley King', country: 'England', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Michael Dawson', country: 'England', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Peter Schmeichel', country: 'Denmark', teams: ['Manchester City'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Emmanuel Adebayor', country: 'Togo', teams: ['Arsenal', 'Manchester City', 'Tottenham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Shaun Wright-Phillips', country: 'England', teams: ['Manchester City', 'Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Robinho', country: 'Brazil', teams: ['Manchester City'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Mario Balotelli', country: 'Italy', teams: ['Manchester City', 'Liverpool', 'Milan'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Aleksandar Kolarov', country: 'Serbia', teams: ['Manchester City', 'Roma'], awards: ['Premier League', 'Serie A'], positions: ['Defender'] },
    { name: 'Vincent Kompany', country: 'Belgium', teams: ['Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Martin Petrov', country: 'Bulgaria', teams: ['Manchester City'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Nicolas Bendtner', country: 'Denmark', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Gael Clichy', country: 'France', teams: ['Arsenal', 'Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Thomas Vermaelen', country: 'Belgium', teams: ['Ajax', 'Arsenal', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    { name: 'Tomas Rosický', country: 'Czech Republic', teams: ['Borussia Dortmund', 'Arsenal'], awards: ['Bundesliga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Mikel Arteta', country: 'Spain', teams: ['Everton', 'Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Alex Song', country: 'Cameroon', teams: ['Arsenal', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Andrey Arshavin', country: 'Russia', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Fredrik Ljungberg', country: 'Sweden', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Lauren', country: 'Cameroon', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Sylvain Wiltord', country: 'France', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Edu', country: 'Brazil', teams: ['Arsenal', 'Valencia'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'José Antonio Reyes', country: 'Spain', teams: ['Arsenal', 'Real Madrid', 'Sevilla'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Emmanuel Petit', country: 'France', teams: ['Arsenal', 'Barcelona', 'Chelsea'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Mikael Forssell', country: 'Finland', teams: ['Chelsea', 'Birmingham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Eiður Guðjohnsen', country: 'Iceland', teams: ['Chelsea', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Scott Parker', country: 'England', teams: ['Chelsea', 'Tottenham', 'West Ham'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Joe Cole', country: 'England', teams: ['Chelsea', 'West Ham', 'Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Michael Essien', country: 'Ghana', teams: ['Lyon', 'Chelsea', 'Real Madrid'], awards: ['Premier League', 'La Liga', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Paulo Ferreira', country: 'Portugal', teams: ['Porto', 'Chelsea'], awards: ['Premier League', 'Primeira Liga'], positions: ['Defender'] },
    { name: 'Ricardo Carvalho', country: 'Portugal', teams: ['Porto', 'Chelsea', 'Real Madrid'], awards: ['Premier League', 'La Liga', 'Primeira Liga'], positions: ['Defender'] },
    { name: 'Tal Ben Haim', country: 'Israel', teams: ['Bolton', 'Chelsea'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Yuri Zhirkov', country: 'Russia', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Duncan Ferguson', country: 'Scotland', teams: ['Everton', 'Newcastle'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Thomas Gravesen', country: 'Denmark', teams: ['Everton', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Mikel Arteta', country: 'Spain', teams: ['Everton', 'Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Sylvain Distin', country: 'France', teams: ['Newcastle', 'Manchester City', 'Everton'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Tony Hibbert', country: 'England', teams: ['Everton'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Andy Johnson', country: 'England', teams: ['Crystal Palace', 'Everton'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Marouane Fellaini', country: 'Belgium', teams: ['Everton', 'Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Gareth Barry', country: 'England', teams: ['Aston Villa', 'Manchester City', 'Everton'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Tim Howard', country: 'United States', teams: ['Manchester United', 'Everton'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Leighton Baines', country: 'England', teams: ['Everton'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Phil Jagielka', country: 'England', teams: ['Everton'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Nwankwo Kanu', country: 'Nigeria', teams: ['Ajax', 'Arsenal', 'West Brom', 'Portsmouth'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Niall Quinn', country: 'Republic of Ireland', teams: ['Manchester City', 'Sunderland'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'David James', country: 'England', teams: ['Liverpool', 'Aston Villa', 'Manchester City', 'Portsmouth'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Sébastien Squillaci', country: 'France', teams: ['Lyon', 'Sevilla', 'Arsenal'], awards: ['Premier League', 'La Liga', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Harry Kewell', country: 'Australia', teams: ['Leeds', 'Liverpool', 'Galatasaray'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Mark Viduka', country: 'Australia', teams: ['Leeds', 'Middlesbrough', 'Newcastle'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Lee Bowyer', country: 'England', teams: ['Leeds', 'West Ham', 'Newcastle'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Rio Ferdinand', country: 'England', teams: ['Leeds', 'Manchester United'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Alan Smith', country: 'England', teams: ['Leeds', 'Manchester United'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Jonathan Woodgate', country: 'England', teams: ['Leeds', 'Newcastle', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    // ── IVORY COAST / AFRICA ───────────────────────────────────────────────────
    { name: 'Didier Drogba', country: 'Ivory Coast', teams: ['Chelsea', 'Galatasaray'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Yaya Touré', country: 'Ivory Coast', teams: ['Barcelona', 'Manchester City'], awards: ['La Liga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Kolo Touré', country: 'Ivory Coast', teams: ['Arsenal', 'Manchester City', 'Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Samuel Eto\'o', country: 'Cameroon', teams: ['Barcelona', 'Inter Milan', 'Chelsea'], awards: ['La Liga', 'Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'El Hadji Diouf', country: 'Senegal', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Michael Essien', country: 'Ghana', teams: ['Chelsea', 'Lyon'], awards: ['Premier League', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Sulley Muntari', country: 'Ghana', teams: ['Portsmouth', 'Inter Milan', 'Milan'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Didier Zokora', country: 'Ivory Coast', teams: ['Tottenham', 'Sevilla'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Emmanuel Eboué', country: 'Ivory Coast', teams: ['Arsenal', 'Galatasaray'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Nwankwo Kanu', country: 'Nigeria', teams: ['Ajax', 'Arsenal', 'West Brom', 'Portsmouth'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Jay-Jay Okocha', country: 'Nigeria', teams: ['Bolton'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Celestine Babayaro', country: 'Nigeria', teams: ['Chelsea', 'Newcastle'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Finidi George', country: 'Nigeria', teams: ['Ajax', 'Real Betis'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Abedi Pelé', country: 'Ghana', teams: ['Marseille', 'Lyon'], awards: ['Ligue 1'], positions: ['Midfielder'] },
    { name: 'Moussa Sissoko', country: 'France', teams: ['Toulouse', 'Newcastle', 'Tottenham'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Bakary Sagna', country: 'France', teams: ['Arsenal', 'Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    // ── SWEDEN ─────────────────────────────────────────────────────────────────
    { name: 'Zlatan Ibrahimović', country: 'Sweden', teams: ['Ajax', 'Juventus', 'Inter Milan', 'Barcelona', 'Milan', 'PSG', 'Manchester United'], awards: ['La Liga', 'Serie A', 'Ligue 1', 'Premier League'], positions: ['Forward'] },
    { name: 'Fredrik Ljungberg', country: 'Sweden', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Henrik Larsson', country: 'Sweden', teams: ['Celtic', 'Barcelona'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Martin Dahlin', country: 'Sweden', teams: ['Borussia Mönchengladbach'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Olof Mellberg', country: 'Sweden', teams: ['Aston Villa', 'Juventus'], awards: ['Premier League', 'Serie A'], positions: ['Defender'] },
    { name: 'Tobias Linderoth', country: 'Sweden', teams: ['Everton', 'Galatasaray'], awards: ['Premier League'], positions: ['Midfielder'] },
    // ── CROATIA ────────────────────────────────────────────────────────────────
    { name: 'Ivan Rakitić', country: 'Croatia', teams: ['Sevilla', 'Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Luka Modrić', country: 'Croatia', teams: ['Tottenham', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Davor Šuker', country: 'Croatia', teams: ['Real Madrid', 'Arsenal'], awards: ['La Liga', 'Premier League'], positions: ['Forward'] },
    { name: 'Robert Prosinečki', country: 'Croatia', teams: ['Real Madrid', 'Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Slaven Bilić', country: 'Croatia', teams: ['Everton', 'West Ham'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Stipe Pletikosa', country: 'Croatia', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    // ── CZECH REPUBLIC / SLOVAKIA ──────────────────────────────────────────────
    { name: 'Pavel Nedvěd', country: 'Czech Republic', teams: ['Lazio', 'Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Tomáš Rosický', country: 'Czech Republic', teams: ['Borussia Dortmund', 'Arsenal'], awards: ['Bundesliga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Milan Baroš', country: 'Czech Republic', teams: ['Liverpool', 'Lyon'], awards: ['Premier League', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Jan Koller', country: 'Czech Republic', teams: ['Borussia Dortmund'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Vladimír Šmicer', country: 'Czech Republic', teams: ['Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Marek Hamšík', country: 'Slovakia', teams: ['Napoli'], awards: ['Serie A'], positions: ['Midfielder'] },
    // ── COLOMBIA / SOUTH AMERICA ───────────────────────────────────────────────
    { name: 'Falcao', country: 'Colombia', teams: ['Porto', 'Atletico Madrid', 'Monaco', 'Manchester United', 'Chelsea'], awards: ['La Liga', 'Premier League', 'Ligue 1'], positions: ['Forward'] },
    { name: 'James Rodríguez', country: 'Colombia', teams: ['Monaco', 'Real Madrid', 'Bayern Munich', 'Everton'], awards: ['La Liga', 'Bundesliga', 'Ligue 1', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Tino Asprilla', country: 'Colombia', teams: ['Parma', 'Newcastle'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Juan Cuadrado', country: 'Colombia', teams: ['Fiorentina', 'Chelsea', 'Juventus'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Víctor Ibarbo', country: 'Colombia', teams: ['Cagliari', 'Roma', 'Watford'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Freddy Rincón', country: 'Colombia', teams: ['Real Madrid', 'Corinthians'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Marcelo', country: 'Brazil', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Oscar', country: 'Brazil', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Felipe Luis', country: 'Brazil', teams: ['Atletico Madrid', 'Chelsea'], awards: ['La Liga', 'Premier League'], positions: ['Defender'] },
    { name: 'Roque Santa Cruz', country: 'Paraguay', teams: ['Bayern Munich', 'Blackburn', 'Manchester City'], awards: ['Bundesliga', 'Premier League'], positions: ['Forward'] },
    { name: 'Salvador Cabañas', country: 'Paraguay', teams: ['Club América'], awards: ['Liga MX'], positions: ['Forward'] },
    // ── BELGIUM ────────────────────────────────────────────────────────────────
    { name: 'Eden Hazard', country: 'Belgium', teams: ['Chelsea', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Vincent Kompany', country: 'Belgium', teams: ['Manchester City'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Luis Suárez', country: 'Uruguay', teams: ['Ajax', 'Liverpool', 'Barcelona', 'Atletico Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Marouane Fellaini', country: 'Belgium', teams: ['Everton', 'Manchester United'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Jan Vertonghen', country: 'Belgium', teams: ['Ajax', 'Tottenham', 'Benfica'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Toby Alderweireld', country: 'Belgium', teams: ['Ajax', 'Atletico Madrid', 'Tottenham'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    { name: 'Dries Mertens', country: 'Belgium', teams: ['Napoli'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Romelu Lukaku', country: 'Belgium', teams: ['Everton', 'Manchester United', 'Inter Milan', 'Chelsea'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    // ── TURKEY / EAST EUROPE ───────────────────────────────────────────────────
    { name: 'Hakan Şükür', country: 'Turkey', teams: ['Galatasaray', 'Inter Milan'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Rustu Reçber', country: 'Turkey', teams: ['Galatasaray', 'Barcelona'], awards: ['La Liga'], positions: ['Goalkeeper'] },
    { name: 'Gheorghe Hagi', country: 'Romania', teams: ['Real Madrid', 'Barcelona', 'Galatasaray'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Gheorghe Popescu', country: 'Romania', teams: ['Tottenham', 'Barcelona'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Sinisa Mihajlovic', country: 'Serbia', teams: ['Lazio', 'Inter Milan', 'Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Dejan Savičević', country: 'Montenegro', teams: ['Red Star Belgrade', 'Milan'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Predrag Mijatović', country: 'Montenegro', teams: ['Valencia', 'Real Madrid'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Boban', country: 'Croatia', teams: ['Milan', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Andriy Shevchenko', country: 'Ukraine', teams: ['Milan', 'Chelsea'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Oleksandr Shovkovskyi', country: 'Ukraine', teams: ['Dynamo Kyiv'], awards: [], positions: ['Goalkeeper'] },
    // ── RUSSIA / EASTERN EUROPE ────────────────────────────────────────────────
    { name: 'Andrey Arshavin', country: 'Russia', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Dmitri Alenichev', country: 'Russia', teams: ['Roma', 'Porto'], awards: ['Serie A', 'Primeira Liga'], positions: ['Midfielder'] },
    { name: 'Alexei Smertin', country: 'Russia', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Yuri Zhirkov', country: 'Russia', teams: ['Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Igor Shalimov', country: 'Russia', teams: ['Inter Milan', 'Napoli'], awards: ['Serie A'], positions: ['Midfielder'] },
    // ── DENMARK / SCANDINAVIA ──────────────────────────────────────────────────
    { name: 'Peter Schmeichel', country: 'Denmark', teams: ['Manchester United', 'Manchester City'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Thomas Helveg', country: 'Denmark', teams: ['Milan', 'Inter Milan'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Jon Dahl Tomasson', country: 'Denmark', teams: ['Newcastle', 'Milan'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Martin Jørgensen', country: 'Denmark', teams: ['Udinese'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Jesper Grønkjær', country: 'Denmark', teams: ['Chelsea', 'Birmingham'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'John Carew', country: 'Norway', teams: ['Valencia', 'Lyon', 'Aston Villa'], awards: ['La Liga', 'Ligue 1', 'Premier League'], positions: ['Forward'] },
    { name: 'Tore André Flo', country: 'Norway', teams: ['Chelsea', 'Rangers'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Steffen Iversen', country: 'Norway', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Forward'] },
    // ── MEXICO / NORTH AMERICA ─────────────────────────────────────────────────
    { name: 'Javier Hernández', country: 'Mexico', teams: ['Manchester United', 'Bayer Leverkusen', 'West Ham'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Pavel Pardo', country: 'Mexico', teams: ['VfB Stuttgart'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Claudio Reyna', country: 'United States', teams: ['Manchester City', 'Sunderland'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Tim Howard', country: 'United States', teams: ['Manchester United', 'Everton'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Brad Friedel', country: 'United States', teams: ['Liverpool', 'Blackburn', 'Aston Villa', 'Tottenham'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Landon Donovan', country: 'United States', teams: ['Everton'], awards: ['Premier League'], positions: ['Midfielder'] },
    // ── JAPAN / KOREA ──────────────────────────────────────────────────────────
    { name: 'Ji-Sung Park', country: 'South Korea', teams: ['Manchester United', 'PSV'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Hidetoshi Nakata', country: 'Japan', teams: ['Perugia', 'Roma', 'Parma', 'Bolton'], awards: ['Serie A', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Shunsuke Nakamura', country: 'Japan', teams: ['Celtic', 'Espanyol'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Junichi Inamoto', country: 'Japan', teams: ['Arsenal', 'West Brom'], awards: ['Premier League'], positions: ['Midfielder'] },
    // ── MODERN SUPERSTARS (not in free API tier) ───────────────────────────────
    { name: 'Lionel Messi', country: 'Argentina', teams: ['Barcelona', 'PSG', 'Inter Miami'], awards: ['La Liga', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Cristiano Ronaldo', country: 'Portugal', teams: ['Manchester United', 'Real Madrid', 'Juventus'], awards: ['Premier League', 'La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Neymar', country: 'Brazil', teams: ['Barcelona', 'PSG'], awards: ['La Liga', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Antoine Griezmann', country: 'France', teams: ['Atletico Madrid', 'Barcelona'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Karim Benzema', country: 'France', teams: ['Real Madrid', 'Lyon'], awards: ['La Liga', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Sergio Ramos', country: 'Spain', teams: ['Real Madrid', 'PSG', 'Sevilla'], awards: ['La Liga', 'Ligue 1'], positions: ['Defender'] },
    { name: 'Andrés Guardado', country: 'Mexico', teams: ['Deportivo', 'Valencia', 'Real Betis'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Ivan Perišić', country: 'Croatia', teams: ['Borussia Dortmund', 'Inter Milan', 'Tottenham', 'Bayern Munich'], awards: ['Bundesliga', 'Serie A', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Radamel Falcao', country: 'Colombia', teams: ['Porto', 'Atletico Madrid', 'Monaco', 'Manchester United', 'Chelsea'], awards: ['La Liga', 'Ligue 1', 'Premier League', 'Primeira Liga'], positions: ['Forward'] },
    { name: 'Diego Costa', country: 'Spain', teams: ['Atletico Madrid', 'Chelsea'], awards: ['La Liga', 'Premier League'], positions: ['Forward'] },
    { name: 'Angel Di Maria', country: 'Argentina', teams: ['Benfica', 'Real Madrid', 'Manchester United', 'PSG', 'Juventus'], awards: ['La Liga', 'Premier League', 'Ligue 1', 'Serie A', 'Primeira Liga'], positions: ['Midfielder'] },
    { name: 'Gonzalo Higuain', country: 'Argentina', teams: ['Real Madrid', 'Napoli', 'Juventus', 'Milan', 'Chelsea'], awards: ['La Liga', 'Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'David De Gea', country: 'Spain', teams: ['Manchester United'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Manuel Neuer', country: 'Germany', teams: ['Schalke', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Goalkeeper'] },
    { name: 'Toni Kroos', country: 'Germany', teams: ['Bayern Munich', 'Real Madrid'], awards: ['Bundesliga', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Isco', country: 'Spain', teams: ['Real Madrid', 'Malaga', 'Sevilla'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Raphael Varane', country: 'France', teams: ['Real Madrid', 'Manchester United'], awards: ['La Liga', 'Premier League'], positions: ['Defender'] },
    { name: 'Marcelo', country: 'Brazil', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Luka Modrić', country: 'Croatia', teams: ['Tottenham', 'Real Madrid'], awards: ['Premier League', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Casemiro', country: 'Brazil', teams: ['Real Madrid', 'Manchester United'], awards: ['La Liga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Paulo Dybala', country: 'Argentina', teams: ['Palermo', 'Juventus', 'Roma'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Ciro Immobile', country: 'Italy', teams: ['Torino', 'Borussia Dortmund', 'Lazio', 'Sevilla'], awards: ['Serie A', 'Bundesliga', 'La Liga'], positions: ['Forward'] },
    { name: 'Lorenzo Insigne', country: 'Italy', teams: ['Napoli'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Kevin De Bruyne', country: 'Belgium', teams: ['Chelsea', 'Wolfsburg', 'Manchester City'], awards: ['Premier League', 'Bundesliga'], positions: ['Midfielder'] },
    { name: 'Mo Salah', country: 'Egypt', teams: ['Chelsea', 'Roma', 'Liverpool'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Sadio Mané', country: 'Senegal', teams: ['Southampton', 'Liverpool', 'Bayern Munich'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Roberto Firmino', country: 'Brazil', teams: ['Hoffenheim', 'Liverpool'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Virgil van Dijk', country: 'Netherlands', teams: ['Celtic', 'Southampton', 'Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Alisson Becker', country: 'Brazil', teams: ['Roma', 'Liverpool'], awards: ['Premier League', 'Serie A'], positions: ['Goalkeeper'] },
    { name: 'Jordan Henderson', country: 'England', teams: ['Sunderland', 'Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Raheem Sterling', country: 'England', teams: ['Liverpool', 'Manchester City', 'Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Bernardo Silva', country: 'Portugal', teams: ['Monaco', 'Manchester City'], awards: ['Premier League', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Leroy Sané', country: 'Germany', teams: ['Schalke', 'Manchester City', 'Bayern Munich'], awards: ['Premier League', 'Bundesliga'], positions: ['Midfielder'] },
    { name: 'Harry Kane', country: 'England', teams: ['Tottenham', 'Bayern Munich'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Son Heung-min', country: 'South Korea', teams: ['Hamburg', 'Bayer Leverkusen', 'Tottenham'], awards: ['Premier League', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Dele Alli', country: 'England', teams: ['MK Dons', 'Tottenham', 'Everton'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Christian Eriksen', country: 'Denmark', teams: ['Ajax', 'Tottenham', 'Inter Milan', 'Manchester United'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'N\'Golo Kanté', country: 'France', teams: ['Leicester', 'Chelsea'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Riyad Mahrez', country: 'Algeria', teams: ['Leicester', 'Manchester City'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Jamie Vardy', country: 'England', teams: ['Leicester'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Alexis Sánchez', country: 'Chile', teams: ['Arsenal', 'Manchester United', 'Inter Milan'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Pierre-Emerick Aubameyang', country: 'Gabon', teams: ['Borussia Dortmund', 'Arsenal', 'Barcelona', 'Chelsea', 'Marseille'], awards: ['Bundesliga', 'Premier League', 'La Liga', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Robert Lewandowski', country: 'Poland', teams: ['Borussia Dortmund', 'Bayern Munich', 'Barcelona'], awards: ['Bundesliga', 'La Liga'], positions: ['Forward'] },
    { name: 'Thomas Müller', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Joshua Kimmich', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Leon Goretzka', country: 'Germany', teams: ['Schalke', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Kingsley Coman', country: 'France', teams: ['Juventus', 'Bayern Munich'], awards: ['Bundesliga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Serge Gnabry', country: 'Germany', teams: ['Arsenal', 'Werder Bremen', 'Bayern Munich'], awards: ['Premier League', 'Bundesliga'], positions: ['Midfielder'] },
    // ── REAL MADRID / BARCELONA ADDITIONAL ─────────────────────────────────────
    { name: 'Fernando Morientes', country: 'Spain', teams: ['Real Madrid', 'Monaco', 'Liverpool'], awards: ['La Liga', 'Premier League', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Guti', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Iván Campo', country: 'Spain', teams: ['Real Madrid', 'Bolton'], awards: ['La Liga', 'Premier League'], positions: ['Defender'] },
    { name: 'Iván Helguera', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Francisco Pavón', country: 'Spain', teams: ['Real Madrid', 'Juventus'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Rubén de la Red', country: 'Spain', teams: ['Real Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Luis Enrique', country: 'Spain', teams: ['Real Madrid', 'Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Pep Guardiola', country: 'Spain', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Hristo Stoichkov', country: 'Bulgaria', teams: ['Barcelona', 'Parma'], awards: ['La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Romário', country: 'Brazil', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Michael Laudrup', country: 'Denmark', teams: ['Juventus', 'Barcelona', 'Real Madrid'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Ronald Koeman', country: 'Netherlands', teams: ['Barcelona', 'Feyenoord'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Gheorge Popescu', country: 'Romania', teams: ['Barcelona'], awards: ['La Liga'], positions: ['Defender'] },
    { name: 'Luis Figo', country: 'Portugal', teams: ['Barcelona', 'Real Madrid', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    // ── LIGUE 1 / FRENCH LEAGUE ────────────────────────────────────────────────
    { name: 'David Trezeguet', country: 'France', teams: ['Monaco', 'Juventus'], awards: ['Ligue 1', 'Serie A'], positions: ['Forward'] },
    { name: 'Pauleta', country: 'Portugal', teams: ['PSG', 'Deportivo'], awards: ['Ligue 1', 'La Liga'], positions: ['Forward'] },
    { name: 'Pedro Miguel Pauleta', country: 'Portugal', teams: ['PSG'], awards: ['Ligue 1'], positions: ['Forward'] },
    { name: 'Jérémy Toulalan', country: 'France', teams: ['Lyon', 'Manchester City', 'Monaco'], awards: ['Ligue 1', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Kim Källström', country: 'Sweden', teams: ['Lyon', 'Arsenal'], awards: ['Ligue 1', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Rémi Garde', country: 'France', teams: ['Lyon', 'Arsenal'], awards: ['Ligue 1', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Sébastien Frey', country: 'France', teams: ['Inter Milan', 'Fiorentina'], awards: ['Serie A'], positions: ['Goalkeeper'] },
    { name: 'Shabani Nonda', country: 'DR Congo', teams: ['Monaco', 'Roma'], awards: ['Ligue 1', 'Serie A'], positions: ['Forward'] },
    // ── DEPORTIVO LA CORUÑA ────────────────────────────────────────────────────
    { name: 'Mauro Silva', country: 'Brazil', teams: ['Deportivo'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Juan Carlos Valerón', country: 'Spain', teams: ['Deportivo'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Lionel Scaloni', country: 'Argentina', teams: ['Deportivo', 'West Ham'], awards: ['La Liga', 'Premier League'], positions: ['Defender'] },
    { name: 'Noureddine Naybet', country: 'Morocco', teams: ['Deportivo', 'Tottenham'], awards: ['La Liga', 'Premier League'], positions: ['Defender'] },
    { name: 'Victor', country: 'Spain', teams: ['Deportivo'], awards: ['La Liga'], positions: ['Goalkeeper'] },
    { name: 'Fran', country: 'Spain', teams: ['Deportivo'], awards: ['La Liga'], positions: ['Midfielder'] },
    // ── SEVILLA / VALENCIA ─────────────────────────────────────────────────────
    { name: 'Frederic Kanouté', country: 'Mali', teams: ['West Ham', 'Tottenham', 'Sevilla'], awards: ['Premier League', 'La Liga'], positions: ['Forward'] },
    { name: 'Luis Fabiano', country: 'Brazil', teams: ['Sevilla'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'David Pizarro', country: 'Chile', teams: ['Inter Milan', 'Roma', 'Napoli'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Ruben Baraja', country: 'Spain', teams: ['Valencia'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'John Carew', country: 'Norway', teams: ['Valencia', 'Lyon', 'Aston Villa'], awards: ['La Liga', 'Ligue 1', 'Premier League'], positions: ['Forward'] },
    { name: 'Kily González', country: 'Argentina', teams: ['Valencia', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Roberto Ayala', country: 'Argentina', teams: ['Valencia', 'Inter Milan'], awards: ['La Liga', 'Serie A'], positions: ['Defender'] },
    { name: 'Santiago Cañizares', country: 'Spain', teams: ['Valencia', 'Real Madrid'], awards: ['La Liga'], positions: ['Goalkeeper'] },
    // ── ATLETICO MADRID ────────────────────────────────────────────────────────
    { name: 'Diego Simeone', country: 'Argentina', teams: ['Atletico Madrid'], awards: ['La Liga'], positions: ['Midfielder'] },
    { name: 'Kiko', country: 'Spain', teams: ['Atletico Madrid'], awards: ['La Liga'], positions: ['Forward'] },
    { name: 'Goran Pandev', country: 'North Macedonia', teams: ['Lazio', 'Inter Milan', 'Napoli'], awards: ['Serie A'], positions: ['Forward'] },
    // ── ADDITIONAL BUNDESLIGA ──────────────────────────────────────────────────
    { name: 'Giovane Élber', country: 'Brazil', teams: ['VfB Stuttgart', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Claudio Pizarro', country: 'Peru', teams: ['Bayern Munich', 'Chelsea', 'Werder Bremen'], awards: ['Bundesliga', 'Premier League'], positions: ['Forward'] },
    { name: 'Roy Makaay', country: 'Netherlands', teams: ['Deportivo', 'Bayern Munich'], awards: ['La Liga', 'Bundesliga'], positions: ['Forward'] },
    { name: 'Oliver Neuville', country: 'Germany', teams: ['Bayer Leverkusen', 'Borussia Mönchengladbach'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Fredi Bobic', country: 'Germany', teams: ['VfB Stuttgart', 'Borussia Dortmund'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Andreas Möller', country: 'Germany', teams: ['Juventus', 'Borussia Dortmund'], awards: ['Bundesliga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Karl-Heinz Riedle', country: 'Germany', teams: ['Borussia Dortmund', 'Liverpool'], awards: ['Bundesliga', 'Premier League'], positions: ['Forward'] },
    { name: 'Paulo Sousa', country: 'Portugal', teams: ['Borussia Dortmund', 'Juventus'], awards: ['Bundesliga', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Robert Kovač', country: 'Croatia', teams: ['Bayern Munich', 'Borussia Dortmund'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Owen Hargreaves', country: 'England', teams: ['Bayern Munich', 'Manchester United'], awards: ['Bundesliga', 'Premier League'], positions: ['Midfielder'] },
    { name: 'Willy Sagnol', country: 'France', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Bixente Lizarazu', country: 'France', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Hasan Salihamidžić', country: 'Bosnia and Herzegovina', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Zé Roberto', country: 'Brazil', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Lúcio', country: 'Brazil', teams: ['Bayern Munich', 'Inter Milan'], awards: ['Bundesliga', 'Serie A'], positions: ['Defender'] },
    { name: 'Mehmet Scholl', country: 'Germany', teams: ['Bayern Munich'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Thomas Linke', country: 'Germany', teams: ['Bayern Munich', 'Schalke'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Marcell Jansen', country: 'Germany', teams: ['Borussia Mönchengladbach', 'Hamburg'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Ivan Rakitić', country: 'Croatia', teams: ['Schalke', 'Sevilla', 'Barcelona'], awards: ['La Liga', 'Bundesliga'], positions: ['Midfielder'] },
    { name: 'Gerald Asamoah', country: 'Ghana', teams: ['Schalke'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Christian Pander', country: 'Germany', teams: ['Schalke'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Mladen Krstajić', country: 'Serbia', teams: ['Schalke'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Nico Kovač', country: 'Croatia', teams: ['Bayer Leverkusen', 'Hamburg'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Bernd Schneider', country: 'Germany', teams: ['Bayer Leverkusen'], awards: ['Bundesliga'], positions: ['Midfielder'] },
    { name: 'Ze Roberto', country: 'Brazil', teams: ['Bayer Leverkusen', 'Bayern Munich'], awards: ['Bundesliga'], positions: ['Defender'] },
    { name: 'Lúcio', country: 'Brazil', teams: ['Bayer Leverkusen', 'Bayern Munich', 'Inter Milan'], awards: ['Bundesliga', 'Serie A'], positions: ['Defender'] },
    // ── ADDITIONAL SERIE A ──────────────────────────────────────────────────────
    { name: 'Dino Baggio', country: 'Italy', teams: ['Juventus', 'Parma'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Gianfranco Zola', country: 'Italy', teams: ['Napoli', 'Parma', 'Chelsea'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Alain Boghossian', country: 'France', teams: ['Inter Milan', 'Juventus'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Hernán Crespo', country: 'Argentina', teams: ['Lazio', 'Inter Milan', 'Chelsea', 'Milan'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Igor Protti', country: 'Italy', teams: ['Bari', 'Lazio'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Marco Di Vaio', country: 'Italy', teams: ['Lazio', 'Valencia', 'Juventus'], awards: ['La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Vincenzo Montella', country: 'Italy', teams: ['Roma', 'Sampdoria', 'Fiorentina'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Antonio Cassano', country: 'Italy', teams: ['Roma', 'Real Madrid', 'Sampdoria', 'Milan'], awards: ['La Liga', 'Serie A'], positions: ['Forward'] },
    { name: 'Alberto Gilardino', country: 'Italy', teams: ['Parma', 'Milan', 'Fiorentina'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Giampaolo Pazzini', country: 'Italy', teams: ['Fiorentina', 'Sampdoria', 'Inter Milan', 'Milan'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Nicola Legrottaglie', country: 'Italy', teams: ['Chievo', 'Torino', 'Juventus'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Jonathan Zebina', country: 'France', teams: ['Roma', 'Juventus'], awards: ['Serie A'], positions: ['Defender'] },
    { name: 'Vikash Dhorasoo', country: 'France', teams: ['Lyon', 'Milan', 'PSG'], awards: ['Serie A', 'Ligue 1'], positions: ['Midfielder'] },
    { name: 'Sérgio Conceição', country: 'Portugal', teams: ['Lazio', 'Inter Milan', 'Parma'], awards: ['Serie A'], positions: ['Midfielder'] },
    { name: 'Obafemi Martins', country: 'Nigeria', teams: ['Inter Milan', 'Newcastle'], awards: ['Serie A', 'Premier League'], positions: ['Forward'] },
    { name: 'Fredi Bobic', country: 'Germany', teams: ['VfB Stuttgart', 'Borussia Dortmund'], awards: ['Bundesliga'], positions: ['Forward'] },
    { name: 'Arturo Vidal', country: 'Chile', teams: ['Juventus', 'Bayern Munich', 'Barcelona', 'Inter Milan'], awards: ['Serie A', 'Bundesliga', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Stephan El Shaarawy', country: 'Italy', teams: ['Milan', 'Roma', 'PSG'], awards: ['Serie A', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Mirko Vučinić', country: 'Montenegro', teams: ['Lecce', 'Roma', 'Juventus'], awards: ['Serie A'], positions: ['Forward'] },
    { name: 'Edinson Cavani', country: 'Uruguay', teams: ['Palermo', 'Napoli', 'PSG', 'Manchester United'], awards: ['Serie A', 'Ligue 1', 'Premier League'], positions: ['Forward'] },
    { name: 'Ezequiel Lavezzi', country: 'Argentina', teams: ['Napoli', 'PSG'], awards: ['Serie A', 'Ligue 1'], positions: ['Forward'] },
    { name: 'Diego', country: 'Brazil', teams: ['Werder Bremen', 'Wolfsburg', 'Atletico Madrid'], awards: ['Bundesliga', 'La Liga'], positions: ['Midfielder'] },
    { name: 'Emre', country: 'Turkey', teams: ['Inter Milan', 'Juventus', 'Newcastle', 'Liverpool'], awards: ['Serie A', 'Premier League'], positions: ['Midfielder'] },
    // ── ADDITIONAL PREMIER LEAGUE ──────────────────────────────────────────────
    { name: 'Dion Dublin', country: 'England', teams: ['Manchester United', 'Coventry', 'Aston Villa'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Les Ferdinand', country: 'England', teams: ['Newcastle', 'Tottenham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Ian Wright', country: 'England', teams: ['Arsenal', 'West Ham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Tony Adams', country: 'England', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Lee Dixon', country: 'England', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Nigel Winterburn', country: 'England', teams: ['Arsenal', 'West Ham'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Martin Keown', country: 'England', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Ray Parlour', country: 'England', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'David Platt', country: 'England', teams: ['Arsenal', 'Aston Villa', 'Juventus'], awards: ['Premier League', 'Serie A'], positions: ['Midfielder'] },
    { name: 'Chris Armstrong', country: 'England', teams: ['Tottenham'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Ruel Fox', country: 'England', teams: ['Newcastle', 'Tottenham'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Warren Barton', country: 'England', teams: ['Newcastle'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Darren Peacock', country: 'England', teams: ['Newcastle'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Steve Watson', country: 'England', teams: ['Newcastle'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Rob Lee', country: 'England', teams: ['Newcastle'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'David Ginola', country: 'France', teams: ['Newcastle', 'Tottenham', 'Aston Villa'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Faustino Asprilla', country: 'Colombia', teams: ['Newcastle', 'Parma'], awards: ['Premier League', 'Serie A'], positions: ['Forward'] },
    { name: 'Shay Given', country: 'Republic of Ireland', teams: ['Newcastle', 'Manchester City'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Nolberto Solano', country: 'Peru', teams: ['Newcastle', 'Aston Villa'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Craig Bellamy', country: 'Wales', teams: ['Newcastle', 'Liverpool', 'Manchester City'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Laurent Robert', country: 'France', teams: ['Newcastle'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Celestine Babayaro', country: 'Nigeria', teams: ['Newcastle', 'Chelsea'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Jonathan Woodgate', country: 'England', teams: ['Leeds', 'Newcastle', 'Real Madrid', 'Tottenham'], awards: ['Premier League', 'La Liga'], positions: ['Defender'] },
    { name: 'James Milner', country: 'England', teams: ['Leeds', 'Newcastle', 'Aston Villa', 'Manchester City', 'Liverpool'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Gareth Southgate', country: 'England', teams: ['Aston Villa', 'Middlesbrough'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Dion Dublin', country: 'England', teams: ['Aston Villa', 'Manchester United', 'Coventry'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Lee Hendrie', country: 'England', teams: ['Aston Villa'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Ugo Ehiogu', country: 'England', teams: ['Aston Villa', 'Middlesbrough'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Paul Merson', country: 'England', teams: ['Arsenal', 'Aston Villa', 'Middlesbrough'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Stan Collymore', country: 'England', teams: ['Nottm Forest', 'Liverpool', 'Aston Villa'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Mark Draper', country: 'England', teams: ['Aston Villa'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Stiliyan Petrov', country: 'Bulgaria', teams: ['Celtic', 'Aston Villa'], awards: ['Premier League'], positions: ['Midfielder'] },
    { name: 'Christian Benteke', country: 'Belgium', teams: ['Aston Villa', 'Liverpool'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Dennis Bergkamp', country: 'Netherlands', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Forward'] },
    { name: 'Matthew Upson', country: 'England', teams: ['Arsenal', 'Birmingham', 'West Ham'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Pascal Cygan', country: 'France', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Kolo Touré', country: 'Ivory Coast', teams: ['Arsenal', 'Manchester City', 'Liverpool'], awards: ['Premier League'], positions: ['Defender'] },
    { name: 'Jens Lehmann', country: 'Germany', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Goalkeeper'] },
    { name: 'Freddie Ljungberg', country: 'Sweden', teams: ['Arsenal'], awards: ['Premier League'], positions: ['Midfielder'] },
  ].map(p => ({
    id: slug(p.name),
    name: p.name,
    sport: 'soccer',
    teams: p.teams,
    awards: p.awards,
    awardTeams: {},
    country: p.country,
    positions: p.positions,
  }));

  // Merge supplement: add new players and enrich existing ones with supplement teams/awards
  const existingById = new Map(players.map(p => [p.id, p]));
  for (const p of supplement) {
    const id = slug(p.name);
    if (!existingById.has(id)) {
      const newPlayer = { ...p, id, sport: 'soccer', awardTeams: {} };
      players.push(newPlayer);
      existingById.set(id, newPlayer);
    } else {
      const existing = existingById.get(id);
      for (const team of p.teams) {
        if (!existing.teams.includes(team)) existing.teams.push(team);
      }
      for (const award of p.awards) {
        if (!existing.awards.includes(award)) existing.awards.push(award);
      }
    }
  }

  return players;
}

function mapSoccerPos(pos) {
  if (!pos) return null;
  const p = pos.toUpperCase();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER') return 'Goalkeeper';
  if (p === 'D' || p === 'DF' || p === 'CB' || p === 'LB' || p === 'RB' || p === 'DEFENCE') return 'Defender';
  if (p === 'M' || p === 'MF' || p === 'AM' || p === 'DM' || p === 'CM' || p === 'MIDFIELD') return 'Midfielder';
  if (p === 'F' || p === 'FW' || p === 'ST' || p === 'LW' || p === 'RW' || p === 'OFFENCE' || p === 'FORWARD' || p === 'ATTACKER') return 'Forward';
  return null;
}

function mapSoccerNationality(nat) {
  if (!nat) return 'Unknown';
  const norm = {
    'Czechia': 'Czech Republic',
    'Korea Republic': 'South Korea',
    'Korea, Republic of': 'South Korea',
    'United States': 'USA',
    'United States of America': 'USA',
    "Cote d'Ivoire": 'Ivory Coast',
    "Côte d'Ivoire": 'Ivory Coast',
    'Congo DR': 'DR Congo',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  };
  return norm[nat] ?? nat;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const FETCHERS = { mlb: fetchMLB, nhl: fetchNHL, nba: fetchNBA, nfl: fetchNFL, soccer: fetchSoccer };

const targets = process.argv.slice(2).filter(a => a in FETCHERS);
const toRun = targets.length > 0 ? targets : Object.keys(FETCHERS);

ensureDirs();
console.log(`Fetching: ${toRun.join(', ')}`);
console.log(`Cache: ${CACHE}`);
console.log(`Output: ${OUT}`);

for (const sport of toRun) {
  try {
    const players = await FETCHERS[sport]();
    if (players === null) {
      console.log(`  ↩ ${sport.toUpperCase()}: kept existing generated file`);
    } else {
      writeTS(sport, players);
    }
  } catch (e) {
    console.error(`\n✗ ${sport} fatal:`, e.message);
  }
}

console.log('\nDone.');
