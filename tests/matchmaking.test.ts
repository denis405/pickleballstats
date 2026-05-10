import { describe, expect, it } from 'vitest'
import { generateRound } from '../src/algorithms/matchmaking'
import type { Player } from '../src/types/domain'

function player(index: number, rating = 3): Player {
  return {
    id: `p${index}`,
    name: `Player ${index}`,
    rating,
    gamesPlayed: index % 2,
    wins: 0,
    losses: 0,
    pointsScored: 0,
    pointsAgainst: 0,
    active: true,
    createdAt: new Date(0).toISOString()
  }
}

describe('generateRound', () => {
  it('creates doubles matches and bye players', () => {
    const round = generateRound([1, 2, 3, 4, 5].map((id) => player(id)), [], 'doubles')

    expect(round.matches).toHaveLength(1)
    expect(round.matches[0].teamA).toHaveLength(2)
    expect(round.matches[0].teamB).toHaveLength(2)
    expect(round.byePlayerIds).toHaveLength(1)
  })

  it('creates singles matches', () => {
    const round = generateRound([1, 2, 3, 4].map((id) => player(id)), [], 'singles')

    expect(round.matches).toHaveLength(2)
    expect(round.matches[0].teamA).toHaveLength(1)
    expect(round.matches[0].teamB).toHaveLength(1)
  })
})
