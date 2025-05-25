import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadSongData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}: ${error.message}`);
    return null;
  }
}

function normalizeSongTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function compareCatalogs(spotifyFile, deezerFile) {
  console.log('🔍 Comparing Spotify vs Deezer catalogs...\n');

  const spotifyData = loadSongData(spotifyFile);
  const deezerData = loadSongData(deezerFile);

  if (!spotifyData || !deezerData) {
    console.error('❌ Could not load both catalog files');
    return;
  }

  const spotifySongs = spotifyData.songs || [];
  const deezerSongs = deezerData.songs || [];

  console.log(`📊 Catalog Size Comparison:`);
  console.log(`   Spotify: ${spotifySongs.length} songs`);
  console.log(`   Deezer:  ${deezerSongs.length} songs`);

  // Create normalized title maps
  const spotifyTitles = new Map();
  const deezerTitles = new Map();

  spotifySongs.forEach(song => {
    const normalized = normalizeSongTitle(song.title);
    spotifyTitles.set(normalized, song);
  });

  deezerSongs.forEach(song => {
    const normalized = normalizeSongTitle(song.title);
    deezerTitles.set(normalized, song);
  });

  // Find matches and differences
  const bothPlatforms = [];
  const spotifyOnly = [];
  const deezerOnly = [];

  spotifyTitles.forEach((song, normalizedTitle) => {
    if (deezerTitles.has(normalizedTitle)) {
      const deezerSong = deezerTitles.get(normalizedTitle);
      bothPlatforms.push({
        title: song.title,
        spotify: song,
        deezer: deezerSong
      });
    } else {
      spotifyOnly.push(song);
    }
  });

  deezerTitles.forEach((song, normalizedTitle) => {
    if (!spotifyTitles.has(normalizedTitle)) {
      deezerOnly.push(song);
    }
  });

  console.log(`\n🎵 Song Availability Analysis:`);
  console.log(`   Available on both: ${bothPlatforms.length} songs`);
  console.log(`   Spotify only: ${spotifyOnly.length} songs`);
  console.log(`   Deezer only: ${deezerOnly.length} songs`);

  const coverage = bothPlatforms.length / spotifySongs.length * 100;
  console.log(`   Deezer coverage: ${coverage.toFixed(1)}% of Spotify catalog`);

  // Preview URL analysis
  const spotifyWithPreviews = spotifySongs.filter(s => s.previewUrl).length;
  const deezerWithPreviews = deezerSongs.filter(s => s.deezerPreviewUrl).length;

  console.log(`\n🎧 Preview URL Availability:`);
  console.log(`   Spotify: ${spotifyWithPreviews}/${spotifySongs.length} (${(spotifyWithPreviews/spotifySongs.length*100).toFixed(1)}%)`);
  console.log(`   Deezer:  ${deezerWithPreviews}/${deezerSongs.length} (${(deezerWithPreviews/deezerSongs.length*100).toFixed(1)}%)`);

  // Show songs missing from Deezer
  if (spotifyOnly.length > 0) {
    console.log(`\n❌ Songs missing from Deezer:`);
    spotifyOnly.slice(0, 10).forEach(song => {
      console.log(`   - ${song.title} (${song.album})`);
    });
    if (spotifyOnly.length > 10) {
      console.log(`   ... and ${spotifyOnly.length - 10} more`);
    }
  }

  // Show additional Deezer songs
  if (deezerOnly.length > 0) {
    console.log(`\n✅ Additional songs on Deezer:`);
    deezerOnly.slice(0, 10).forEach(song => {
      console.log(`   + ${song.title} (${song.album})`);
    });
    if (deezerOnly.length > 10) {
      console.log(`   ... and ${deezerOnly.length - 10} more`);
    }
  }

  // Recommendation
  console.log(`\n💡 Migration Recommendation:`);
  if (coverage >= 90) {
    console.log(`✅ HIGHLY RECOMMENDED - Excellent coverage (${coverage.toFixed(1)}%)`);
  } else if (coverage >= 75) {
    console.log(`⚠️  CONSIDER WITH CAUTION - Good coverage (${coverage.toFixed(1)}%) but some songs missing`);
  } else {
    console.log(`❌ NOT RECOMMENDED - Poor coverage (${coverage.toFixed(1)}%) - too many missing songs`);
  }

  // Preview URL recommendation
  const deezerPreviewPercentage = deezerWithPreviews/deezerSongs.length*100;
  const spotifyPreviewPercentage = spotifyWithPreviews/spotifySongs.length*100;

  if (deezerPreviewPercentage > spotifyPreviewPercentage) {
    console.log(`🎵 PREVIEW ADVANTAGE: Deezer has better preview coverage (+${(deezerPreviewPercentage - spotifyPreviewPercentage).toFixed(1)}%)`);
  } else if (spotifyPreviewPercentage > deezerPreviewPercentage) {
    console.log(`🎵 PREVIEW DISADVANTAGE: Spotify has better preview coverage (+${(spotifyPreviewPercentage - deezerPreviewPercentage).toFixed(1)}%)`);
  } else {
    console.log(`🎵 PREVIEW EQUAL: Similar preview coverage on both platforms`);
  }

  return {
    spotify: spotifySongs.length,
    deezer: deezerSongs.length,
    bothPlatforms: bothPlatforms.length,
    spotifyOnly: spotifyOnly.length,
    deezerOnly: deezerOnly.length,
    coverage: coverage,
    spotifyPreviews: spotifyWithPreviews,
    deezerPreviews: deezerWithPreviews,
    recommendation: coverage >= 90 ? 'HIGHLY_RECOMMENDED' : coverage >= 75 ? 'CONSIDER' : 'NOT_RECOMMENDED'
  };
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Catalog Comparison Tool

Usage: node scripts/compareCatalogs.js [spotify-file] [deezer-file]

Arguments:
  spotify-file    Path to Spotify songs JSON file (default: src/data/triples-songs.json)
  deezer-file     Path to Deezer songs JSON file (default: src/data/triples-deezer-songs.json)

Examples:
  node scripts/compareCatalogs.js
  node scripts/compareCatalogs.js custom-spotify.json custom-deezer.json
    `);
    process.exit(0);
  }

  const spotifyFile = args[0] || path.join(__dirname, '..', 'src', 'data', 'triples-songs.json');
  const deezerFile = args[1] || path.join(__dirname, '..', 'src', 'data', 'triples-deezer-songs.json');

  return { spotifyFile, deezerFile };
}

// Main execution
const { spotifyFile, deezerFile } = parseArgs();

console.log(`🔍 Comparing catalogs:`);
console.log(`   Spotify: ${spotifyFile}`);
console.log(`   Deezer:  ${deezerFile}\n`);

const result = compareCatalogs(spotifyFile, deezerFile);

if (result) {
  console.log(`\n📋 Summary Statistics:`);
  console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
  console.log(`   Missing from Deezer: ${result.spotifyOnly} songs`);
  console.log(`   Extra on Deezer: ${result.deezerOnly} songs`);
  console.log(`   Recommendation: ${result.recommendation}`);
}
