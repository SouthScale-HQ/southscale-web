// api/admin-fixtures.js — southscale-web serverless function
// Proxies fixture requests to bynapp.online model endpoints (no CORS)

const BYN = 'https://www.bynapp.online'

const COMPETITIONS = [
  // ── Active on BYN ──────────────────────────────────────────────────────────
  { key: 'epl',            name: 'Premier League',       icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=epl` },
  { key: 'championship',   name: 'Championship',          icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=championship` },
  { key: 'league_one',     name: 'League One',            icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=league_one` },
  { key: 'league_two',     name: 'League Two',            icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=league_two` },
  { key: 'national_league',name: 'National League',       icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=national_league` },
  { key: 'laliga',         name: 'La Liga',               icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=laliga` },
  { key: 'ucl',            name: 'Champions League',      icon: '⚽', active: true,  url: `${BYN}/api/football-model?competitionKey=ucl` },
  { key: 'nations_champ',  name: 'Nations Championship',  icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=nations_champ` },
  { key: 'rugby_champ',    name: 'Rugby Championship',    icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=rugby_champ` },
  { key: 'six_nations',    name: 'Six Nations',           icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=six_nations` },
  { key: 'urc',            name: 'URC',                   icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=urc` },
  { key: 'prem_rugby',     name: 'Premiership Rugby',     icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=prem_rugby` },
  { key: 'super_rugby',    name: 'Super Rugby Pacific',   icon: '🏉', active: true,  url: `${BYN}/api/rugby-fixtures?competitionKey=super_rugby` },
  { key: 'f1',             name: 'F1',                    icon: '🏎️', active: true,  url: `${BYN}/api/f1-fixtures`, isF1: true },
  // ── Not currently active on BYN ────────────────────────────────────────────
  { key: 'fifa_wc',        name: 'FIFA WC 26',            icon: '⚽', active: false, url: `${BYN}/api/football-model?competitionKey=fifa_wc` },
  { key: 'euros',          name: 'Euros',                 icon: '⚽', active: false, url: `${BYN}/api/football-model?competitionKey=euros` },
  { key: 'rugby_wc',       name: 'Rugby World Cup',       icon: '🏉', active: false, url: `${BYN}/api/rugby-fixtures?competitionKey=rugby_wc` },
  { key: 'nfl',            name: 'NFL',                   icon: '🏈', active: false, url: `${BYN}/api/nfl-model?competitionKey=nfl` },
  { key: 'tennis',         name: 'Wimbledon',             icon: '🎾', active: false, url: `${BYN}/api/tennis-model?competitionKey=tennis` },
  { key: 'pga',            name: 'The Open',              icon: '⛳', active: false, url: `${BYN}/api/golf-model?competitionKey=pga` },
  { key: 'nba',            name: 'NBA',                   icon: '🏀', active: false, url: null },
  { key: 'ipl',            name: 'IPL',                   icon: '🏏', active: false, url: null },
  { key: 'motogp',         name: 'MotoGP',                icon: '🏍️', active: false, url: null },
  { key: 'nascar',         name: 'NASCAR',                icon: '🏎️', active: false, url: null },
]

async function fetchOne(comp) {
  if (!comp.url) {
    return { key: comp.key, name: comp.name, icon: comp.icon, active: comp.active,
             fixtures: [], nextFixtureDate: null, nextFixtureName: 'No model yet' }
  }
  try {
    const res = await fetch(comp.url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { key: comp.key, name: comp.name, icon: comp.icon, active: comp.active, fixtures: [], nextFixtureDate: null, error: res.status }
    const data = await res.json()

    if (comp.isF1) {
      return {
        key: comp.key, name: comp.name, icon: comp.icon, active: comp.active,
        fixtures: data.race ? [{ name: data.race.name, kickoff: data.race.date }] : [],
        nextFixtureDate: data.race?.date || null,
        nextFixtureName: data.race?.name || null,
      }
    }

    return {
      key: comp.key, name: comp.name, icon: comp.icon, active: comp.active,
      fixtures: data.fixtures || [],
      nextFixtureDate: data.nextFixture || data.nextFixtureDate || data.seasonOpens || data.fixtures?.[0]?.kickoff || null,
      nextFixtureName: data.nextFixtureName || null,
    }
  } catch (err) {
    return { key: comp.key, name: comp.name, icon: comp.icon, active: comp.active, fixtures: [], nextFixtureDate: null, error: err.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const results = await Promise.all(COMPETITIONS.map(fetchOne))
  return res.status(200).json({ competitions: results, fetchedAt: new Date().toISOString() })
}
