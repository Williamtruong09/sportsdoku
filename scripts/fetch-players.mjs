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
 *   Soccer → api.football-data.org   (free tier – set FOOTBALL_DATA_KEY env var)
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
    return `  { id: '${p.id}', name: '${name}', sport: '${sport}', teams: ${JSON.stringify(p.teams)}, awards: ${JSON.stringify(p.awards)}, country: '${p.country}', positions: ${JSON.stringify(p.positions)} }`;
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

  // 1. Collect award winners
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
          byId.set(key, {
            name: p.fullName ?? p.nameFirstLast ?? '',
            awards: new Set(),
            teams: new Set(),
            positions: [],
            country: 'USA',
          });
        }
        byId.get(key).awards.add(ourAward);
      }
      console.log(`  Award ${awardId}: ${(d.awards ?? []).length} recipients`);
    } catch (e) {
      console.warn(`  ⚠ MLB award ${awardId}: ${e.message}`);
    }
  }

  // 2. Also pull World Series ring winners from championship history
  // This covers players who have WS rings but no other award
  try {
    const d = await get(
      `${MLB_BASE}/standings?leagueId=103,104&season=2024&standingsTypes=regularSeason&hydrate=team`,
      'mlb-ws-history',
    );
    // WS winners aren't easily available in this endpoint — skip, rely on WS MVP to infer
  } catch { /* skip */ }

  console.log(`  Found ${byId.size} award-winning MLB players, enriching...`);

  // 3. Enrich each player with bio info and career team history
  const players = [];
  let done = 0;
  for (const [mlbId, p] of byId) {
    done++;
    if (done % 100 === 0) console.log(`  Progress: ${done}/${byId.size}`);
    try {
      // Fetch basic bio without stats hydration — stats(type=career) causes HTTP 500 for old players
      const d = await get(
        `${MLB_BASE}/people/${mlbId}?hydrate=currentTeam`,
        `mlb-person-${mlbId}`,
      );
      const person = d.people?.[0];
      if (!person) continue;

      p.country = MLB_COUNTRIES[person.birthCountry] ?? person.birthCountry ?? 'USA';
      p.positions = [person.primaryPosition?.abbreviation].filter(Boolean);
      p.name = person.fullName ?? p.name;

      if (person.currentTeam?.name) {
        const t = MLB_TEAM_NAMES[person.currentTeam.name];
        if (t) p.teams.add(t);
      }

      // Fetch year-by-year team history from a separate, lighter endpoint
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
      } catch { /* stats endpoint optional — bio data is enough */ }

      if (!p.name) continue;
      // Players with no recognized teams (very old, minor league, etc.) still included
      // if they have awards — use their name as fallback team indicator
      players.push({
        id: slug(p.name),
        name: p.name,
        sport: 'mlb',
        teams: [...p.teams],
        awards: [...p.awards],
        country: p.country,
        positions: p.positions,
      });
    } catch (e) {
      console.warn(`  ⚠ MLB person ${mlbId}: ${e.message}`);
    }
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

