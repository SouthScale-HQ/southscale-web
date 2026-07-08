// api/admin-stats.js — southscale-web serverless function
// Queries Supabase with service role key — never exposed to browser
// Protected by ADMIN_PASSWORD env var

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { password } = req.body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  async function query(sql) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    return res.json()
  }

  // Use direct table queries via PostgREST instead of raw SQL
  async function get(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
    })
    const count = r.headers.get('content-range')?.split('/')[1] || '0'
    const data = await r.json()
    return { data, count: parseInt(count) || (Array.isArray(data) ? data.length : 0) }
  }

  const now = new Date()
  const weekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  try {
    const [
      allProfiles,
      newThisWeek,
      newThisMonth,
      activeBettors,
      allBets,
      betsThisWeek,
      openRounds,
      settledThisWeek,
      unsettledOld,
      allGroups,
      allGroupMembers,
      allCompetitions,
      allWallets,
      adViews,
    ] = await Promise.all([
      get('profiles?select=id,created_at,country'),
      get(`profiles?created_at=gte.${weekAgo}&select=id`),
      get(`profiles?created_at=gte.${monthAgo}&select=id`),
      get(`bets?created_at=gte.${monthAgo}&select=user_id`),
      get('bets?select=id,stake,competition_id,created_at,settled'),
      get(`bets?created_at=gte.${weekAgo}&select=id,stake,competition_id`),
      get('betting_rounds?status=eq.open&select=id,competition_id,round_number,created_at'),
      get(`betting_rounds?status=eq.settled&updated_at=gte.${weekAgo}&select=id`),
      get(`bets?settled=eq.false&created_at=lte.${twoDaysAgo}&select=id,user_id,created_at,competition_id`),
      get('groups?select=id,name,status'),
      get('group_members?select=group_id,user_id'),
      get('competitions?select=id,key,name,active'),
      get('wallets?select=user_id,competition_id,balance'),
      get(`ad_views?created_at=gte.${weekAgo}&select=id,user_id`),
    ])

    // Active bettors = unique user IDs in bets in last 30 days
    const activeUserIds = new Set((activeBettors.data || []).map(b => b.user_id))

    // Per-competition stats
    const compStats = (allCompetitions.data || []).map(comp => {
      const compBets = (allBets.data || []).filter(b => b.competition_id === comp.id)
      const weekBets = (betsThisWeek.data || []).filter(b => b.competition_id === comp.id)
      const compWallets = (allWallets.data || []).filter(w => w.competition_id === comp.id)
      const avgStake = compBets.length ? Math.round(compBets.reduce((a, b) => a + (b.stake || 0), 0) / compBets.length) : 0
      const totalBalance = compWallets.reduce((a, w) => a + (w.balance || 0), 0)
      return {
        key: comp.key,
        name: comp.name,
        active: comp.active,
        totalBets: compBets.length,
        betsThisWeek: weekBets.length,
        avgStake,
        activeWallets: compWallets.length,
        totalBalance: Math.round(totalBalance),
      }
    }).filter(c => c.active).sort((a, b) => b.totalBets - a.totalBets)

    // League stats
    const memberCounts = {}
    ;(allGroupMembers.data || []).forEach(m => {
      memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1
    })
    const leagueStats = (allGroups.data || []).map(g => ({
      name: g.name,
      status: g.status,
      members: memberCounts[g.id] || 0,
    })).sort((a, b) => b.members - a.members)

    // Country breakdown
    const countryCounts = {}
    ;(allProfiles.data || []).forEach(p => {
      if (p.country) countryCounts[p.country] = (countryCounts[p.country] || 0) + 1
    })
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    return res.status(200).json({
      generatedAt: now.toISOString(),
      users: {
        total: allProfiles.count,
        newThisWeek: newThisWeek.count,
        newThisMonth: newThisMonth.count,
        activeLast30Days: activeUserIds.size,
        inactive: allProfiles.count - activeUserIds.size,
        topCountries,
      },
      bets: {
        total: allBets.count,
        thisWeek: betsThisWeek.count,
        avgStakeAllTime: allBets.count ? Math.round(
          (allBets.data || []).reduce((a, b) => a + (b.stake || 0), 0) / allBets.count
        ) : 0,
        settled: (allBets.data || []).filter(b => b.settled).length,
        unsettled: (allBets.data || []).filter(b => !b.settled).length,
      },
      competitions: compStats,
      rounds: {
        currentlyOpen: openRounds.count,
        openDetails: (openRounds.data || []).map(r => ({
          id: r.id,
          roundNumber: r.round_number,
          openSince: r.created_at,
        })),
        settledThisWeek: settledThisWeek.count,
      },
      health: {
        unsettledBetsOver48h: unsettledOld.count,
        unsettledDetails: (unsettledOld.data || []).slice(0, 10),
      },
      leagues: {
        total: allGroups.count,
        approved: (allGroups.data || []).filter(g => g.status === 'approved').length,
        pending: (allGroups.data || []).filter(g => g.status === 'pending').length,
        topLeagues: leagueStats.slice(0, 10),
      },
      engagement: {
        adViewsThisWeek: adViews.count,
        adViewUniqueUsers: new Set((adViews.data || []).map(a => a.user_id)).size,
      },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }
}
