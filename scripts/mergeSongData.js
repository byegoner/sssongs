import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both Spotify and Deezer data files
function loadDataFile(filePath) {
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

function mergeSongData(spotifyFile, deezerFile, outputFile) {
  console.log('🔄 Merging Spotify and Deezer song data...\n');

  const spotifyData = loadDataFile(spotifyFile);
  const deezerData = loadDataFile(deezerFile);

  if (!spotifyData) {
    console.error('❌ Could not load Spotify data file');
    return;
  }

  if (!deezerData) {
    console.error('⚠️ Could not load Deezer data file - using Spotify only');
    // Just copy Spotify data with null Deezer fields
    const mergedData = {
      ...spotifyData,
      songs: spotifyData.songs.map(song => ({
        ...song,
        deezerId: null,
        deezerPreviewUrl: null
      }))
    };

    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
    console.log(`✅ Created fallback file: ${outputFile}`);
    return;
  }

  const spotifySongs = spotifyData.songs || [];
  const deezerSongs = deezerData.songs || [];

  console.log(`📊 Input data:`);
  console.log(`   Spotify songs: ${spotifySongs.length}`);
  console.log(`   Deezer songs: ${deezerSongs.length}`);

  // Create a map of Deezer songs by normalized title for matching
  const deezerMap = new Map();
  deezerSongs.forEach(song => {
    const normalized = normalizeSongTitle(song.title);
    deezerMap.set(normalized, song);
  });

  // Merge Spotify songs with Deezer data where matches exist
  let matchCount = 0;
  const mergedSongs = spotifySongs.map(spotifySong => {
    const normalized = normalizeSongTitle(spotifySong.title);
    const deezerSong = deezerMap.get(normalized);

    if (deezerSong) {
      matchCount++;
      console.log(`   ✅ Matched: ${spotifySong.title} → Deezer ID: ${deezerSong.deezerId}`);
    }

    return {
      ...spotifySong,
      // Add Deezer data if available
      deezerId: deezerSong?.deezerId || null,
      deezerPreviewUrl: deezerSong?.deezerPreviewUrl || null
    };
  });

  const mergedData = {
    ...spotifyData,
    songs: mergedSongs,
    // Add merge metadata
    mergeInfo: {
      spotifyCount: spotifySongs.length,
      deezerCount: deezerSongs.length,
      matchedCount: matchCount,
      mergedAt: new Date().toISOString(),
      coveragePercentage: Math.round((matchCount / spotifySongs.length) * 100)
    }
  };

  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));

  console.log(`\n✅ Merge complete!`);
  console.log(`   Total songs: ${mergedSongs.length}`);
  console.log(`   Matched with Deezer: ${matchCount} (${Math.round((matchCount / spotifySongs.length) * 100)}%)`);
  console.log(`   Output file: ${outputFile}`);

  // Show songs that couldn't be matched
  const unmatchedSpotify = spotifySongs.filter(song => {
    const normalized = normalizeSongTitle(song.title);
    return !deezerMap.has(normalized);
  });

  if (unmatchedSpotify.length > 0) {
    console.log(`\n⚠️ Songs not found on Deezer:`);
    unmatchedSpotify.slice(0, 10).forEach(song => {
      console.log(`   - ${song.title} (${song.album})`);
    });
    if (unmatchedSpotify.length > 10) {
      console.log(`   ... and ${unmatchedSpotify.length - 10} more`);
    }
  }

  return mergedData;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔄 Song Data Merger

Usage: node scripts/mergeSongData.js [spotify-file] [deezer-file] [output-file]

Arguments:
  spotify-file    Path to Spotify songs JSON file (default: src/data/triples-songs.json)
  deezer-file     Path to Deezer songs JSON file (default: src/data/triples-deezer-songs.json)
  output-file     Output file path (default: src/data/triples-merged-songs.json)

Examples:
  node scripts/mergeSongData.js
  node scripts/mergeSongData.js spotify.json deezer.json merged.json
    `);
    process.exit(0);
  }

  const spotifyFile = args[0] || path.join(__dirname, '..', 'src', 'data', 'triples-songs.json');
  const deezerFile = args[1] || path.join(__dirname, '..', 'src', 'data', 'triples-deezer-songs.json');
  const outputFile = args[2] || path.join(__dirname, '..', 'src', 'data', 'triples-merged-songs.json');

  return { spotifyFile, deezerFile, outputFile };
}

// Main execution
const { spotifyFile, deezerFile, outputFile } = parseArgs();

console.log(`🔄 Merging song data:`);
console.log(`   Spotify: ${spotifyFile}`);
console.log(`   Deezer:  ${deezerFile}`);
console.log(`   Output:  ${outputFile}\n`);

const result = mergeSongData(spotifyFile, deezerFile, outputFile);

if (result) {
  console.log(`\n🎉 Merge completed successfully!`);
  console.log(`   Coverage: ${result.mergeInfo.coveragePercentage}%`);
  console.log(`   Ready to use with Deezer embeds!`);
}
