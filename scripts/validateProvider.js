import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDataFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}: ${error.message}`);
    return null;
  }
}

function validateProvider(dataFile, provider) {
  console.log(`🔍 Validating ${provider} provider compatibility...\n`);

  const data = loadDataFile(dataFile);
  if (!data) {
    return;
  }

  const songs = data.songs || [];
  const totalSongs = songs.length;

  let availableSongs = 0;
  let missingSongs = [];

  songs.forEach(song => {
    let hasProvider = false;

    if (provider === 'deezer') {
      hasProvider = song.deezerId !== null && song.deezerId !== undefined;
    } else if (provider === 'spotify') {
      hasProvider = song.spotifyId !== null && song.spotifyId !== undefined;
    }

    if (hasProvider) {
      availableSongs++;
    } else {
      missingSongs.push(song);
    }
  });

  const coverage = (availableSongs / totalSongs) * 100;

  console.log(`📊 ${provider.toUpperCase()} Provider Analysis:`);
  console.log(`   Total songs: ${totalSongs}`);
  console.log(`   Available songs: ${availableSongs}`);
  console.log(`   Missing songs: ${missingSongs.length}`);
  console.log(`   Coverage: ${coverage.toFixed(1)}%`);

  // Recommendation
  if (coverage >= 95) {
    console.log(`✅ EXCELLENT - Ready for production use`);
  } else if (coverage >= 85) {
    console.log(`✅ GOOD - Suitable for use with minor gaps`);
  } else if (coverage >= 70) {
    console.log(`⚠️  FAIR - Consider if missing songs are important`);
  } else {
    console.log(`❌ POOR - Not recommended, too many missing songs`);
  }

  if (missingSongs.length > 0 && missingSongs.length <= 10) {
    console.log(`\n❌ Missing ${provider} IDs for:`);
    missingSongs.forEach(song => {
      console.log(`   - ${song.title} (${song.album})`);
    });
  } else if (missingSongs.length > 10) {
    console.log(`\n❌ Missing ${provider} IDs for ${missingSongs.length} songs:`);
    missingSongs.slice(0, 5).forEach(song => {
      console.log(`   - ${song.title} (${song.album})`);
    });
    console.log(`   ... and ${missingSongs.length - 5} more`);
  }

  return {
    total: totalSongs,
    available: availableSongs,
    missing: missingSongs.length,
    coverage: coverage,
    ready: coverage >= 85
  };
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Provider Validation Tool

Usage: node scripts/validateProvider.js [data-file] [provider]

Arguments:
  data-file     Path to song data JSON file (default: src/data/triples-songs.json)
  provider      Provider to validate: 'spotify' or 'deezer' (default: 'deezer')

Examples:
  node scripts/validateProvider.js                                    # Check deezer on default file
  node scripts/validateProvider.js src/data/triples-merged-songs.json deezer
  node scripts/validateProvider.js src/data/triples-songs.json spotify
    `);
    process.exit(0);
  }

  const dataFile = args[0] || path.join(__dirname, '..', 'src', 'data', 'triples-songs.json');
  const provider = args[1] || 'deezer';

  if (!['spotify', 'deezer'].includes(provider.toLowerCase())) {
    console.error('❌ Provider must be either "spotify" or "deezer"');
    process.exit(1);
  }

  return { dataFile, provider: provider.toLowerCase() };
}

// Main execution
const { dataFile, provider } = parseArgs();

console.log(`🔍 Validating provider compatibility:`);
console.log(`   Data file: ${dataFile}`);
console.log(`   Provider: ${provider}\n`);

const result = validateProvider(dataFile, provider);

if (result) {
  console.log(`\n💡 Recommendation: ${result.ready ? 'Ready to use!' : 'Need more data first'}`);

  if (!result.ready && provider === 'deezer') {
    console.log(`\n📋 To improve Deezer coverage:`);
    console.log(`   1. Run: npm run fetch-deezer-triples`);
    console.log(`   2. Run: npm run merge-song-data`);
    console.log(`   3. Validate again with merged data`);
  }
}
