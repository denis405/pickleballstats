const STORAGE_KEY = 'pickleballstats.simple.v1'

const state = loadState()

const els = {
  themeToggle: document.querySelector('#themeToggle'),
  selectAllBtn: document.querySelector('#selectAllBtn'),
  generateBtn: document.querySelector('#generateBtn'),
  playerCount: document.querySelector('#playerCount'),
  selectedCount: document.querySelector('#selectedCount'),
  matchCount: document.querySelector('#matchCount'),
  playerForm: document.querySelector('#playerForm'),
  playerName: document.querySelector('#playerName'),
  playerRating: document.querySelector('#playerRating'),
  bulkNames: document.querySelector('#bulkNames'),
  bulkAddBtn: document.querySelector('#bulkAddBtn'),
  searchInput: document.querySelector('#searchInput'),
  sortSelect: document.querySelector('#sortSelect'),
  playersList: document.querySelector('#playersList'),
  roundInfo: document.querySelector('#roundInfo'),
  matchesList: document.querySelector('#matchesList'),
  leaderboardSort: document.querySelector('#leaderboardSort'),
  leaderboard: document.querySelector('#leaderboard'),
  historyList: document.querySelector('#historyList'),
  exportBtn: document.querySelector('#exportBtn')
}

document.documentElement.dataset.theme = state.theme

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => setTab(button.dataset.tab))
})

els.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = state.theme
  saveAndRender()
})

els.selectAllBtn.addEventListener('click', () => {
  state.selected = state.players.filter((player) => player.active).map((player) => player.id)
  saveAndRender()
})

els.generateBtn.addEventListener('click', () => {
  generateRound()
  setTab('round')
  saveAndRender()
})

els.playerForm.addEventListener('submit', (event) => {
  event.preventDefault()
  addPlayer(els.playerName.value, Number(els.playerRating.value))
  els.playerName.value = ''
  saveAndRender()
})

els.bulkAddBtn.addEventListener('click', () => {
  els.bulkNames.value
    .split(/\n|,/)
    .map(cleanName)
    .filter(Boolean)
    .forEach((name) => addPlayer(name, 3))
  els.bulkNames.value = ''
  saveAndRender()
})

els.searchInput.addEventListener('input', render)
els.sortSelect.addEventListener('change', render)
els.leaderboardSort.addEventListener('change', render)

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'pickleballstats-backup.json'
  link.click()
  URL.revokeObjectURL(url)
})

render()

function defaultState() {
  return {
    theme: 'light',
    players: [],
    selected: [],
    rounds: [],
    history: []
  }
}

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return defaultState()
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  render()
}

function id(prefix) {
  const random =
    globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}_${random}`
}

function cleanName(value) {
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48)
}

function clampRating(value) {
  if (!Number.isFinite(value)) return 3
  return Math.min(6, Math.max(1, Number(value.toFixed(1))))
}

function addPlayer(name, rating) {
  const safeName = cleanName(name)
  if (!safeName) return
  if (state.players.some((player) => player.name.toLowerCase() === safeName.toLowerCase())) return

  const player = {
    id: id('player'),
    name: safeName,
    rating: clampRating(rating),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointsScored: 0,
    pointsAgainst: 0,
    active: true,
    createdAt: new Date().toISOString()
  }

  state.players.push(player)
  state.selected.push(player.id)
}

function setTab(tab) {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab)
  })
  document.querySelectorAll('.tab-page').forEach((page) => page.classList.remove('active'))
  document.querySelector(`#${tab}Tab`).classList.add('active')
}

function render() {
  els.playerCount.textContent = state.players.length
  els.selectedCount.textContent = state.selected.length
  els.matchCount.textContent = state.history.length
  els.themeToggle.textContent = state.theme === 'dark' ? '☀' : '☾'

  renderPlayers()
  renderRound()
  renderStats()
}

