import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState
} from 'react'
import { generateRound } from '../algorithms/matchmaking'
import { applyFinishedMatchStats } from '../algorithms/statistics'
import { loadState, saveState } from '../services/storage'
import type { AppState, Match, MatchHistoryEntry, MatchMode, Player } from '../types/domain'
import { createId } from '../utils/id'
import { clampRating, sanitizeName } from '../utils/sanitize'

type AppAction =
  | { type: 'replace'; state: AppState }
  | { type: 'addPlayer'; name: string; rating: number }
  | { type: 'bulkAddPlayers'; names: string }
  | { type: 'updatePlayer'; playerId: string; updates: Partial<Pick<Player, 'name' | 'rating' | 'active'>> }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'toggleSelected'; playerId: string }
  | { type: 'selectAllActive' }
  | { type: 'setMode'; mode: MatchMode }
  | { type: 'setTheme'; theme: AppState['theme'] }
  | { type: 'generateRound' }
  | { type: 'setScore'; matchId: string; side: 'A' | 'B'; score: number }
  | { type: 'finishMatch'; matchId: string }
  | { type: 'swapPlayer'; matchId: string; fromPlayerId: string; toPlayerId: string }

type HistoryState = {
  present: AppState
  past: AppState[]
  future: AppState[]
}

type AppContextValue = {
  state: AppState
  ready: boolean
  canUndo: boolean
  canRedo: boolean
  dispatch: (action: AppAction) => void
  undo: () => void
  redo: () => void
  exportData: () => string
  importData: (value: string) => boolean
}

const initialState: AppState = {
  players: [],
  rounds: [],
  history: [],
  mode: 'doubles',
  theme: 'light',
  selectedPlayerIds: []
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false)
  const [historyState, dispatchBase] = useReducer(historyReducer, {
    present: initialState,
    past: [],
    future: []
  })

  useEffect(() => {
    loadState().then((saved) => {
      if (saved) {
        dispatchBase({ kind: 'commit', action: { type: 'replace', state: normalizeState(saved) } })
      }
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    void saveState(historyState.present)
    document.documentElement.dataset.theme = historyState.present.theme
  }, [historyState.present, ready])

  const dispatch = useCallback((action: AppAction) => {
    dispatchBase({ kind: 'commit', action })
  }, [])

  const undo = useCallback(() => dispatchBase({ kind: 'undo' }), [])
  const redo = useCallback(() => dispatchBase({ kind: 'redo' }), [])

  const value = useMemo<AppContextValue>(
    () => ({
      state: historyState.present,
      ready,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      dispatch,
      undo,
      redo,
      exportData: () => JSON.stringify(historyState.present, null, 2),
      importData: (raw: string) => {
        try {
          dispatch({ type: 'replace', state: normalizeState(JSON.parse(raw) as AppState) })
          return true
        } catch {
          return false
        }
      }
    }),
    [dispatch, historyState.future.length, historyState.past.length, historyState.present, ready, redo, undo]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppStore(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider')
  }
  return context
}

function historyReducer(
  state: HistoryState,
  event: { kind: 'commit'; action: AppAction } | { kind: 'undo' } | { kind: 'redo' }
): HistoryState {
  if (event.kind === 'undo') {
    const previous = state.past[state.past.length - 1]
    if (!previous) return state
    return {
      present: previous,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future]
    }
  }

  if (event.kind === 'redo') {
    const next = state.future[0]
    if (!next) return state
    return {
      present: next,
      past: [...state.past, state.present].slice(-40),
      future: state.future.slice(1)
    }
  }

  const next = appReducer(state.present, event.action)
  if (next === state.present) return state

  return {
    present: next,
    past: [...state.past, state.present].slice(-40),
    future: []
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'replace':
      return action.state
    case 'addPlayer': {
      const name = sanitizeName(action.name)
      if (!name) return state
      const player = createPlayer(name, action.rating)
      return {
        ...state,
        players: [...state.players, player],
        selectedPlayerIds: [...state.selectedPlayerIds, player.id]
      }
    }
    case 'bulkAddPlayers': {
      const existingNames = new Set(state.players.map((player) => player.name.toLowerCase()))
      const players = action.names
        .split(/\n|,/)
        .map(sanitizeName)
        .filter((name) => name && !existingNames.has(name.toLowerCase()))
        .map((name) => createPlayer(name, 3))

      return {
        ...state,
        players: [...state.players, ...players],
        selectedPlayerIds: [...state.selectedPlayerIds, ...players.map((player) => player.id)]
      }
    }
    case 'updatePlayer':
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                ...action.updates,
                name: action.updates.name ? sanitizeName(action.updates.name) : player.name,
                rating:
                  action.updates.rating === undefined ? player.rating : clampRating(Number(action.updates.rating))
              }
            : player
        )
      }
    case 'removePlayer':
      return {
        ...state,
        players: state.players.filter((player) => player.id !== action.playerId),
        selectedPlayerIds: state.selectedPlayerIds.filter((id) => id !== action.playerId)
      }
    case 'toggleSelected':
      return {
        ...state,
        selectedPlayerIds: state.selectedPlayerIds.includes(action.playerId)
          ? state.selectedPlayerIds.filter((id) => id !== action.playerId)
          : [...state.selectedPlayerIds, action.playerId]
      }
    case 'selectAllActive':
      return {
        ...state,
        selectedPlayerIds: state.players.filter((player) => player.active).map((player) => player.id)
      }
    case 'setMode':
      return { ...state, mode: action.mode }
    case 'setTheme':
      return { ...state, theme: action.theme }
    case 'generateRound': {
      const selected = state.players.map((player) => ({
        ...player,
        active: player.active && state.selectedPlayerIds.includes(player.id)
      }))
      const round = generateRound(selected, state.history, state.mode)
      return { ...state, rounds: [round, ...state.rounds] }
    }
    case 'setScore':
      return updateMatch(state, action.matchId, (match) => {
        if (match.status === 'finished') return match
        return {
          ...match,
          [action.side === 'A' ? 'scoreA' : 'scoreB']: Math.max(0, action.score),
          status: 'pending',
          winner: undefined
        }
      })
    case 'finishMatch':
      return finishMatch(state, action.matchId)
    case 'swapPlayer':
      return swapPlayer(state, action.matchId, action.fromPlayerId, action.toPlayerId)
    default:
      return state
  }
}