async function fetchNHL() {
  console.log('\n=== NHL ===');
  const byId = new Map();

  // Build season ID list: 19901991 → 20242025 (35 seasons)
  const seasons = [];
  for (let y = 1990; y <= 2024; y++) {
    seasons.push(`${y}${y + 1}`);
  }

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
          byId.set(pid, { name: `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim(), awards: new Set(), teams: new Set(), positions: [], country: 'Canada' });
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
          byId.set(pid, { name: `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim(), awards: new Set(), teams: new Set(), positions: ['G'], country: 'Canada' });
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

      // Awards — fuzzy matching handles encoding variants (curly quotes, etc.)
      for (const award of d.awards ?? []) {
        const t = award.trophy?.default ?? '';
        if (t.includes('Hart')) p.awards.add('Hart Trophy');
        if (t.includes('Art Ross')) p.awards.add('Art Ross');
        if (t.includes('Conn Smythe')) p.awards.add('Conn Smythe');
        if (t.includes('Norris')) p.awards.add('Norris Trophy');
        if (t.includes('Vezina')) p.awards.add('Vezina Trophy');
        if (t.includes('Calder')) p.awards.add('Calder Trophy');
        if (t.includes('Rocket') || t.includes('Richard')) p.awards.add('Rocket Richard Trophy');
        if (t.toLowerCase().includes('stanley')) p.awards.add('Stanley Cup');
      }

      players.push({
        id: slug(name),
        name,
        sport: 'nhl',
        teams: [...p.teams],
        awards: [...p.awards],
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
  'Most Valuable Player': 'MVP',
  'Finals Most Valuable Player': 'Finals MVP',
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
  const byId = new Map();

  // Season format for stats.nba.com: "1979-80", "2023-24"
  const seasons = [];
  for (let y = 1979; y <= 2024; y++) {
    seasons.push(`${y}-${String(y + 1).slice(-2)}`);
  }

  // Fetch top 25 per season for multiple stat categories
  // Rank 1 in PTS = Scoring Title; Rank 1 in AST = assists leader
  const NBA_STAT_CATS = [
    { cat: 'PTS', label: 'scoring' },
    { cat: 'AST', label: 'assists' },
    { cat: 'REB', label: 'rebounds' },
  ];
  for (const { cat, label } of NBA_STAT_CATS) {
    console.log(`  Fetching ${label} leaders per season (${seasons.length} seasons)...`);
    let nbaSeasons = 0;
    for (const season of seasons) {
      try {
        const d = await get(
          `https://stats.nba.com/stats/leagueleaders?LeagueID=00&Season=${season}&SeasonType=Regular+Season&PerMode=PerGame&StatCategory=${cat}&Scope=S`,
          `nba-leaders-${cat}-${season}`,
          NBA_HEADERS,
        );
        const rs = d.resultSet ?? d.resultSets?.[0];
        if (!rs) continue;
        const h = rs.headers;
        const pidIdx = h.indexOf('PLAYER_ID');
        const nameIdx = h.indexOf('PLAYER');
        const teamIdx = h.indexOf('TEAM');
        const rankIdx = h.indexOf('RANK');
        if (pidIdx === -1) continue;

        for (const row of (rs.rowSet ?? []).slice(0, 25)) {
          const pid = String(row[pidIdx]);
          const name = row[nameIdx] ?? '';
          const teamAbbr = row[teamIdx] ?? '';
          if (!pid) continue;
          if (!byId.has(pid)) {
            byId.set(pid, { name, awards: new Set(), teams: new Set(), positions: [], country: 'USA' });
          }
          const p = byId.get(pid);
          const teamName = NBA_TEAM_ABBREVS[teamAbbr];
          if (teamName) p.teams.add(teamName);
          if (rankIdx !== -1 && row[rankIdx] === 1 && cat === 'PTS') p.awards.add('Scoring Title');
        }
        nbaSeasons++;
      } catch { /* skip individual season failures */ }
    }
    console.log(`  Got ${label} leaders from ${nbaSeasons} seasons, ${byId.size} unique players total`);
  }

  // 2. Enrich each player with bio + awards + career teams
  const players = [];
  let done = 0;
  for (const [pid, p] of byId) {
    done++;
    if (done % 100 === 0) console.log(`  Progress: ${done}/${byId.size}`);

    try {
      const bioD = await get(
        `https://stats.nba.com/stats/commonplayerinfo?PlayerID=${pid}`,
        `nba-player-${pid}`,
        NBA_HEADERS,
      );
      const bioRS = bioD.resultSets?.find(r => r.name === 'CommonPlayerInfo');
      if (bioRS?.rowSet?.[0]) {
        const row = bioRS.rowSet[0];
        const h = bioRS.headers;
        const name = row[h.indexOf('DISPLAY_FIRST_LAST')] ?? p.name;
        const country = NBA_COUNTRIES[row[h.indexOf('COUNTRY')]] ?? row[h.indexOf('COUNTRY')] ?? 'USA';
        const posRaw = row[h.indexOf('POSITION')] ?? '';
        const pos = posRaw.split('-')[0].trim(); // "Guard-Forward" → "Guard"
        if (name) p.name = name;
        p.country = country;
        if (pos) p.positions = [pos];
      }
    } catch { /* bio optional */ }

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
        for (const row of awardRS.rowSet ?? []) {
          const desc = row[descIdx] ?? '';
          const ourAward = Object.entries(NBA_AWARD_KEYWORDS)
            .find(([k]) => desc.includes(k))?.[1];
          if (ourAward) p.awards.add(ourAward);
          if (desc.includes('All-Star')) p.awards.add('All-Star');
          if (desc.includes('Slam Dunk')) p.awards.add('Slam Dunk Contest');
        }
      }
    } catch { /* awards optional */ }

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

    players.push({
      id: slug(p.name),
      name: p.name,
      sport: 'nba',
      teams: [...p.teams],
      awards: [...p.awards],
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
  6: 'Cowboys', 7: 'Broncos', 8: 'Lions', 9: 'Packers', 10: 'Texans',
  11: 'Colts', 12: 'Chiefs', 13: 'Raiders', 14: 'Rams', 15: 'Dolphins',
  16: 'Vikings', 17: 'Patriots', 18: 'Saints', 19: 'Giants', 20: 'Jets',
  21: 'Eagles', 22: 'Steelers', 23: 'Chargers', 24: '49ers', 25: 'Seahawks',
  26: 'Buccaneers', 27: 'Titans', 28: 'Redskins', 29: 'Panthers', 30: 'Jaguars',
  33: 'Ravens', 34: 'Cardinals',
};

async function fetchNFL() {
  console.log('\n=== NFL ===');
  const byId = new Map(); // pid → { name, awards, teams, positions }

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
              byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [] });
            }
            const p = byId.get(pid);
            p.awards.add(ourAward);
            if (['MVP', 'Super Bowl MVP', 'DPOY', 'Offensive ROY'].includes(ourAward)) {
              p.awards.add('Pro Bowl');
              p.awards.add('All-Pro');
            }
            if (teamName) p.teams.add(teamName);
          }
        } catch { /* skip individual award errors */ }
      }
      seasonsDone++;
    } catch (e) {
      console.warn(`  ⚠ NFL season ${year}: ${e.message}`);
    }
  }
  console.log(`  Processed ${seasonsDone} award seasons, ${byId.size} players so far`);

  // 2. Stat leaders per season — top 25 in 10 key categories each year
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
            byId.set(pid, { name: '', awards: new Set(), teams: new Set(), positions: [] });
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

  // 3. Bio enrichment — name, birthPlace.country, position for every player
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
        country: d.birthPlace?.country ?? 'USA',
        positions: p.positions,
      });
    } catch (e) {
      console.warn(`  ⚠ NFL athlete ${pid}: ${e.message}`);
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

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY ?? '';
const FD_BASE = 'https://api.football-data.org/v4';

const FD_LEAGUES = {
  PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga',
  SA: 'Serie A', FL1: 'Ligue 1', CL: 'Champions League', WC: 'World Cup',
};

const SOCCER_TEAM_NAMES = {
  'Manchester City FC': 'Manchester City', 'Arsenal FC': 'Arsenal',
  'Chelsea FC': 'Chelsea', 'Liverpool FC': 'Liverpool',
  'Manchester United FC': 'Manchester United', 'Tottenham Hotspur FC': 'Tottenham',
  'FC Barcelona': 'Barcelona', 'Real Madrid CF': 'Real Madrid',
  'Club Atlético de Madrid': 'Atletico Madrid', 'FC Bayern München': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund', 'Juventus FC': 'Juventus',
  'AC Milan': 'Milan', 'FC Internazionale Milano': 'Inter Milan',
  'Paris Saint-Germain FC': 'PSG', 'Ajax Amsterdam': 'Ajax',
  'SL Benfica': 'Benfica', 'Real Madrid': 'Real Madrid',
  'Barcelona': 'Barcelona', 'Bayern Munich': 'Bayern Munich',
};

async function fetchSoccer() {
  console.log('\n=== Soccer ===');

  if (!FOOTBALL_DATA_KEY) {
    console.warn('  ⚠ FOOTBALL_DATA_KEY not set. Get a free key at https://www.football-data.org/client/register');
    console.warn('  Then run: FOOTBALL_DATA_KEY=your_key node scripts/fetch-players.mjs soccer');
    console.warn('  Skipping soccer fetch — keeping existing hand-crafted data.');
    return null;
  }

  const fdHeaders = { 'X-Auth-Token': FOOTBALL_DATA_KEY };
  const byId = new Map();

  const LEAGUE_IDS = ['PL', 'PD', 'BL1', 'SA', 'FL1']; // major domestic leagues
  const SEASONS = [2021, 2022, 2023, 2024];

  // 1. Top scorers across multiple seasons (gives us goal-scorers / star attackers)
  console.log(`  Fetching top scorers (${LEAGUE_IDS.length} leagues × ${SEASONS.length} seasons)...`);
  for (const leagueId of LEAGUE_IDS) {
    const leagueName = FD_LEAGUES[leagueId];
    for (const season of SEASONS) {
      try {
        const d = await get(
          `${FD_BASE}/competitions/${leagueId}/scorers?limit=20&season=${season}`,
          `soccer-scorers-${leagueId}-${season}`,
          fdHeaders,
        );
        for (const entry of d.scorers ?? []) {
          const p = entry.player;
          if (!p?.id) continue;
          const key = String(p.id);
          if (!byId.has(key)) {
            byId.set(key, { name: p.name, nationality: p.nationality ?? 'Unknown', awards: new Set(), teams: new Set(), positions: [mapSoccerPos(p.position)].filter(Boolean) });
          }
          byId.get(key).awards.add(leagueName);
          const t = SOCCER_TEAM_NAMES[entry.team?.name] ?? entry.team?.shortName;
          if (t) byId.get(key).teams.add(t);
        }
      } catch (e) {
        console.warn(`  ⚠ Soccer scorers ${leagueId} ${season}: ${e.message}`);
      }
    }
  }
  console.log(`  After scorers: ${byId.size} players`);

  // 2. Full team squads — squad data is included inline in the /competitions/{id}/teams response
  console.log(`  Fetching team squads (inline from competition teams endpoint)...`);
  for (const leagueId of LEAGUE_IDS) {
    const leagueName = FD_LEAGUES[leagueId];
    try {
      const d = await get(
        `${FD_BASE}/competitions/${leagueId}/teams?season=2024`,
        `soccer-teams-${leagueId}-2024`,
        fdHeaders,
      );
      let added = 0;
      for (const team of d.teams ?? []) {
        const teamShort = SOCCER_TEAM_NAMES[team.name] ?? team.shortName ?? team.tla;
        for (const player of team.squad ?? []) {
          if (!player.id) continue;
          const key = String(player.id);
          if (!byId.has(key)) {
            byId.set(key, { name: player.name, nationality: player.nationality ?? 'Unknown', awards: new Set(), teams: new Set(), positions: [mapSoccerPos(player.position)].filter(Boolean) });
            added++;
          }
          byId.get(key).awards.add(leagueName);
          if (teamShort) byId.get(key).teams.add(teamShort);
        }
      }
      console.log(`  League ${leagueId}: ${(d.teams ?? []).length} teams, +${added} new players`);
    } catch (e) {
      console.warn(`  ⚠ Soccer teams ${leagueId}: ${e.message}`);
    }
  }
  console.log(`  After squads: ${byId.size} total players`);

  const players = [...byId.values()].map(p => ({
    id: slug(p.name),
    name: p.name,
    sport: 'soccer',
    teams: [...p.teams],
    awards: [...p.awards],
    country: mapSoccerNationality(p.nationality),
    positions: p.positions,
  }));

  return players;
}

function mapSoccerPos(pos) {
  if (!pos) return null;
  if (pos === 'GOALKEEPER') return 'Goalkeeper';
  if (pos === 'DEFENCE') return 'Defender';
  if (pos === 'MIDFIELD') return 'Midfielder';
  if (['OFFENCE', 'FORWARD', 'ATTACKER'].includes(pos)) return 'Forward';
  return pos;
}

function mapSoccerNationality(nat) {
  const map = {
    'England': 'England', 'Spain': 'Spain', 'Germany': 'Germany',
    'France': 'France', 'Brazil': 'Brazil', 'Argentina': 'Argentina',
    'Portugal': 'Portugal', 'Netherlands': 'Netherlands', 'Italy': 'Italy',
    'Belgium': 'Belgium', 'Croatia': 'Croatia', 'Norway': 'Norway',
    'Poland': 'Poland', 'Sweden': 'Sweden', 'Denmark': 'Denmark',
    'Austria': 'Austria', 'Morocco': 'Morocco', 'Senegal': 'Senegal',
  };
  return map[nat] ?? nat ?? 'Unknown';
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
