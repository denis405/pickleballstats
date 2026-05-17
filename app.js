const STORAGE_KEY = 'pickleballstats.simple.v2'
const LEGACY_STORAGE_KEY = 'pickleballstats.simple.v1'
const MAX_UNDO = 60
const PRESS_DELAY = 360
const PRESS_INTERVAL = 90

let state = loadState()
let activeTab = 'players'
let liveMatchId = null
let longPressTimer = null
let longPressInterval = null

const els = {
  themeToggle: document.querySelector('#themeToggle'),
  sessionPulse: document.querySelector('#sessionPulse'),
  selectAllBtn: document.querySelector('#selectAllBtn'),
  generateBtn: document.querySelector('#generateBtn'),
  totalScore: document.querySelector('#totalScore'),
  undoBtn: document.querySelector('#undoBtn'),
  redoBtn: document.querySelector('#redoBtn'),
  shareBtn: document.querySelector('#shareBtn'),
  resetBtn: document.querySelector('#resetBtn'),
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
  quickRoundBtn: document.querySelector('#quickRoundBtn'),
  duplicateRoundBtn: document.querySelector('#duplicateRoundBtn'),
  roundInfo: document.querySelector('#roundInfo'),
  matchesList: document.querySelector('#matchesList'),
  leaderboardSort: document.querySelector('#leaderboardSort'),
  statsDashboard: document.querySelector('#statsDashboard'),
  leaderboard: document.querySelector('#leaderboard'),
  historyList: document.querySelector('#historyList'),
  actionHistory: document.querySelector('#actionHistory'),
  exportBtn: document.querySelector('#exportBtn'),
  importBtn: document.querySelector('#importBtn'),
  importFile: document.querySelector('#importFile'),
  confirmModal: document.querySelector('#confirmModal'),
  cancelResetBtn: document.querySelector('#cancelResetBtn'),
  confirmResetBtn: document.querySelector('#confirmResetBtn')
}

document.documentElement.dataset.theme = state.theme
bindEvents()
render()
document.body.classList.remove('is-loading')
registerServiceWorker()

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => setTab(button.dataset.tab))
  })

  els.themeToggle.addEventListener('click', () => {
    commit('Theme changed', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    })
    document.documentElement.dataset.theme = state.theme
  })

  els.selectAllBtn.addEventListener('click', () => {
    commit('Selected all active players', () => {
      state.selected = state.players.filter((player) => player.active).map((player) => player.id)
    })
  })

  els.generateBtn.addEventListener('click', () => {
    commit('Round generated', () => generateRound())
    setTab('round')
  })

  els.quickRoundBtn.addEventListener('click', () => {
    commit('Quick round generated', () => {
      state.selected = state.players.filter((player) => player.active).map((player) => player.id)
      generateRound()
    })
  })

  els.duplicateRoundBtn.addEventListener('click', () => {
    commit('Previous round duplicated', duplicatePreviousRound)
  })

  els.undoBtn.addEventListener('click', undo)
  els.redoBtn.addEventListener('click', redo)
  els.resetBtn.addEventListener('click', () => {
    els.confirmModal.hidden = false
    els.cancelResetBtn.focus()
  })
  els.cancelResetBtn.addEventListener('click', () => {
    els.confirmModal.hidden = true
  })
  els.confirmResetBtn.addEventListener('click', () => {
    state = defaultState()
    persist()
    render()
    els.confirmModal.hidden = true
  })

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => addPreset(button.dataset.preset))
  })

  els.playerForm.addEventListener('submit', (event) => {
    event.preventDefault()
    commit(`${cleanName(els.playerName.value) || 'Player'} added`, () => {
      addPlayer(els.playerName.value, Number(els.playerRating.value))
    })
    els.playerName.value = ''
  })

  els.bulkAddBtn.addEventListener('click', () => {
    commit('Players bulk-added', () => {
      els.bulkNames.value
        .split(/\n|,/)
        .map(cleanName)
        .filter(Boolean)
        .forEach((name) => addPlayer(name, 3))
      els.bulkNames.value = ''
    })
  })

  els.playersList.addEventListener('click', handlePlayerClick)
  els.playersList.addEventListener('dragstart', handlePlayerDragStart)
  els.playersList.addEventListener('dragover', handlePlayerDragOver)
  els.playersList.addEventListener('drop', handlePlayerDrop)
  els.matchesList.addEventListener('click', handleRoundClick)
  els.matchesList.addEventListener('focusin', handleScoreFocus)
  els.matchesList.addEventListener('input', handleScoreInput)
  els.matchesList.addEventListener('focusout', handleScoreCommit)
  els.matchesList.addEventListener('keydown', handleScoreKeydown)
  els.matchesList.addEventListener('pointerdown', handleScorePressStart)
  window.addEventListener('pointerup', clearLongPress)
  window.addEventListener('pointercancel', clearLongPress)

  els.searchInput.addEventListener('input', renderPlayers)
  els.sortSelect.addEventListener('change', renderPlayers)
  els.leaderboardSort.addEventListener('change', renderStats)
  els.exportBtn.addEventListener('click', exportState)
  els.importBtn.addEventListener('click', () => els.importFile.click())
  els.importFile.addEventListener('change', importState)
  els.shareBtn.addEventListener('click', shareState)
}

