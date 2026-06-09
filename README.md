# Pickleball Stats

Simple client-side HTML5 app for managing pickleball players, generating rounds, entering scores courtside, and tracking local statistics.

## Features

- Player CRUD, activity toggles, search, sorting, and bulk add
- Americano and Mexicano round generation with simple rating balance and rest rotation
- Stable mobile score entry with numeric inputs, + / - controls, long-press, and no input re-render while typing
- Readable action history
- Full reset with confirmation modal
- Quick player presets, generated names, avatars, and drag-and-drop player reorder
- Round titles, timestamps, collapse/delete, duplicate previous round, and quick round
- Local persistence through localStorage
- Leaderboard, total score, average score, best/worst round, streaks, point differential, rating, match history, and simple performance sparklines
- JSON export/import
- PWA/offline support through a service worker
- No backend, no build step, no npm, no Actions workflow

## Files

- `index.html` - app markup
- `styles.css` - responsive mobile-first styles
- `app.js` - all app logic and storage
- `public/icon.svg` and `public/manifest.webmanifest` - optional install metadata
- `sw.js` - offline cache

## Run

Open `index.html` in a browser.

## Deploy

For GitHub Pages, publish the repository from the `main` branch root. There is no build command.

Expected URL: `https://denis405.github.io/pickleballstats/`

## Storage

All match data stays on the device in `localStorage`.
