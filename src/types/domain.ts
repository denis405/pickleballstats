export type MatchMode = 'doubles' | 'singles' | 'rotation'

export type Player = {
  id: string
  name: string
  rating: number
  gamesPlayed: number
  wins: number
  losses: number
  pointsScored: number
  pointsAgainst: number
  active: boolean
  createdAt: string
}

export type Match = {
  id: string
  roundId: string
  teamA: Player[]
  teamB: Player[]
  scoreA?: number
  scoreB?: number
  winner?: 'A' | 'B'
  status: 'pending' | 'finished'
}

export type Round = {
  id: string
  matches: Match[]
  createdAt: string
  completed: boolean
  byePlayerIds: string[]
}

export type MatchHistoryEntry = {
  id: string
  roundId: string
  teamAIds: string[]
  teamBIds: string[]
  scoreA: number
  scoreB: number
  winner: 'A' | 'B'
  finishedAt: string
}

export type AppState = {
  players: Player[]
  rounds: Round[]
  history: MatchHistoryEntry[]
  mode: MatchMode
  theme: 'light' | 'dark'
  selectedPlayerIds: string[]
}

export type LeaderboardMetric =
  | 'winRate'
  | 'rating'
  | 'wins'
  | 'activity'
  | 'pointDifferential'

export type PlayerStats = Player & {
  winRate: number
  pointDifferential: number
  averageMargin: number
  currentStreak: number
  longestStreak: number
}