function defaultState() {
  return {
    theme: 'light',
    players: [],
    selected: [],
    rounds: [],
    history: [],
    actions: [],
    undoStack: [],
    redoStack: []
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    return normalizeState(raw ? JSON.parse(raw) : defaultState())
  } catch {
    return defaultState()
  }
}

function normalizeState(value) {
  const next = { ...defaultState(), ...value }
  next.players = Array.isArray(next.players) ? next.players : []
  next.selected = Array.isArray(next.selected) ? next.selected : []
  next.rounds = Array.isArray(next.rounds) ? next.rounds : []
  next.history = Array.isArray(next.history) ? next.history : []
  next.actions = Array.isArray(next.actions) ? next.actions : []
  next.undoStack = Array.isArray(next.undoStack) ? next.undoStack : []
  next.redoStack = Array.isArray(next.redoStack) ? next.redoStack : []
  next.rounds.forEach((round, index) => {
    round.title = round.title || `Round ${next.rounds.length - index}`
    round.createdAt = round.createdAt || new Date().toISOString()
    round.resting = Array.isArray(round.resting) ? round.resting : []
    round.matches = Array.isArray(round.matches) ? round.matches : []
    round.collapsed = Boolean(round.collapsed)
  })
  next.players.forEach((player, index) => {
    player.color = player.color || playerColor(index)
    player.active = player.active !== false
  })
  return next
}

function commit(label, mutator, options = {}) {
  const before = snapshot()
  mutator()
  state.redoStack = []
  state.undoStack.push(before)
  state.undoStack = state.undoStack.slice(-MAX_UNDO)
  addAction(label, options.detail)
  persist()
  if (!options.skipRender) render()
}

function snapshot() {
  return JSON.stringify({
    theme: state.theme,
    players: state.players,
    selected: state.selected,
    rounds: state.rounds,
    history: state.history,
    actions: state.actions
  })
}

function restore(serialized) {
  const restored = normalizeState(JSON.parse(serialized))
  state.theme = restored.theme
  state.players = restored.players
  state.selected = restored.selected
  state.rounds = restored.rounds
  state.history = restored.history
  state.actions = restored.actions
  document.documentElement.dataset.theme = state.theme
  persist()
  render()
}

function undo() {
  const previous = state.undoStack.pop()
  if (!previous) return
  state.redoStack.push(snapshot())
  restore(previous)
}

function redo() {
  const next = state.redoStack.pop()
  if (!next) return
  state.undoStack.push(snapshot())
  restore(next)
}

