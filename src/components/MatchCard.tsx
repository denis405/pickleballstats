import { Check, Trophy } from 'lucide-react'
import type { Match, Player } from '../types/domain'
import { ScoreStepper } from './ScoreStepper'

type MatchCardProps = {
  match: Match
  players: Player[]
  onScore: (side: 'A' | 'B', score: number) => void
  onFinish: () => void
  onSwap: (fromPlayerId: string, toPlayerId: string) => void
}

export function MatchCard({ match, players, onScore, onFinish, onSwap }: MatchCardProps) {
  const waitingPlayers = players.filter(
    (player) =>
      player.active &&
      !match.teamA.some((teamPlayer) => teamPlayer.id === player.id) &&
      !match.teamB.some((teamPlayer) => teamPlayer.id === player.id)
  )

  return (
    <article className={`match-card ${match.status}`}>
      <div className="match-header">
        <span>{match.status === 'finished' ? 'Finished' : 'Pending'}</span>
        {match.winner && (
          <strong>
            <Trophy size={16} /> Team {match.winner}
          </strong>
        )}
      </div>

      <div className="teams-grid">
        <TeamBlock
          label="Team A"
          players={match.teamA}
          substitutes={waitingPlayers}
          onSwap={onSwap}
          winner={match.winner === 'A'}
        />
        <TeamBlock
          label="Team B"
          players={match.teamB}
          substitutes={waitingPlayers}
          onSwap={onSwap}
          winner={match.winner === 'B'}
        />
      </div>

      <div className="score-grid">
        <ScoreStepper
          label="A"
          value={match.scoreA ?? 0}
          disabled={match.status === 'finished'}
          onChange={(score) => onScore('A', score)}
        />
        <ScoreStepper
          label="B"
          value={match.scoreB ?? 0}
          disabled={match.status === 'finished'}
          onChange={(score) => onScore('B', score)}
        />
      </div>

      <button
        className="primary-action"
        onClick={onFinish}
        disabled={
          match.status === 'finished' ||
          match.scoreA === undefined ||
          match.scoreB === undefined ||
          match.scoreA === match.scoreB
        }
      >
        <Check size={19} />
        Finish match
      </button>
    </article>
  )
}

function TeamBlock({
  label,
  players,
  substitutes,
  winner,
  onSwap
}: {
  label: string
  players: Player[]
  substitutes: Player[]
  winner: boolean
  onSwap: (fromPlayerId: string, toPlayerId: string) => void
}) {
  return (
    <div
      className={`team-block ${winner ? 'winner' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const fromPlayerId = event.dataTransfer.getData('text/player-id')
        const target = players[0]
        if (fromPlayerId && target && fromPlayerId !== target.id) onSwap(fromPlayerId, target.id)
      }}
    >
      <span>{label}</span>
      {players.map((player) => (
        <label
          key={player.id}
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/player-id', player.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const fromPlayerId = event.dataTransfer.getData('text/player-id')
            if (fromPlayerId && fromPlayerId !== player.id) onSwap(fromPlayerId, player.id)
          }}
        >
          <strong>{player.name}</strong>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) onSwap(player.id, event.target.value)
            }}
            aria-label={`Swap ${player.name}`}
          >
            <option value="">Swap</option>
            {substitutes.map((substitute) => (
              <option key={substitute.id} value={substitute.id}>
                {substitute.name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}
