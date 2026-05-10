import { Play, UserCheck, Users } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { useAppStore } from '../store/appStore'

type DashboardPageProps = {
  goTo: (page: 'players' | 'rounds' | 'stats' | 'dashboard') => void
}

export function DashboardPage({ goTo }: DashboardPageProps) {
  const { state, dispatch } = useAppStore()
  const activeCount = state.players.filter((player) => player.active).length
  const selectedCount = state.selectedPlayerIds.length
  const currentRound = state.rounds[0]
  const pendingMatches = currentRound?.matches.filter((match) => match.status === 'pending').length ?? 0

  return (
    <section className="stack">
      <div className="quick-panel">
        <div>
          <p className="eyebrow">Court ready</p>
          <h2>Start the next round in two taps</h2>
        </div>
        <div className="quick-actions">
          <button onClick={() => dispatch({ type: 'selectAllActive' })}>
            <UserCheck size={20} />
            Select active
          </button>
          <button
            className="primary-action"
            onClick={() => {
              dispatch({ type: 'generateRound' })
              goTo('rounds')
            }}
            disabled={selectedCount < (state.mode === 'singles' ? 2 : 4)}
          >
            <Play size={20} />
            Generate round
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Active" value={activeCount} />
        <MetricCard label="Selected" value={selectedCount} tone="gold" />
        <MetricCard label="Pending" value={pendingMatches} tone="red" />
      </div>

      <div className="mode-tabs" role="tablist" aria-label="Match mode">
        {(['doubles', 'singles', 'rotation'] as const).map((mode) => (
          <button
            key={mode}
            className={state.mode === mode ? 'active' : ''}
            onClick={() => dispatch({ type: 'setMode', mode })}
          >
            {mode}
          </button>
        ))}
      </div>

      <section className="section-block">
        <div className="section-heading">
          <h2>Active players</h2>
          <button onClick={() => goTo('players')}>
            <Users size={18} />
            Manage
          </button>
        </div>
        <div className="chip-list">
          {state.players
            .filter((player) => state.selectedPlayerIds.includes(player.id))
            .slice(0, 12)
            .map((player) => (
              <span key={player.id}>{player.name}</span>
            ))}
          {selectedCount === 0 && <p className="empty-text">Add or select players to start.</p>}
        </div>
      </section>

      {currentRound && (
        <section className="section-block">
          <div className="section-heading">
            <h2>Current round</h2>
            <button onClick={() => goTo('rounds')}>Open</button>
          </div>
          <div className="match-preview-list">
            {currentRound.matches.slice(0, 3).map((match) => (
              <div key={match.id} className="match-preview">
                <span>{match.teamA.map((player) => player.name).join(' / ')}</span>
                <strong>vs</strong>
                <span>{match.teamB.map((player) => player.name).join(' / ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