function renderPlayers() {
  const query = els.searchInput.value.toLowerCase()
  const sort = els.sortSelect.value
  const players = [...state.players]
    .filter((player) => player.name.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'name') return a.name.localeCompare(b.name)
      return Number(b.active) - Number(a.active) || b.gamesPlayed - a.gamesPlayed
    })

  els.playersList.innerHTML = players
    .map(
      (player) => `
        <article class="card">
          <div class="player-head">
            <button type="button" data-action="toggle-select" data-id="${player.id}">
              ${state.selected.includes(player.id) ? '✓' : '+'} ${escapeHtml(player.name)}
            </button>
            <span class="pill">${player.rating.toFixed(1)} rating</span>
          </div>
          <div class="card-row">
            <span>${player.wins}W / ${player.losses}L · ${player.gamesPlayed} games</span>
            <span>${player.pointsScored - player.pointsAgainst} diff</span>
          </div>
          <div class="player-actions">
            <button type="button" data-action="toggle-active" data-id="${player.id}">
              ${player.active ? 'Active' : 'Inactive'}
            </button>
            <button type="button" data-action="rating-down" data-id="${player.id}">- Rating</button>
            <button type="button" data-action="rating-up" data-id="${player.id}">+ Rating</button>
          </div>
          <button class="danger" type="button" data-action="remove-player" data-id="${player.id}">Remove</button>
        </article>
      `
    )
    .join('')

  els.playersList.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handlePlayerAction(button.dataset.action, button.dataset.id))
  })
}

function handlePlayerAction(action, playerId) {
  const player = state.players.find((item) => item.id === playerId)
  if (!player) return

  if (action === 'toggle-select') {
    state.selected = state.selected.includes(playerId)
      ? state.selected.filter((id) => id !== playerId)
      : [...state.selected, playerId]
  }
  if (action === 'toggle-active') player.active = !player.active
  if (action === 'rating-down') player.rating = clampRating(player.rating - 0.1)
  if (action === 'rating-up') player.rating = clampRating(player.rating + 0.1)
  if (action === 'remove-player') {
    state.players = state.players.filter((item) => item.id !== playerId)
    state.selected = state.selected.filter((id) => id !== playerId)
  }

  saveAndRender()
}

function generateRound() {
  const active = state.players
    .filter((player) => player.active && state.selected.includes(player.id))
    .sort((a, b) => a.gamesPlayed - b.gamesPlayed || b.rating - a.rating)

  const matches = []
  const playable = active.slice(0, Math.floor(active.length / 4) * 4)
  const resting = active.slice(playable.length)
  const shuffled = [...playable].sort(() => Math.random() - 0.5)

  while (shuffled.length >= 4) {
    const group = shuffled.splice(0, 4).sort((a, b) => b.rating - a.rating)
    matches.push({
      id: id('match'),
      teamA: [group[0].id, group[3].id],
      teamB: [group[1].id, group[2].id],
      scoreA: 0,
      scoreB: 0,
      status: 'pending'
    })
  }

  state.rounds.unshift({
    id: id('round'),
    createdAt: new Date().toISOString(),
    resting: resting.map((player) => player.id),
    matches
  })
}

function renderRound() {
  const round = state.rounds[0]
  if (!round) {
    els.roundInfo.textContent = 'Generate a round to start.'
    els.matchesList.innerHTML = ''
    return
  }

  const restingNames = round.resting.map(playerName).join(', ')
  els.roundInfo.textContent = restingNames ? `Resting: ${restingNames}` : `${round.matches.length} match(es) ready`

  els.matchesList.innerHTML = round.matches
    .map((match, index) => {
      const teamA = match.teamA.map(playerName).join(' / ')
      const teamB = match.teamB.map(playerName).join(' / ')
      return `
        <article class="card ${match.status === 'finished' ? 'winner' : ''}">
          <div class="match-head">
            <strong>Match ${index + 1}</strong>
            <span class="pill">${match.status}</span>
          </div>
          <div class="teams">
            <div class="team"><span>Team A</span><strong>${escapeHtml(teamA)}</strong></div>
            <div class="team"><span>Team B</span><strong>${escapeHtml(teamB)}</strong></div>
          </div>
          <div class="score-row">
            ${scoreBox(match.id, 'A', match.scoreA, match.status === 'finished')}
            ${scoreBox(match.id, 'B', match.scoreB, match.status === 'finished')}
            <button class="primary" type="button" data-action="finish-match" data-id="${match.id}" ${
              match.scoreA === match.scoreB || match.status === 'finished' ? 'disabled' : ''
            }>Finish</button>
          </div>
        </article>
      `
    })
    .join('')

  els.matchesList.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleMatchAction(button.dataset.action, button.dataset.id, button.dataset.side))
  })
  els.matchesList.querySelectorAll('[data-score]').forEach((input) => {
    input.addEventListener('input', () => setScore(input.dataset.id, input.dataset.side, Number(input.value)))
  })
}

