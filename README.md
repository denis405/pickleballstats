# Pickleball Stats

Offline-first HTML5 web app for managing pickleball players, generating balanced rounds, entering scores courtside, and tracking local statistics.

## Features

- Player CRUD, activity toggles, search, sorting, and bulk add
- Singles, doubles, and rotation-style round generation
- Matchmaking that scores partner repeats, opponent repeats, rating balance, and rest rotation
- Fast mobile score entry with +1 / -1 controls
- Undo and redo for player changes, round generation, score changes, and swaps
- Local persistence through IndexedDB with localStorage fallback
- Leaderboards, win rate, point differential, streaks, and charted rankings
- JSON export/import backup
- PWA setup for installability and offline caching
- GitHub Pages deployment workflow

## Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

## Deploy

GitHub Actions deploys `main` to GitHub Pages. Locally, the build command used by the deploy flow is:

```bash
npm run deploy
```

The Vite base path is configured for:

```text
https://denis405.github.io/pickleballstats/
```

## Storage

All match data stays on the device. The app writes the full state to IndexedDB and keeps a localStorage fallback for recovery if IndexedDB is unavailable.
