import { Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { Player } from '../types/domain'

export function PlayersPage() {
  const { state, dispatch } = useAppStore()
  const [name, setName] = useState('')
  const [rating, setRating] = useState(3)
  const [bulk, setBulk] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'rating' | 'activity'>('activity')

  const players = useMemo(() => {
    return [...state.players]
      .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (sort === 'rating') return b.rating - a.rating
        if (sort === 'activity') return Number(b.active) - Number(a.active) || b.gamesPlayed - a.gamesPlayed
        return a.name.localeCompare(b.name)
      })
  }, [query, sort, state.players])

  return (
    <section className="stack">
      <form
        className="player-form"
        onSubmit={(event) => {
          event.preventDefault()
          dispatch({ type: 'addPlayer', name, rating })
          setName('')
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Player name" />
        <input
          type="number"
          min="1"
          max="6"
          step="0.1"
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          aria-label="Initial rating"
        />
        <button className="primary-action">
          <Plus size={19} />
          Add
        </button>
      </form>

      <details className="section-block">
        <summary>Bulk add players</summary>
        <textarea
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          placeholder="One player per line, or comma separated"
        />
        <button
          onClick={() => {
            dispatch({ type: 'bulkAddPlayers', names: bulk })
            setBulk('')
          }}
        >
          Import names
        </button>
      </details>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" />
        </label>
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort players">
          <option value="activity">Activity</option>
          <option value="rating">Rating</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="player-list">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={state.selectedPlayerIds.includes(player.id)}
            onSelect={() => dispatch({ type: 'toggleSelected', playerId: player.id })}
            onUpdate={(updates) => dispatch({ type: 'updatePlayer', playerId: player.id, updates })}
            onRemove={() => dispatch({ type: 'removePlayer', playerId: player.id })}
          />
        ))}
      </div>
    </section>
  )
}

function PlayerCard({
  player,
  selected,
  onSelect,
  onUpdate,
  onRemove
}: {
  player: Player
  selected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Pick<Player, 'name' | 'rating' | 'active'>>) => void
  onRemove: () => void
}) {
  return (
    <article className={`player-card ${selected ? 'selected' : ''}`}>
      <button className="player-select" onClick={onSelect} aria-pressed={selected}>
        <strong>{player.name}</strong>
        <span>{player.gamesPlayed} games</span>
      </button>
      <div className="player-edit-row">
        <input value={player.name} onChange={(event) => onUpdate({ name: event.target.value })} aria-label="Player name" />
        <input
          type="number"
          min="1"
          max="6"
          step="0.1"
          value={player.rating}
          onChange={(event) => onUpdate({ rating: Number(event.target.value) })}
          aria-label="Player rating"
        />
      </div>
      <div className="player-actions">
        <label>
          <input
            type="checkbox"
            checked={player.active}
            onChange={(event) => onUpdate({ active: event.target.checked })}
          />
          Active
        </label>
        <span>{player.wins}W / {player.losses}L</span>
        <button className="danger-icon" onClick={onRemove} aria-label={`Remove ${player.name}`}>
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  )
}