function scoreBox(matchId, side, value, disabled) {
  return `
    <div class="scorebox">
      <button type="button" data-action="score-down" data-id="${matchId}" data-side="${side}" ${disabled ? 'disabled' : ''}>-</button>
      <input data-score data-id="${matchId}" data-side="${side}" value="${value}" inputmode="numeric" aria-label="Team ${side} score" ${
        disabled ? 'disabled' : ''
      } />
      <button type="button" data-action="score-up" data-id="${matchId}" data-side="${side}" ${disabled ? 'disabled' : ''}>+</button>
    </div>
  `
}

function handleMatchAction(action, matchId, side) {
  const match = currentMatch(matchId)
  if (!match) return
  if (action === 'score-down') setScore(matchId, side, Math.max(0, match[`score${side}`] - 1))
  if (action === 'score-up') setScore(matchId, side, match[`score${side}`] + 1)
  if (action === 'finish-match') finishMatch(match)
  saveAndRender()
}

function setScore(matchId, side, score) {
  const match = currentMatch(matchId)
  if (!match || match.status === 'finished') return
  match[`score${side}`] = Math.max(0, Number(score) || 0)
  saveAndRender()
}

function finishMatch(match) {
  if (match.status === 'finished' || match.scoreA === match.scoreB) return
  const winner = match.scoreA > match.scoreB ? 'A' : 'B'
  const winnerIds = winner === 'A' ? match.teamA : match.teamB
  const loserIds = winner === 'A' ? match.teamB : match.teamA

  match.status = 'finished'
  match.winner = winner

  state.history.push({
    id: id('history'),
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winner,
    finishedAt: new Date().toISOString()
  })

  state.players.forEach((player) => {
    const onA = match.teamA.includes(player.id)
    const onB = match.teamB.includes(player.id)
    if (!onA && !onB) return
    const teamScore = onA ? match.scoreA : match.scoreB
    const againstScore = onA ? match.scoreB : match.scoreA
    player.gamesPlayed += 1
    player.wins += winnerIds.includes(player.id) ? 1 : 0
    player.losses += loserIds.includes(player.id) ? 1 : 0
    player.pointsScored += teamScore
    player.pointsAgainst += againstScore
    player.rating = clampRating(player.rating + (winnerIds.includes(player.id) ? 0.1 : -0.07))
  })
}

function renderStats() {
  const sort = els.leaderboardSort.value
  const rows = [...state.players].sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'wins') return b.wins - a.wins
    if (sort === 'diff') return pointDiff(b) - pointDiff(a)
    return winRate(b) - winRate(a)
  })

  els.leaderboard.innerHTML = rows
    .map(
      (player, index) => `
        <article class="card">
          <div class="leader-row">
            <strong>#${index + 1} ${escapeHtml(player.name)}</strong>
            <span class="pill">${winRate(player)}% WR</span>
          </div>
          <div class="card-row">
            <span>${player.wins}W / ${player.losses}L</span>
            <span>${pointDiff(player)} diff · ${player.rating.toFixed(1)} rating</span>
          </div>
        </article>
      `
    )
    .join('')

  els.historyList.innerHTML = [...state.history]
    .reverse()
    .slice(0, 20)
    .map(
      (match) => `
        <article class="card history-row">
          <span>${escapeHtml(match.teamA.map(playerName).join(' / '))} vs ${escapeHtml(match.teamB.map(playerName).join(' / '))}</span>
          <strong>${match.scoreA}-${match.scoreB}</strong>
        </article>
      `
    )
    .join('')
}

function currentMatch(matchId) {
  return state.rounds[0]?.matches.find((match) => match.id === matchId)
}

function playerName(playerId) {
  return state.players.find((player) => player.id === playerId)?.name || 'Unknown'
}

function pointDiff(player) {
  return player.pointsScored - player.pointsAgainst
}

function winRate(player) {
  return player.gamesPlayed ? Math.round((player.wins / player.gamesPlayed) * 100) : 0
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
