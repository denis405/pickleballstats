import { describe, expect, it } from 'vitest'
import { applyFinishedMatchStats, getPlayerStats } from '../src/algorithms/statistics'
import type { MatchHistoryEntry, Player } from '../src/types/domain'

const players: Player[] = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  name: id.toUpperCase(),
  rating: 3,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  pointsScored: 0,
  pointsAgainst: 0,
  active: true,
  createdAt: new Date(0).toISOString()
}))

const match: MatchHistoryEntry = {
  id: 'h1',
  roundId: 'r1',
  teamAIds: ['a', 'b'],
  teamBIds: ['c', 'd'],
  scoreA: 11,
  scoreB: 7,
  winner: 'A',
  finishedAt: new Date(0).toISOString()
}

describe('statistics', () => {
  it('applies match results to all participating players', () => {
    const updated = applyFinishedMatchStats(players, match)
    const winner = updated.find((player) => player.id === 'a')
    const loser = updated.find((player) => player.id === 'c')

    expect(winner?.wins).toBe(1)
    expect(winner?.pointsScored).toBe(11)
    expect(loser?.losses).toBe(1)
    expect(loser?.pointsAgainst).toBe(11)
  })

  it('calculates leaderboard stats', () => {
    const updated = applyFinishedMatchStats(players, match)
    const stats = getPlayerStats(updated, [match])
    const player = stats.find((entry) => entry.id === 'a')

    expect(player?.winRate).toBe(100)
    expect(player?.pointDifferential).toBe(4)
    expect(player?.currentStreak).toBe(1)
  })
})
