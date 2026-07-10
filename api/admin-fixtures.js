// api/admin-fixtures.js — southscale-web serverless function
// Proxies fixture requests to bynapp.online model endpoints (no CORS)

const BYN = 'https://www.bynapp.online'

const COMPETITIONS = [
  { key: 'epl',           name: 'Premier League',       icon: '⚽', url: `${BYN}/api/football-model?competitionKey=epl` },
  { key: 'championship',  name: 'Championship',          icon: '⚽', url: `${BYN}/api/football-model?competitionKey=championship` },
  { key: 'league_one',    name: 'League One',            icon: '⚽', url: `${BYN}/api/football-model?competitionKey=league_one` },
  { key: 'league_two',    name: 'League Two',            icon: '⚽', url: `${BYN}/api/football-model?competitionKey=league_two` },
  { key: 'national_league', name: 'National League',     icon: '⚽', url: `${BYN}/api/football-model?competitionKey=national_league` },
  { key: 'laliga',        name: 'La Liga',              icon: '⚽', url: `${BYN}/api/football-model?competitionKey=laliga` },
  { key: 'ucl',           name: 'Champions League',     icon: '⚽', url: `${BYN}/api/football-model?competitionKey=ucl` },
  { key: 'fifa_wc',       name: 'FIFA WC 26',           icon: '⚽', url: `${BYN}/api/football-model?competitionKey=fifa_wc` },
  { key: 'euros',         name: 'Euros',                icon: '⚽', url: `${BYN}/api/football-model?competitionKey=euros` },
  { key: 'nations_champ', name: 'Nations Championship', icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=nations_champ` },
  { key: 'rugby_champ',   name: 'Rugby Championship',  icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=rugby_champ` },
  { key: 'six_nations',   name: 'Six Nations',          icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=six_nations` },
  { key: 'urc',           name: 'URC',                  icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=urc` },
  { key: 'prem_rugby',    name: 'Premiership Rugby',    icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=prem_rugby` },
  { key: 'super_rugby',   name: 'Super Rugby Pacific',  icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=super_rugby` },
  { key: 'rugby_wc',      name: 'Rugby World Cup',      icon: '🏉', url: `${BYN}/api/rugby-fixtures?competitionKey=rugby_wc` },
  { key: 'nfl',           name: 'NFL',                  icon: '🏈', url: `${BYN}/api/nfl-model?competitionKey=nfl` },
  { key: 'tennis',        name: 'Wimbledon',            icon: '🎾', url: `${BYN}/api/tennis-model?competitionKey=tennis` },
  { key: 'pga',           name: 'The Open',             icon: '⛳', url: `${BYN}/api/golf-model?competitionKey=pga` },
  { key: 'f1',            name: 'F1',                   icon: '🏎️', url: `${BYN}/api/f1-fixtures`, isF1: true },
]

async function fetchOne(comp) {
  try {
    const res = await fetch(comp.url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { key: comp.key, name: comp.name, icon: comp.icon, fixtures: [], nextFixtureDate: null, error: res.status }
    const data = await res.json()

    if (comp.isF1) {
      return {
        key: comp.key, name: comp.name, icon: comp.icon,
        fixtures: data.race ? [{ name: data.race.name, kickoff: data.race.date }] : [],
        nextFixtureDate: data.race?.date || null,
        nextFixtureName: data.race?.name || null,
      }
    }

    return {
      key: comp.key, name: comp.name, icon: comp.icon,
      fixtures: data.fixtures || [],
      nextFixtureDate: data.nextFixture || data.nextFixtureDate || data.seasonOpens || data.fixtures?.[0]?.kickoff || null,
      nextFixtureName: data.nextFixtureName || null,
    }
  } catch (err) {
    return { key: comp.key, name: comp.name, icon: comp.icon, fixtures: [], nextFixtureDate: null, error: err.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const results = await Promise.all(COMPETITIONS.map(fetchOne))
  return res.status(200).json({ competitions: results, fetchedAt: new Date().toISOString() })
}