function createPlayer(name: string, rating: number): Player {
  return {
    id: createId('player'),
    name,
    rating: clampRating(rating),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointsScored: 0,
    pointsAgainst: 0,
    active: true,
    createdAt: new Date().toISOString()
  }
}

function updateMatch(state: AppState, matchId: string, updater: (match: Match) => Match): AppState {
  return {
    ...state,
    rounds: state.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => (match.id === matchId ? updater(match) : match))
    }))
  }
}

function finishMatch(state: AppState, matchId: string): AppState {
  let finishedEntry: MatchHistoryEntry | null = null
  const rounds = state.rounds.map((round) => {
    const matches = round.matches.map((match) => {
      if (
        match.id !== matchId ||
        match.status === 'finished' ||
        match.scoreA === undefined ||
        match.scoreB === undefined ||
        match.scoreA === match.scoreB
      ) {
        return match
      }

      const winner = match.scoreA > match.scoreB ? 'A' : 'B'
      finishedEntry = {
        id: createId('history'),
        roundId: round.id,
        teamAIds: match.teamA.map((player) => player.id),
        teamBIds: match.teamB.map((player) => player.id),
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        winner,
        finishedAt: new Date().toISOString()
      }

      return { ...match, winner, status: 'finished' as const }
    })

    return { ...round, matches, completed: matches.every((match) => match.status === 'finished') }
  })

  if (!finishedEntry) return state

  return {
    ...state,
    rounds,
    history: [...state.history, finishedEntry],
    players: applyFinishedMatchStats(state.players, finishedEntry)
  }
}

function swapPlayer(state: AppState, matchId: string, fromPlayerId: string, toPlayerId: string): AppState {
  const replacement = state.players.find((player) => player.id === toPlayerId)
  if (!replacement) return state

  return updateMatch(state, matchId, (match) => {
    const fromPlayer = [...match.teamA, ...match.teamB].find((player) => player.id === fromPlayerId)
    const toPlayer = [...match.teamA, ...match.teamB].find((player) => player.id === toPlayerId)

    if (fromPlayer && toPlayer) {
      return {
        ...match,
        teamA: match.teamA.map((player) =>
          player.id === fromPlayerId ? toPlayer : player.id === toPlayerId ? fromPlayer : player
        ),
        teamB: match.teamB.map((player) =>
          player.id === fromPlayerId ? toPlayer : player.id === toPlayerId ? fromPlayer : player
        )
      }
    }

    return {
      ...match,
      teamA: match.teamA.map((player) => (player.id === fromPlayerId ? replacement : player)),
      teamB: match.teamB.map((player) => (player.id === fromPlayerId ? replacement : player))
    }
  })
}

function normalizeState(value: AppState): AppState {
  return {
    ...initialState,
    ...value,
    players: Array.isArray(value.players) ? value.players : [],
    rounds: Array.isArray(value.rounds) ? value.rounds : [],
    history: Array.isArray(value.history) ? value.history : [],
    selectedPlayerIds: Array.isArray(value.selectedPlayerIds) ? value.selectedPlayerIds : []
  }
}
