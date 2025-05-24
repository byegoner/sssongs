# K-pop Song Sorter

A song ranking app using Elo rating system for K-pop groups, built with Vite and vanilla JavaScript.

## Features

- **Elo Rating System**: Fair ranking algorithm that adapts based on user choices
- **Spotify Integration**: Embedded song previews for each track
- **Smart Distribution**: Weighted selection ensures all songs get fair representation
- **Progress Tracking**: Visual progress bar and round counter
- **Responsive Design**: Works on desktop and mobile devices
- **Statistics**: Detailed stats on song appearances and ranking distribution

## Quick Start

1. Clone and install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Spotify API Setup (Development)

To fetch songs from Spotify API:

1. Get credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Copy `.env.example` to `.env` and add your credentials
3. Fetch songs:

```bash
npm run fetch-triples              # Fetch tripleS songs
npm run fetch-songs "NewJeans"     # Fetch any artist
```

## How It Works

The app uses a 3-option Elo rating system where:

- Users pick their favorite from 3 songs per round
- Winner gains rating points vs the 2 losers
- Weighted selection ensures fair song distribution
- Final rankings based on Elo scores after ~35 rounds

## Deployment

Perfect for static hosting on:

- Cloudflare Pages
- Vercel
- Netlify
- GitHub Pages

Build command: `npm run build`  
Output directory: `dist`

## Project Structure

```
src/
├── songSorter.js     # Core Elo rating logic
├── main.js           # Game UI and interactions
├── style.css         # Responsive styling
└── data/             # Song data files
scripts/
└── fetchSpotifySongs.js  # Spotify API helper
```

## License

MIT