function addAction(label, detail = '') {
  state.actions.unshift({
    id: id('action'),
    label,
    detail,
    at: new Date().toISOString()
  })
  state.actions = state.actions.slice(0, 80)
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function id(prefix) {
  const random =
    globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}_${random}`
}

function cleanName(value) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
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
    color: playerColor(state.players.length),
    createdAt: new Date().toISOString()
  }

  state.players.push(player)
  state.selected.push(player.id)
}

function addPreset(preset) {
  const count = preset === '2' ? 2 : 4
  commit(`${count} preset players added`, () => {
    for (let index = 0; index < count; index += 1) {
      addPlayer(nextPlayerName(), 3)
    }
  })
}

function nextPlayerName() {
  let index = state.players.length + 1
  while (state.players.some((player) => player.name === `Player ${index}`)) index += 1
  return `Player ${index}`
}

function playerColor(index) {
  return ['#0f766e', '#2563eb', '#9333ea', '#c2410c', '#0f5f8f', '#be123c', '#4d7c0f', '#7c3aed'][
    index % 8
  ]
}

function setTab(tab) {
  activeTab = tab
  if (tab !== 'round') exitLiveMode()
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab)
  })
  document.querySelectorAll('.tab-page').forEach((page) => page.classList.remove('active'))
  document.querySelector(`#${tab}Tab`).classList.add('active')
  renderActiveTab()
}

function render() {
  renderShell()
  renderActiveTab()
}

function renderActiveTab() {
  if (activeTab === 'players') renderPlayers()
  if (activeTab === 'round') renderRound()
  if (activeTab === 'stats') renderStats()
}

