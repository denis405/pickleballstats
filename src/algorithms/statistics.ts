import type { MatchHistoryEntry, Player, PlayerStats } from '../types/domain'

export function applyFinishedMatchStats(
  players: Player[],
  match: MatchHistoryEntry
): Player[] {
  const winnerIds = match.winner === 'A' ? match.teamAIds : match.teamBIds
  const loserIds = match.winner === 'A' ? match.teamBIds : match.teamAIds

  return players.map((player) => {
    const onTeamA = match.teamAIds.includes(player.id)
    const onTeamB = match.teamBIds.includes(player.id)
    if (!onTeamA && !onTeamB) return player

    const won = winnerIds.includes(player.id)
    const teamScore = onTeamA ? match.scoreA : match.scoreB
    const againstScore = onTeamA ? match.scoreB : match.scoreA
    const ratingDelta = won ? 0.08 + Math.max(0, againstScore - teamScore) * 0.01 : -0.06

    return {
      ...player,
      gamesPlayed: player.gamesPlayed + 1,
      wins: player.wins + (won ? 1 : 0),
      losses: player.losses + (loserIds.includes(player.id) ? 1 : 0),
      pointsScored: player.pointsScored + teamScore,
      pointsAgainst: player.pointsAgainst + againstScore,
      rating: Number(Math.max(1, Math.min(6, player.rating + ratingDelta)).toFixed(2))
    }
  })
}

export function getPlayerStats(players: Player[], history: MatchHistoryEntry[]): PlayerStats[] {
  return players.map((player) => {
    const playerMatches = history.filter(
      (match) => match.teamAIds.includes(player.id) || match.teamBIds.includes(player.id)
    )
    const streaks = calculateStreaks(player.id, playerMatches)

    return {
      ...player,
      winRate: player.gamesPlayed ? Math.round((player.wins / player.gamesPlayed) * 100) : 0,
      pointDifferential: player.pointsScored - player.pointsAgainst,
      averageMargin: player.gamesPlayed
        ? Number(((player.pointsScored - player.pointsAgainst) / player.gamesPlayed).toFixed(1))
        : 0,
      currentStreak: streaks.current,
      longestStreak: streaks.longest
    }
  })
}

export function getBestPartners(playerId: string, history: MatchHistoryEntry[]): Array<{ id: string; wins: number }> {
  const partners = new Map<string, number>()
  history.forEach((match) => {
    const teamIds = match.teamAIds.includes(playerId)
      ? match.teamAIds
      : match.teamBIds.includes(playerId)
        ? match.teamBIds
        : []
    const won =
      (match.winner === 'A' && match.teamAIds.includes(playerId)) ||
      (match.winner === 'B' && match.teamBIds.includes(playerId))
    if (!won) return
    teamIds.filter((id) => id !== playerId).forEach((id) => partners.set(id, (partners.get(id) ?? 0) + 1))
  })

  return [...partners.entries()]
    .map(([id, wins]) => ({ id, wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 3)
}

function calculateStreaks(playerId: string, matches: MatchHistoryEntry[]): { current: number; longest: number } {
  let current = 0
  let longest = 0
  let running = 0

  matches.forEach((match) => {
    const won =
      (match.winner === 'A' && match.teamAIds.includes(playerId)) ||
      (match.winner === 'B' && match.teamBIds.includes(playerId))

    running = won ? running + 1 : 0
    longest = Math.max(longest, running)
  })

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index]
    const won =
      (match.winner === 'A' && match.teamAIds.includes(playerId)) ||
      (match.winner === 'B' && match.teamBIds.includes(playerId))
    if (!won) break
    current += 1
  }

  return { current, longest }
}
