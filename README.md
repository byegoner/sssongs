# tripleS Song Sorter

A K-pop song ranking app using an advanced Elo rating system with Spotify integration, featuring a mobile-first design and sophisticated ranking algorithms.

## ✨ Features

### Core Functionality
- **Advanced Elo Rating System**: 4-phase graduated filtering for optimal ranking accuracy
- **60 Rounds Total**: 50 regular rounds + 10 "Final Showdown" rounds with top 25% songs
- **Spotify Integration**: Real-time embedded song previews with aggressive caching
- **Smart Song Selection**: Weighted distribution with neglected song safety net

### Ranking Phases
1. **Phase 1 (Rounds 1-20)**: Full Discovery - All songs available
2. **Phase 2 (Rounds 21-35)**: Top 75% songs - Focus on promising tracks
3. **Phase 3 (Rounds 36-50)**: Top 50% songs - Precision ranking
4. **🏆 Final Showdown (Rounds 51-60)**: Top 25% songs - Elite competition with burning progress bar

### UI/UX Excellence
- **Mobile-First Design**: Optimized for touch devices with compact layouts
- **Dark Concert Theme**: Glassmorphism design with concert lighting effects
- **Responsive Embeds**: Different layouts for mobile vs desktop
- **Loading Optimization**: Aggressive embed preloading for instant transitions
- **Progress Visualization**: Burning progress bar effect in Final Showdown

### Performance Optimizations
- **Aggressive Caching**: 6 rounds of Spotify embeds preloaded simultaneously
- **Smart State Management**: Proper future round prediction with state copying
- **Instant Switching**: Zero-delay round transitions with cached content
- **Memory Management**: Automatic cleanup of unused embeds

## 🚀 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Development server:**
```bash
npm run dev
```

3. **Production build:**
```bash
npm run build
```

## 🎵 Spotify Integration

### Fetch Songs (Development)
1. Get credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Copy `.env.example` to `.env` and add your credentials
3. Fetch songs with advanced filtering:

```bash
# Basic tripleS fetch
npm run fetch-triples

# Advanced filtering options
node scripts/fetchSpotifySongs.js "tripleS" --ignore-instrumental --min-duration 120

# Available filters
--ignore-instrumental     # Skip instrumental albums/tracks
--ignore-remix           # Skip remix tracks
--ignore "keywords"      # Skip content with specific keywords
--include-only "albums"  # Only include specific albums
--min-duration 120       # Skip tracks under 2 minutes
```

### Current Dataset
- **81 tripleS songs** (instrumentals filtered out)
- **Real Spotify track IDs** for working embeds
- **Complete metadata**: Titles, albums, release dates, durations

## 🎯 How the Algorithm Works

### Elo Rating System
- **Starting rating**: 1200 points per song
- **K-factor**: 32 (competitive standard)
- **3-way comparisons**: Winner beats both losers simultaneously
- **Graduated filtering**: Focus computational power where it matters most

### Phase Transitions
- **Round display**: Shows "Round X/50" then switches to "Final Showdown X"
- **Progress reset**: Progress bar resets and burns during final phase
- **Smart selection**: No neglected song recovery in Final Showdown
- **Elite competition**: Only top 25% songs battle for final rankings

### Ranking Output
- **Top 10 display**: Clean list without Elo scores or statistics
- **Pure rankings**: Focus on song order, not underlying math
- **Mobile optimized**: Song titles appear below embeds for loading cues

## 📱 Responsive Design

### Mobile Layout
- **Compact cards**: Horizontal embed + circular button (50px)
- **Song titles**: Small text below embeds for loading feedback
- **Touch optimized**: Large tap targets with smooth animations
- **Tight spacing**: Optimized gaps between elements

### Desktop Layout
- **3-column grid**: Traditional card layout with larger embeds (300x180px)
- **Full song info**: Titles and albums below embeds
- **Text buttons**: "Choose This Song" replacing mobile checkmarks

### Tablet Layout
- **Auto-responsive**: 2-column grid that adapts to screen width
- **Balanced design**: Maintains visual hierarchy across breakpoints

## 🎨 Theme & Styling

### Concert Vibes Aesthetic
- **Color palette**: Concert pink (#ff6b9d), stage purple (#c471ed), LED cyan (#12c2e9)
- **Background**: Deep gradient simulating concert venue atmosphere
- **Glassmorphism**: Blurred transparent cards with subtle borders
- **Lighting effects**: Radial gradients and animated light sweeps

### Visual Effects
- **Shimmer animations**: Moving highlights on progress bars
- **Burning progress**: Fire-colored animations during Final Showdown
- **Hover interactions**: Light sweeps and glow effects
- **Smooth transitions**: Cubic-bezier easing for premium feel

## 🚀 Deployment

### Static Hosting Ready
Perfect for deployment on:
- **Cloudflare Pages** (recommended)
- Vercel
- Netlify
- GitHub Pages

### Build Configuration
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment**: Static site (no server required)

## 📁 Project Structure

```
src/
├── songSorter.js           # Core Elo rating logic with 4-phase system
├── main.js                 # Game UI, Spotify integration, and caching
├── style.css               # Dark concert theme with responsive design
└── data/
    └── triples-songs.json  # Song database with Spotify IDs

scripts/
└── fetchSpotifySongs.js    # Spotify API helper with filtering options

index.html                  # Main entry point with footer credits
vite.config.js             # Build configuration
package.json               # Dependencies and scripts
```

## 🔄 Recent Updates

### Version 2.0 Features
- **Final Showdown phase** with top 25% filtering and burning effects
- **Mobile song titles** for loading feedback
- **Aggressive embed caching** with 6-round lookahead
- **Duplicate song fix** in neglected song safety net
- **Responsive button sizing** (50px mobile, full desktop)
- **Footer credits** with theme-matching design

### Performance Improvements
- **Instant round transitions** with proper state copying
- **Smart preloading** for current + future rounds
- **Memory management** with automatic embed cleanup
- **Loading optimization** eliminates Spotify embed delays

## 👨‍💻 Credits

Made with ♡ by [@celdaris](https://x.com/celdaris)

## 📄 License

MIT
