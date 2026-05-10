import { Play } from 'lucide-react'
import { MatchCard } from '../components/MatchCard'
import { useAppStore } from '../store/appStore'

export function RoundsPage() {
  const { state, dispatch } = useAppStore()
  const round = state.rounds[0]

  if (!round) {
    return (
      <section className="empty-state">
        <h2>No rounds yet</h2>
        <button className="primary-action" onClick={() => dispatch({ type: 'generateRound' })}>
          <Play size={20} />
          Generate round
        </button>
      </section>
    )
  }

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current round</p>
          <h2>{round.matches.length} matches</h2>
        </div>
        <button className="primary-action" onClick={() => dispatch({ type: 'generateRound' })}>
          <Play size={18} />
          Next round
        </button>
      </div>

      {round.byePlayerIds.length > 0 && (
        <div className="bye-strip">
          Resting:{' '}
          {round.byePlayerIds
            .map((id) => state.players.find((player) => player.id === id)?.name)
            .filter(Boolean)
            .join(', ')}
        </div>
      )}

      {round.matches.length === 0 && <p className="empty-text">Not enough active players for this mode.</p>}

      {round.matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          players={state.players}
          onScore={(side, score) => dispatch({ type: 'setScore', matchId: match.id, side, score })}
          onFinish={() => dispatch({ type: 'finishMatch', matchId: match.id })}
          onSwap={(fromPlayerId, toPlayerId) => dispatch({ type: 'swapPlayer', matchId: match.id, fromPlayerId, toPlayerId })}
        />
      ))}
    </section>
  )
}
