# tripleS Song Sorter

A K-pop song ranking app using an Elo rating system with **dual-provider support** (Spotify + Deezer), optimized for mobile-first design with sophisticated ranking algorithms.

## 🎯 Recent Updates

### **Deezer Integration (Latest)**
- **Dual-provider support** - Switch between Spotify and Deezer embeds
- **Cleaner Deezer embeds** with better performance and less clutter
- **Automatic song matching** between Spotify and Deezer catalogs
- **Easy provider switching** via configuration

## 🚀 Quick Start

```bash
npm install
npm run dev          # Start development server
npm run build        # Build for production
```

## 🎵 Deezer Migration Workflow

### **Step 1: Fetch Deezer Data**
```bash
npm run fetch-deezer-triples
```
This creates `src/data/triples-deezer-songs.json` with Deezer song IDs and metadata.

### **Step 2: Compare Catalogs**
```bash
npm run compare-catalogs
```
Shows coverage analysis and missing songs between Spotify and Deezer.

### **Step 3: Merge Data**
```bash
npm run merge-song-data
```
Creates `src/data/triples-merged-songs.json` with both Spotify and Deezer IDs.

### **Step 4: Switch Provider**
In `src/main.js`, change:
```javascript
const MUSIC_PROVIDER = 'deezer'; // or 'spotify'
```

## 🔧 Provider Configuration

### **Current Settings:**
- **Provider**: Deezer (configurable in `src/main.js`)
- **No fallback**: Uses only the selected provider (cleaner, more predictable)
- **Automatic filtering**: Only songs with valid provider IDs are included

### **Switching Providers:**
```javascript
// In src/main.js - change this line:
const MUSIC_PROVIDER = 'deezer';  // Clean, fast embeds
// OR
const MUSIC_PROVIDER = 'spotify'; // Full-featured embeds
```

### **Validation:**
```bash
npm run validate-provider                    # Check current data compatibility
npm run validate-provider [file] [provider] # Check specific provider
```

## 📊 Deezer vs Spotify Comparison

| Feature | Deezer | Spotify |
|---------|---------|---------|
| **Performance** | ⚡ Faster loading | 🐌 Slower, heavier |
| **Visual Design** | ✨ Cleaner, minimal | 📱 Full-featured UI |
| **Authentication** | ✅ None required | ❌ Complex API setup |
| **Sync Complexity** | ✅ Simple/native | ❌ Complex messaging |
| **Global Availability** | ✅ Better coverage | ⚠️ Some regions blocked |

## 🎯 Core Features

### Tech Stack
- **Frontend**: Vanilla JavaScript with ES modules, Vite bundler
- **Music Providers**: Dual support (Spotify + Deezer)
- **Styling**: CSS with responsive design (mobile-first)
- **Deployment**: Static hosting ready (Cloudflare Pages)

### Elo Rating System
- **70-round progressive system** with 4 distinct phases
- **3-option rounds**: User picks 1 winner from 3 songs per round
- **Progressive K-factors**: 24 → 32 → 40 → 48 across phases
- **Smart song selection** with graduated filtering and discovery prioritization

### Mobile-First Design
- **Compact embed containers** with circular select buttons
- **Touch-optimized controls** with smooth animations
- **Responsive layout** that scales from mobile to desktop
- **Dark concert theme** with glassmorphism effects

## 📁 Project Structure

```
src/
├── main.js                 # Dual-provider UI and game logic
├── songSorter.js           # Core Elo rating algorithm + embed URLs
├── style.css               # Responsive design
└── data/
    ├── triples-songs.json         # Original Spotify data
    ├── triples-deezer-songs.json  # Deezer catalog (after fetch)
    └── triples-merged-songs.json  # Combined data (after merge)

scripts/
├── fetchSpotifySongs.js    # Spotify API helper
├── fetchDeezerSongs.js     # Deezer API helper (no auth needed!)
├── compareCatalogs.js      # Catalog comparison analysis
└── mergeSongData.js        # Data merger for dual-provider support
```

## 🛠️ Development Scripts

### **Data Management:**
```bash
npm run fetch-deezer-triples    # Fetch tripleS from Deezer
npm run compare-catalogs         # Compare Spotify vs Deezer
npm run merge-song-data          # Merge both catalogs
npm run validate-provider        # Check provider compatibility
```

### **Testing:**
```bash
# Open test-embeds.html in browser to compare embed performance
npm run dev  # Start dev server, then visit /test-embeds.html
```

## 🚢 Deployment

### Cloudflare Pages
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Subpath deployment**: Configure for `/songs` path

### Environment Variables
For data fetching (optional):
```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
# Deezer requires no authentication! 🎉
```

## 📱 Share Functionality

- **Web Share API** for native mobile sharing
- **Image generation** with html2canvas
- **Desktop fallback** with download + clipboard copy
- **High-quality ranking cards** with app branding

## 🔄 Migration Benefits

### **Performance Improvements:**
- **⚡ Faster embed loading** - Deezer widgets are lighter
- **📱 Better mobile experience** - Optimized for touch devices
- **🔧 Simplified codebase** - Single provider, no fallback complexity
- **🌍 Better global availability** - Fewer regional restrictions
- **🎯 Predictable behavior** - No uncertainty about which embed loads

### **Maintenance Benefits:**
- **🚫 No authentication complexity** - Deezer API works without tokens
- **📊 Automatic updates** - New releases appear faster
- **🔍 Better search accuracy** - Direct artist/album matching
- **🛠️ Easier debugging** - Single provider, simpler logic
- **✅ Data validation** - Built-in provider compatibility checking

## 🎨 Theme & Styling

- **Concert lighting effects** with animated gradients
- **Glassmorphism cards** with backdrop blur
- **Progressive enhancement** from mobile to desktop
- **Provider-agnostic design** that works with both Spotify and Deezer

## 🔮 Future Enhancements

### **Planned Features:**
- **User accounts** - Save and share personal rankings
- **Multiple artists** - Expand beyond tripleS
- **Advanced analytics** - Detailed ranking insights
- **Playlist export** - Generate playlists on chosen provider
- **A/B testing** - Compare provider performance in real-time

### **Technical Improvements:**
- **PWA features** - Offline capability
- **Performance monitoring** - Real-time metrics
- **Accessibility** - Screen reader support

---

**Ready for production with dual-provider support and significantly improved performance!** 🎵✨

### **Quick Migration Checklist:**
- [ ] `npm run fetch-deezer-triples`
- [ ] `npm run compare-catalogs`
- [ ] `npm run merge-song-data`
- [ ] Set `MUSIC_PROVIDER = 'deezer'` in `src/main.js`
- [ ] Test performance on mobile devices
- [ ] Deploy and enjoy faster embeds! 🚀
