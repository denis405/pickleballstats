# Pickleball Stats

Simple client-side HTML5 app for managing pickleball players, generating rounds, entering scores courtside, and tracking local statistics.

## Features

- Player CRUD, activity toggles, search, sorting, and bulk add
- Doubles round generation with simple rating balance and rest rotation
- Fast mobile score entry with +1 / -1 controls
- Local persistence through localStorage
- Leaderboard, win rate, point differential, rating, and match history
- JSON export backup
- No backend, no build step, no npm, no Actions workflow

## Files

- `index.html` - app markup
- `styles.css` - responsive mobile-first styles
- `app.js` - all app logic and storage
- `public/icon.svg` and `public/manifest.webmanifest` - optional install metadata

## Run

Open `index.html` in a browser.

## Deploy

For GitHub Pages, publish the repository from the `main` branch root. There is no build command.

Expected URL: `https://denis405.github.io/pickleballstats/`

## Storage

All match data stays on the device in `localStorage`.