function renderShell() {
  const activeRound = state.rounds[0]
  const totalA = activeRound?.matches.reduce((sum, match) => sum + Number(match.scoreA || 0), 0) || 0
  const totalB = activeRound?.matches.reduce((sum, match) => sum + Number(match.scoreB || 0), 0) || 0
  const pulse = sessionPulse()

  els.playerCount.textContent = state.players.length
  els.selectedCount.textContent = state.selected.length
  els.matchCount.textContent = state.history.length
  els.themeToggle.textContent = state.theme === 'dark' ? '☀' : '☾'
  els.undoBtn.disabled = state.undoStack.length === 0
  els.redoBtn.disabled = state.redoStack.length === 0
  els.generateBtn.disabled = state.selected.length < 4
  els.totalScore.innerHTML = activeRound
    ? `<span>${escapeHtml(activeRound.title || 'Current round')}</span><strong>${totalA} - ${totalB}</strong>`
    : '<span>No active round</span><strong>0 - 0</strong>'
  els.sessionPulse.innerHTML = pulse
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join('')
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

  els.playersList.innerHTML = players.length
    ? players
    .map(
      (player) => `
        <article class="card player-card" draggable="true" data-player-card="${player.id}">
          <div class="player-head">
            <button type="button" data-action="toggle-select" data-id="${player.id}">
              <span class="avatar" style="--avatar:${player.color}">${escapeHtml(player.name.slice(0, 1).toUpperCase())}</span>
              ${state.selected.includes(player.id) ? '✓' : '+'} ${escapeHtml(player.name)}
            </button>
            <span class="pill">${player.rating.toFixed(1)} rating</span>
          </div>
          <div class="card-row">
            <span>${player.wins}W / ${player.losses}L · ${player.gamesPlayed} games</span>
            <span>${pointDiff(player)} diff</span>
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
    : emptyState(
        'Build your court list',
        state.players.length
          ? 'No players match this search.'
          : 'Add four players to unlock balanced doubles rounds and fast score entry.',
        'Use the presets or add names one by one.'
      )
}

function handlePlayerClick(event) {
  const button = event.target.closest('[data-action]')
  if (!button) return
  const playerId = button.dataset.id
  const player = state.players.find((item) => item.id === playerId)
  if (!player) return

  commit(playerActionLabel(button.dataset.action, player), () => {
    if (button.dataset.action === 'toggle-select') {
      state.selected = state.selected.includes(playerId)
        ? state.selected.filter((id) => id !== playerId)
        : [...state.selected, playerId]
    }
    if (button.dataset.action === 'toggle-active') player.active = !player.active
    if (button.dataset.action === 'rating-down') player.rating = clampRating(player.rating - 0.1)
    if (button.dataset.action === 'rating-up') player.rating = clampRating(player.rating + 0.1)
    if (button.dataset.action === 'remove-player') {
      state.players = state.players.filter((item) => item.id !== playerId)
      state.selected = state.selected.filter((id) => id !== playerId)
    }
  })
}

function playerActionLabel(action, player) {
  if (action === 'toggle-select') return `${player.name} selection changed`
  if (action === 'toggle-active') return `${player.name} activity changed`
  if (action === 'rating-down' || action === 'rating-up') return `${player.name} rating edited`
  if (action === 'remove-player') return `${player.name} removed`
  return 'Player edited'
}

function handlePlayerDragStart(event) {
  const card = event.target.closest('[data-player-card]')
  if (!card) return
  event.dataTransfer.setData('text/player-id', card.dataset.playerCard)
}

function handlePlayerDragOver(event) {
  if (event.target.closest('[data-player-card]')) event.preventDefault()
}

function handlePlayerDrop(event) {
  const target = event.target.closest('[data-player-card]')
  const sourceId = event.dataTransfer.getData('text/player-id')
  if (!target || !sourceId || target.dataset.playerCard === sourceId) return
  event.preventDefault()

  commit('Players reordered', () => {
    const sourceIndex = state.players.findIndex((player) => player.id === sourceId)
    const targetIndex = state.players.findIndex((player) => player.id === target.dataset.playerCard)
    const [moved] = state.players.splice(sourceIndex, 1)
    state.players.splice(targetIndex, 0, moved)
  })
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
    title: `Round ${state.rounds.length + 1}`,
    createdAt: new Date().toISOString(),
    resting: resting.map((player) => player.id),
    collapsed: false,
    matches
  })
}

function duplicatePreviousRound() {
  const previous = state.rounds[0]
  if (!previous) {
    generateRound()
    return
  }

  state.rounds.unshift({
    id: id('round'),
    title: `${previous.title || 'Round'} copy`,
    createdAt: new Date().toISOString(),
    resting: [...previous.resting],
    collapsed: false,
    matches: previous.matches.map((match) => ({
      id: id('match'),
      teamA: [...match.teamA],
      teamB: [...match.teamB],
      scoreA: 0,
      scoreB: 0,
      status: 'pending'
    }))
  })
}

function renderRound() {
  if (state.rounds.length === 0) {
    els.roundInfo.innerHTML = 'Generate a round to start.'
    els.matchesList.innerHTML = emptyState(
      'No round yet',
      state.selected.length < 4
        ? 'Select at least four active players to create a doubles round.'
        : 'Generate a round when players are ready.',
      'Live mode appears on each match for one-handed scoring.'
    )
    return
  }

  const current = state.rounds[0]
  const restingNames = current.resting.map(playerName).join(', ')
  els.roundInfo.innerHTML = restingNames
    ? `<strong>Resting</strong><span>${escapeHtml(restingNames)}</span>`
    : `<strong>${current.matches.length} match${current.matches.length === 1 ? '' : 'es'} ready</strong><span>Tap Live for courtside scoring.</span>`

  els.matchesList.innerHTML = state.rounds
    .map((round, roundIndex) => renderRoundCard(round, roundIndex))
    .join('')
}

function renderRoundCard(round, roundIndex) {
  const completed = round.matches.length > 0 && round.matches.every((match) => match.status === 'finished')
  const collapsed = round.collapsed || (completed && roundIndex > 0)
  const liveRound = liveMatchId && round.matches.some((match) => match.id === liveMatchId)
  return `
    <section class="round-card ${completed ? 'round-complete' : ''} ${liveRound ? 'live-round' : ''}" data-round-id="${round.id}">
      <div class="round-head">
        <input class="round-title-input" value="${escapeHtml(round.title || `Round ${state.rounds.length - roundIndex}`)}" data-round-title="${round.id}" aria-label="Round title" />
        <span class="pill">${formatTime(round.createdAt)}</span>
      </div>
      <div class="round-controls">
        ${liveRound ? `<button type="button" data-action="exit-live">Exit live</button>` : ''}
        <button type="button" data-action="toggle-round" data-round-id="${round.id}">${collapsed ? 'Expand' : 'Collapse'}</button>
        <button type="button" data-action="delete-round" data-round-id="${round.id}">Delete</button>
      </div>
      <div class="round-matches ${collapsed ? 'collapsed' : ''}">
        ${round.matches.map((match, index) => renderMatch(round.id, match, index)).join('')}
      </div>
    </section>
  `
}

function renderMatch(roundId, match, index) {
  const teamA = match.teamA.map(playerName).join(' / ')
  const teamB = match.teamB.map(playerName).join(' / ')
  const leading = match.scoreA === match.scoreB ? '' : match.scoreA > match.scoreB ? 'A' : 'B'
  const isLive = liveMatchId === match.id
  return `
    <article class="card match-card ${match.status === 'finished' ? 'winner' : ''} ${isLive ? 'match-live' : ''}" data-match-id="${match.id}" data-round-id="${roundId}">
      <div class="match-head">
        <strong>Match ${index + 1}</strong>
        <span class="pill">${match.status}</span>
      </div>
      <div class="teams">
        <div class="team ${leading === 'A' ? 'team-leading' : ''}"><span>Team A</span><strong>${escapeHtml(teamA)}</strong></div>
        <div class="team ${leading === 'B' ? 'team-leading' : ''}"><span>Team B</span><strong>${escapeHtml(teamB)}</strong></div>
      </div>
      <div class="score-row">
        ${scoreBox(match.id, 'A', match.scoreA, match.status === 'finished')}
        ${scoreBox(match.id, 'B', match.scoreB, match.status === 'finished')}
        <button class="primary" type="button" data-action="finish-match" data-id="${match.id}" ${
          match.scoreA === match.scoreB || match.status === 'finished' ? 'disabled' : ''
        }>Finish</button>
      </div>
      <button class="live-button" type="button" data-action="${isLive ? 'exit-live' : 'enter-live'}" data-id="${match.id}">
        ${isLive ? 'Exit live mode' : 'Live scoring'}
      </button>
    </article>
  `
}

function scoreBox(matchId, side, value, disabled) {
  return `
    <div class="scorebox">
      <button type="button" data-action="score-down" data-id="${matchId}" data-side="${side}" ${disabled ? 'disabled' : ''}>−</button>
      <input data-score data-id="${matchId}" data-side="${side}" value="${value}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Team ${side} score" ${
        disabled ? 'disabled' : ''
      } />
      <button type="button" data-action="score-up" data-id="${matchId}" data-side="${side}" ${disabled ? 'disabled' : ''}>+</button>
    </div>
  `
}

function handleRoundClick(event) {
  const button = event.target.closest('[data-action]')
  if (!button) return

  const action = button.dataset.action
  if (action === 'score-down' || action === 'score-up') {
    const match = currentMatch(button.dataset.id)
    if (!match) return
    const delta = action === 'score-up' ? 1 : -1
    changeScore(button.dataset.id, button.dataset.side, delta, `${teamLabel(match, button.dataset.side)} ${delta > 0 ? '+' : ''}${delta}`)
    pulse(button)
    return
  }

  if (action === 'finish-match') {
    const match = currentMatch(button.dataset.id)
    if (!match) return
    commit('Match finished', () => finishMatch(match))
    if (liveMatchId === match.id) exitLiveMode()
  }

  if (action === 'enter-live') enterLiveMode(button.dataset.id)
  if (action === 'exit-live') exitLiveMode()

  if (action === 'toggle-round') {
    commit('Round collapsed', () => {
      const round = state.rounds.find((item) => item.id === button.dataset.roundId)
      if (round) round.collapsed = !round.collapsed
    })
  }

  if (action === 'delete-round') {
    commit('Round deleted', () => {
      state.rounds = state.rounds.filter((round) => round.id !== button.dataset.roundId)
    })
  }
}

function handleScorePressStart(event) {
  const button = event.target.closest('[data-action="score-up"], [data-action="score-down"]')
  if (!button || button.disabled) return
  clearLongPress()
  longPressTimer = setTimeout(() => {
    longPressInterval = setInterval(() => {
      button.click()
      vibrate(8)
    }, PRESS_INTERVAL)
  }, PRESS_DELAY)
}

function clearLongPress() {
  clearTimeout(longPressTimer)
  clearInterval(longPressInterval)
  longPressTimer = null
  longPressInterval = null
}

function changeScore(matchId, side, delta, label) {
  const match = currentMatch(matchId)
  if (!match || match.status === 'finished') return
  commit(
    label,
    () => {
      match[`score${side}`] = Math.max(0, Number(match[`score${side}`] || 0) + delta)
    },
    { skipRender: true }
  )
  updateMatchDom(matchId)
  renderShell()
  if (activeTab === 'stats') renderStats()
  vibrate(10)
}

function handleScoreInput(event) {
  const input = event.target.closest('[data-score]')
  const roundTitle = event.target.closest('[data-round-title]')
  if (roundTitle) {
    const round = state.rounds.find((item) => item.id === roundTitle.dataset.roundTitle)
    if (round) {
      round.title = cleanName(roundTitle.value) || 'Round'
      persist()
      renderShell()
    }
    return
  }
  if (!input) return
  input.value = input.value.replace(/\D/g, '').slice(0, 3)
  const match = currentMatch(input.dataset.id)
  if (!match || match.status === 'finished') return
  match[`score${input.dataset.side}`] = Math.max(0, Number(input.value) || 0)
  persist()
  updateFinishButton(input.dataset.id)
  renderShell()
}

function handleScoreFocus(event) {
  const input = event.target.closest('[data-score], [data-round-title]')
  if (!input) return
  input.dataset.beforeValue = input.value
  input.dataset.beforeSnapshot = snapshot()
}

function handleScoreCommit(event) {
  const input = event.target.closest('[data-score]')
  const roundTitle = event.target.closest('[data-round-title]')
  if (roundTitle) {
    if (roundTitle.dataset.beforeValue !== roundTitle.value && roundTitle.dataset.beforeSnapshot) {
      state.undoStack.push(roundTitle.dataset.beforeSnapshot)
      state.undoStack = state.undoStack.slice(-MAX_UNDO)
      state.redoStack = []
      addAction('Round title edited', roundTitle.value)
    }
    persist()
    renderShell()
    renderStats()
    return
  }
  if (!input) return
  if (input.dataset.beforeValue !== input.value && input.dataset.beforeSnapshot) {
    state.undoStack.push(input.dataset.beforeSnapshot)
    state.undoStack = state.undoStack.slice(-MAX_UNDO)
    state.redoStack = []
    addAction('Score edited', `Team ${input.dataset.side}: ${input.value || 0}`)
  }
  persist()
  renderShell()
  renderStats()
}

function handleScoreKeydown(event) {
  const input = event.target.closest('[data-score]')
  if (!input || event.key !== 'Enter') return
  event.preventDefault()
  const inputs = [...els.matchesList.querySelectorAll('[data-score]:not(:disabled)')]
  const next = inputs[inputs.indexOf(input) + 1]
  if (next) next.focus()
  else input.blur()
}

function updateMatchDom(matchId) {
  const match = currentMatch(matchId)
  const card = els.matchesList.querySelector(`[data-match-id="${matchId}"]`)
  if (!match || !card) return
  const scoreA = card.querySelector('[data-score][data-side="A"]')
  const scoreB = card.querySelector('[data-score][data-side="B"]')
  if (scoreA && document.activeElement !== scoreA) scoreA.value = match.scoreA
  if (scoreB && document.activeElement !== scoreB) scoreB.value = match.scoreB
  updateFinishButton(matchId)
  card.classList.toggle('score-leading-a', match.scoreA > match.scoreB)
  card.classList.toggle('score-leading-b', match.scoreB > match.scoreA)
}

function updateFinishButton(matchId) {
  const match = currentMatch(matchId)
  const button = els.matchesList.querySelector(`[data-action="finish-match"][data-id="${matchId}"]`)
  if (button && match) button.disabled = match.scoreA === match.scoreB || match.status === 'finished'
}

function currentMatch(matchId) {
  for (const round of state.rounds) {
    const match = round.matches.find((item) => item.id === matchId)
    if (match) return match
  }
  return null
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
  const stats = calculateStats()

  els.statsDashboard.innerHTML = `
    <article><span>Total score</span><strong>${stats.totalScore}</strong></article>
    <article><span>Average score</span><strong>${stats.averageScore}</strong></article>
    <article><span>Best round</span><strong>${stats.bestRound}</strong></article>
    <article><span>Worst round</span><strong>${stats.worstRound}</strong></article>
  `

  els.insightRail.innerHTML = renderInsights(rows)

  els.leaderboard.innerHTML = rows.length
    ? rows
    .map(
      (player, index) => `
        <article class="card ${index === 0 && player.gamesPlayed ? 'leader-card' : ''}">
          <div class="leader-row">
            <strong>#${index + 1} ${escapeHtml(player.name)}</strong>
            <span class="pill">${winRate(player)}% WR</span>
          </div>
          <div class="card-row">
            <span>${player.wins}W / ${player.losses}L · streak ${streak(player.id)}</span>
            <span>${pointDiff(player)} diff · ${player.rating.toFixed(1)} rating</span>
          </div>
          <div class="sparkline" aria-label="Performance over time">${sparkline(player.id)}</div>
        </article>
      `
    )
    .join('')
    : emptyState('Stats unlock after setup', 'Add players and finish a match to build a leaderboard.', 'Your best streaks and momentum will appear here.')

  els.historyList.innerHTML = state.history.length
    ? [...state.history]
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
    : emptyState('No match history yet', 'Finished matches become a clean session timeline.', 'Use it to remember close games and rematches.')

  els.actionHistory.innerHTML = state.actions.length
    ? state.actions
    .slice(0, 18)
    .map(
      (action) => `
        <article class="card action-row">
          <span>${escapeHtml(action.label)}</span>
          <small>${escapeHtml(action.detail || formatTime(action.at))}</small>
        </article>
      `
    )
    .join('')
    : emptyState('No actions yet', 'Recent edits and scoring moments will show here.', 'Undo stays available when you need it.')
}

function calculateStats() {
  const scores = state.history.map((match) => match.scoreA + match.scoreB)
  const totalScore = scores.reduce((sum, score) => sum + score, 0)
  const averageScore = scores.length ? (totalScore / scores.length).toFixed(1) : '0'
  return {
    totalScore,
    averageScore,
    bestRound: scores.length ? Math.max(...scores) : 0,
    worstRound: scores.length ? Math.min(...scores) : 0
  }
}

function sparkline(playerId) {
  const marks = state.history
    .filter((match) => match.teamA.includes(playerId) || match.teamB.includes(playerId))
    .slice(-10)
    .map((match) => {
      const won =
        (match.winner === 'A' && match.teamA.includes(playerId)) ||
        (match.winner === 'B' && match.teamB.includes(playerId))
      return `<i class="${won ? 'win' : 'loss'}"></i>`
    })
    .join('')
  return marks || '<i></i><i></i><i></i>'
}

function streak(playerId) {
  let count = 0
  for (let index = state.history.length - 1; index >= 0; index -= 1) {
    const match = state.history[index]
    const played = match.teamA.includes(playerId) || match.teamB.includes(playerId)
    if (!played) continue
    const won =
      (match.winner === 'A' && match.teamA.includes(playerId)) ||
      (match.winner === 'B' && match.teamB.includes(playerId))
    if (!won) break
    count += 1
  }
  return count
}

function sessionPulse() {
  const completedToday = state.history.filter((match) => isToday(match.finishedAt)).length
  const activePlayers = state.players.filter((player) => player.active).length
  const topStreak = Math.max(0, ...state.players.map((player) => streak(player.id)))
  return [
    `${activePlayers} active`,
    `${completedToday} today`,
    topStreak ? `${topStreak} win streak` : 'fresh session'
  ]
}

function renderInsights(rows) {
  const stats = calculateStats()
  const topPlayer = rows.find((player) => player.gamesPlayed)
  const comeback = state.history
    .slice(-12)
    .reduce((best, match) => Math.max(best, Math.abs(match.scoreA - match.scoreB)), 0)
  const insights = [
    {
      label: 'Momentum',
      value: topPlayer ? `${topPlayer.name} leads at ${winRate(topPlayer)}%` : 'Waiting for first result'
    },
    {
      label: 'Session pace',
      value: stats.averageScore === '0' ? 'Score one match to unlock rhythm' : `${stats.averageScore} average points`
    },
    {
      label: 'Achievement',
      value: comeback >= 6 ? `Biggest swing: ${comeback} points` : `${state.history.length} matches logged`
    }
  ]

  return insights
    .map(
      (item) => `
        <article>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join('')
}

function enterLiveMode(matchId) {
  liveMatchId = matchId
  document.body.classList.add('live-mode')
  renderRound()
  requestAnimationFrame(() => {
    els.matchesList.querySelector(`[data-match-id="${matchId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function exitLiveMode() {
  if (!liveMatchId) return
  liveMatchId = null
  document.body.classList.remove('live-mode')
  if (activeTab === 'round') renderRound()
}

function emptyState(title, body, detail = '') {
  return `
    <article class="empty-state">
      <span></span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </article>
  `
}

function isToday(value) {
  const date = new Date(value)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'pickleballstats-backup.json'
  link.click()
  URL.revokeObjectURL(url)
}

function importState(event) {
  const file = event.target.files?.[0]
  if (!file) return
  file.text().then((text) => {
    commit('JSON imported', () => {
      state = normalizeState(JSON.parse(text))
    })
  })
}

async function shareState() {
  const text = JSON.stringify(state)
  const shareData = {
    title: 'Pickleball Stats',
    text,
    url: location.href
  }
  if (navigator.share) {
    await navigator.share(shareData).catch(() => {})
  } else {
    await navigator.clipboard?.writeText(text)
    addAction('State copied to clipboard')
    persist()
    renderStats()
  }
}

function playerName(playerId) {
  return state.players.find((player) => player.id === playerId)?.name || 'Unknown'
}

function teamLabel(match, side) {
  return (side === 'A' ? match.teamA : match.teamB).map(playerName).join(' / ')
}

function pointDiff(player) {
  return player.pointsScored - player.pointsAgainst
}

function winRate(player) {
  return player.gamesPlayed ? Math.round((player.wins / player.gamesPlayed) * 100) : 0
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value)
  )
}

function pulse(element) {
  element.classList.remove('tap-pulse')
  requestAnimationFrame(() => element.classList.add('tap-pulse'))
}

function vibrate(ms) {
  if ('vibrate' in navigator) navigator.vibrate(ms)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  }
}
