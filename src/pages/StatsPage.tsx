import { Download, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getPlayerStats } from '../algorithms/statistics'
import { useAppStore } from '../store/appStore'
import type { LeaderboardMetric } from '../types/domain'

export function StatsPage() {
  const { state, exportData, importData } = useAppStore()
  const [metric, setMetric] = useState<LeaderboardMetric>('winRate')
  const fileInput = useRef<HTMLInputElement>(null)

  const leaderboard = useMemo(() => {
    const stats = getPlayerStats(state.players, state.history)
    return stats.sort((a, b) => {
      if (metric === 'rating') return b.rating - a.rating
      if (metric === 'wins') return b.wins - a.wins
      if (metric === 'activity') return b.gamesPlayed - a.gamesPlayed
      if (metric === 'pointDifferential') return b.pointDifferential - a.pointDifferential
      return b.winRate - a.winRate
    })
  }, [metric, state.history, state.players])

  const chartData = leaderboard.slice(0, 8).map((player) => ({
    name: player.name,
    wins: player.wins,
    differential: player.pointDifferential
  }))

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2>Player rankings</h2>
        </div>
        <select value={metric} onChange={(event) => setMetric(event.target.value as LeaderboardMetric)}>
          <option value="winRate">Win rate</option>
          <option value="rating">ELO rating</option>
          <option value="wins">Total wins</option>
          <option value="activity">Activity</option>
          <option value="pointDifferential">Points diff</option>
        </select>
      </div>

      <div className="chart-panel" aria-label="Top player chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="wins" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="leaderboard">
        {leaderboard.map((player, index) => (
          <article key={player.id}>
            <strong>#{index + 1}</strong>
            <div>
              <h3>{player.name}</h3>
              <span>
                {player.winRate}% WR · {player.wins}W · {player.pointDifferential > 0 ? '+' : ''}
                {player.pointDifferential}
              </span>
            </div>
            <b>{player.rating.toFixed(2)}</b>
          </article>
        ))}
      </div>

      <section className="section-block">
        <div className="section-heading">
          <h2>Backup</h2>
          <div className="inline-actions">
            <button
              onClick={() => {
                const blob = new Blob([exportData()], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'pickleballstats-backup.json'
                link.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download size={18} />
              Export
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <Upload size={18} />
              Import
            </button>
          </div>
        </div>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            file.text().then((text) => importData(text))
          }}
        />
      </section>
    </section>
  )
}
