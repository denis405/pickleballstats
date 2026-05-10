import { BarChart3, History, Home, Moon, RotateCcw, RotateCw, Sun, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { PlayersPage } from './pages/PlayersPage'
import { RoundsPage } from './pages/RoundsPage'
import { StatsPage } from './pages/StatsPage'
import { useAppStore } from './store/appStore'

type Page = 'dashboard' | 'players' | 'rounds' | 'stats'

const navItems: Array<{ id: Page; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'rounds', label: 'Rounds', icon: History },
  { id: 'stats', label: 'Stats', icon: BarChart3 }
]

export function App() {
  const { state, ready, canUndo, canRedo, undo, redo, dispatch } = useAppStore()
  const [page, setPage] = useState<Page>('dashboard')
  const content = useMemo(() => {
    if (page === 'players') return <PlayersPage />
    if (page === 'rounds') return <RoundsPage />
    if (page === 'stats') return <StatsPage />
    return <DashboardPage goTo={setPage} />
  }, [page])

  if (!ready) {
    return <main className="loading">Loading court data...</main>
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pickleball</p>
          <h1>Match Manager</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={undo} disabled={!canUndo} aria-label="Undo">
            <RotateCcw size={20} />
          </button>
          <button className="icon-button" onClick={redo} disabled={!canRedo} aria-label="Redo">
            <RotateCw size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => dispatch({ type: 'setTheme', theme: state.theme === 'dark' ? 'light' : 'dark' })}
            aria-label="Toggle theme"
          >
            {state.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="page">{content}</main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
