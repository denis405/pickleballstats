import type { Match, MatchHistoryEntry, MatchMode, Player, Round } from '../types/domain'
import { createId } from '../utils/id'

type Pairing = {
  matches: Match[]
  byePlayerIds: string[]
  score: number
}

type Team = {
  players: Player[]
  rating: number
}

export function generateRound(
  players: Player[],
  history: MatchHistoryEntry[],
  mode: MatchMode
): Round {
  const roundId = createId('round')
  const teamSize = mode === 'singles' ? 1 : 2
  const activePlayers = players
    .filter((player) => player.active)
    .sort((a, b) => a.gamesPlayed - b.gamesPlayed || b.rating - a.rating || a.name.localeCompare(b.name))

  const courtPlayerCount = teamSize * 2
  const matchCount = Math.floor(activePlayers.length / courtPlayerCount)
  const playableCount = matchCount * courtPlayerCount

  if (playableCount < courtPlayerCount) {
    return {
      id: roundId,
      matches: [],
      createdAt: new Date().toISOString(),
      completed: false,
      byePlayerIds: activePlayers.map((player) => player.id)
    }
  }

  const selected = activePlayers.slice(0, playableCount)
  const byePlayerIds = activePlayers.slice(playableCount).map((player) => player.id)
  const best = chooseBestPairing(selected, history, teamSize, roundId)

  return {
    id: roundId,
    matches: best.matches,
    createdAt: new Date().toISOString(),
    completed: false,
    byePlayerIds
  }
}

function chooseBestPairing(
  players: Player[],
  history: MatchHistoryEntry[],
  teamSize: number,
  roundId: string
): Pairing {
  const attempts = Math.min(240, Math.max(48, players.length * players.length * 4))
  let best: Pairing | null = null

  for (let index = 0; index < attempts; index += 1) {
    const shuffled = seededShuffle(players, `${roundId}-${index}`)
    const teams = buildTeams(shuffled, teamSize, history)
    const matches = pairTeams(teams, history, roundId)
    const score = matches.reduce((total, match) => total + scoreMatch(match, history), 0)
    const pairing = { matches, byePlayerIds: [], score }

    if (!best || pairing.score < best.score) {
      best = pairing
    }
  }

  return best ?? { matches: [], byePlayerIds: [], score: Number.POSITIVE_INFINITY }
}

function buildTeams(players: Player[], teamSize: number, history: MatchHistoryEntry[]): Team[] {
  if (teamSize === 1) {
    return players.map((player) => ({ players: [player], rating: player.rating }))
  }

  const remaining = [...players]
  const teams: Team[] = []

  while (remaining.length >= 2) {
    const anchor = remaining.shift()
    if (!anchor) break

    let bestIndex = 0
    let bestScore = Number.POSITIVE_INFINITY

    remaining.forEach((candidate, index) => {
      const score =
        partnerPenalty([anchor, candidate], history) * 8 +
        Math.abs(anchor.rating - candidate.rating) +
        Math.abs(anchor.gamesPlayed - candidate.gamesPlayed) * 1.5
      if (score < bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    const partner = remaining.splice(bestIndex, 1)[0]
    teams.push({ players: [anchor, partner], rating: anchor.rating + partner.rating })
  }

  return teams
}

function pairTeams(teams: Team[], history: MatchHistoryEntry[], roundId: string): Match[] {
  const remaining = [...teams].sort((a, b) => a.rating - b.rating)
  const matches: Match[] = []

  while (remaining.length >= 2) {
    const teamA = remaining.shift()
    if (!teamA) break

    let bestIndex = 0
    let bestScore = Number.POSITIVE_INFINITY

    remaining.forEach((teamB, index) => {
      const score =
        opponentPenalty(teamA.players, teamB.players, history) * 5 +
        Math.abs(teamA.rating - teamB.rating) +
        restPenalty([...teamA.players, ...teamB.players])
      if (score < bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    const teamB = remaining.splice(bestIndex, 1)[0]
    matches.push({
      id: createId('match'),
      roundId,
      teamA: teamA.players,
      teamB: teamB.players,
      status: 'pending'
    })
  }

  return matches
}

function scoreMatch(match: Match, history: MatchHistoryEntry[]): number {
  return (
    partnerPenalty(match.teamA, history) * 10 +
    partnerPenalty(match.teamB, history) * 10 +
    opponentPenalty(match.teamA, match.teamB, history) * 7 +
    Math.abs(teamRating(match.teamA) - teamRating(match.teamB)) +
    restPenalty([...match.teamA, ...match.teamB])
  )
}

function partnerPenalty(team: Player[], history: MatchHistoryEntry[]): number {
  if (team.length < 2) return 0
  return countSameSide(team[0].id, team[1].id, history)
}

function opponentPenalty(teamA: Player[], teamB: Player[], history: MatchHistoryEntry[]): number {
  return teamA.reduce(
    (total, a) => total + teamB.reduce((subtotal, b) => subtotal + countOpposite(a.id, b.id, history), 0),
    0
  )
}

function restPenalty(players: Player[]): number {
  const games = players.map((player) => player.gamesPlayed)
  return Math.max(...games) - Math.min(...games)
}

function countSameSide(a: string, b: string, history: MatchHistoryEntry[]): number {
  return history.filter(
    (match) =>
      (match.teamAIds.includes(a) && match.teamAIds.includes(b)) ||
      (match.teamBIds.includes(a) && match.teamBIds.includes(b))
  ).length
}

function countOpposite(a: string, b: string, history: MatchHistoryEntry[]): number {
  return history.filter(
    (match) =>
      (match.teamAIds.includes(a) && match.teamBIds.includes(b)) ||
      (match.teamBIds.includes(a) && match.teamAIds.includes(b))
  ).length
}

function teamRating(team: Player[]): number {
  return team.reduce((sum, player) => sum + player.rating, 0)
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items]
  let state = Array.from(seed).reduce((value, char) => value + char.charCodeAt(0), 0) || 1

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296
    const swapIndex = state % (index + 1)
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }

  return shuffled
}
