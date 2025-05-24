import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnv();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables');
  process.exit(1);
}

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

async function searchArtist(artistName, token) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  return data.artists.items[0];
}

async function getArtistAlbums(artistId, token) {
  const albums = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=${limit}&offset=${offset}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = await response.json();
    albums.push(...data.items);

    if (data.items.length < limit) break;
    offset += limit;
  }

  return albums;
}

async function getAlbumTracks(albumId, token) {
  const tracks = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?market=US&limit=${limit}&offset=${offset}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = await response.json();
    tracks.push(...data.items);

    if (data.items.length < limit) break;
    offset += limit;
  }

  return tracks;
}

async function fetchArtistSongs(artistName, options = {}) {
  console.log(`🎵 Fetching songs for ${artistName}...`);

  const {
    ignoreInstrumental = false,
    ignoreRemix = false,
    ignoreKeywords = [],
    includeOnly = [],
    minDurationSeconds = 0
  } = options;

  try {
    const token = await getAccessToken();
    console.log('✅ Got Spotify access token');

    const artist = await searchArtist(artistName, token);
    if (!artist) {
      throw new Error(`Artist "${artistName}" not found`);
    }
    console.log(`✅ Found artist: ${artist.name} (${artist.id})`);

    const albums = await getArtistAlbums(artist.id, token);
    console.log(`✅ Found ${albums.length} albums/singles`);

    const allSongs = [];
    let songId = 1;
    let filteredAlbums = 0;
    let filteredTracks = 0;

    for (const album of albums) {
      const albumName = album.name.toLowerCase();

      // Filter albums based on options
      let skipAlbum = false;

      if (ignoreInstrumental && (albumName.includes('instrumental') || albumName.includes('inst.'))) {
        console.log(`   ⏭️  Skipping instrumental album: ${album.name}`);
        filteredAlbums++;
        continue;
      }

      if (ignoreKeywords.length > 0) {
        for (const keyword of ignoreKeywords) {
          if (albumName.includes(keyword.toLowerCase())) {
            console.log(`   ⏭️  Skipping album with keyword "${keyword}": ${album.name}`);
            filteredAlbums++;
            skipAlbum = true;
            break;
          }
        }
      }

      if (includeOnly.length > 0) {
        const hasIncludeKeyword = includeOnly.some(keyword =>
          albumName.includes(keyword.toLowerCase())
        );
        if (!hasIncludeKeyword) {
          console.log(`   ⏭️  Skipping album (not in include list): ${album.name}`);
          filteredAlbums++;
          skipAlbum = true;
        }
      }

      if (skipAlbum) continue;

      console.log(`   📀 Processing ${album.name}...`);
      const tracks = await getAlbumTracks(album.id, token);

      for (const track of tracks) {
        const trackName = track.name.toLowerCase();
        const durationSeconds = Math.floor(track.duration_ms / 1000);

        // Filter tracks based on options
        let skipTrack = false;

        if (minDurationSeconds > 0 && durationSeconds < minDurationSeconds) {
          console.log(`   ⏭️  Skipping short track (${durationSeconds}s): ${track.name}`);
          filteredTracks++;
          skipTrack = true;
        }

        if (ignoreInstrumental && (trackName.includes('instrumental') || trackName.includes('inst.'))) {
          filteredTracks++;
          skipTrack = true;
        }

        if (ignoreRemix && (trackName.includes('remix') || trackName.includes('mix'))) {
          filteredTracks++;
          skipTrack = true;
        }

        if (ignoreKeywords.length > 0) {
          for (const keyword of ignoreKeywords) {
            if (trackName.includes(keyword.toLowerCase())) {
              filteredTracks++;
              skipTrack = true;
              break;
            }
          }
        }

        if (skipTrack) continue;

        // Check for duplicates
        if (!allSongs.some(song => song.title.toLowerCase() === track.name.toLowerCase())) {
          allSongs.push({
            id: songId++,
            title: track.name,
            album: album.name,
            releaseDate: album.release_date,
            spotifyId: track.id,
            previewUrl: track.preview_url,
            durationMs: track.duration_ms,
            explicit: track.explicit,
            trackNumber: track.track_number,
            artists: track.artists.map(a => a.name)
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Total unique songs found: ${allSongs.length}`);
    if (filteredAlbums > 0) console.log(`   🚫 Filtered out ${filteredAlbums} albums`);
    if (filteredTracks > 0) console.log(`   🚫 Filtered out ${filteredTracks} tracks`);

    allSongs.sort((a, b) => {
      if (a.releaseDate !== b.releaseDate) {
        return a.releaseDate.localeCompare(b.releaseDate);
      }
      if (a.album !== b.album) {
        return a.album.localeCompare(b.album);
      }
      return a.trackNumber - b.trackNumber;
    });

    allSongs.forEach((song, index) => {
      song.id = index + 1;
    });

    return {
      artist: {
        name: artist.name,
        id: artist.id,
        genres: artist.genres,
        popularity: artist.popularity
      },
      songs: allSongs,
      totalSongs: allSongs.length,
      fetchedAt: new Date().toISOString(),
      filterOptions: options
    };

  } catch (error) {
    console.error('❌ Error fetching songs:', error.message);
    throw error;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    artistName: 'tripleS',
    outputFile: null,
    ignoreInstrumental: false,
    ignoreRemix: false,
    ignoreKeywords: [],
    includeOnly: [],
    minDurationSeconds: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      console.log(`
🎵 Spotify Song Fetcher

Usage: node scripts/fetchSpotifySongs.js [artist] [options]

Arguments:
  artist                    Artist name (default: "tripleS")

Options:
  --output, -o <file>       Output file path
  --ignore-instrumental     Skip instrumental albums and tracks
  --ignore-remix           Skip remix tracks
  --ignore <keywords>      Skip albums/tracks containing keywords (comma-separated)
  --include-only <keywords> Only include albums containing keywords (comma-separated)
  --min-duration <seconds> Skip tracks shorter than specified duration (e.g., 120 for 2 minutes)
  --help, -h               Show this help message

Examples:
  npm run fetch-triples
  node scripts/fetchSpotifySongs.js "NewJeans" --ignore-instrumental --min-duration 120
  node scripts/fetchSpotifySongs.js "TWICE" --ignore remix,live --min-duration 90
  node scripts/fetchSpotifySongs.js "IVE" --include-only "I AM,LOVE DIVE" --min-duration 100
      `);
      process.exit(0);
    }

    if (!arg.startsWith('--') && !options.artistName) {
      options.artistName = arg;
    } else if (!arg.startsWith('--') && options.artistName === 'tripleS') {
      options.artistName = arg;
    } else if (arg === '--output' || arg === '-o') {
      options.outputFile = args[++i];
    } else if (arg === '--ignore-instrumental') {
      options.ignoreInstrumental = true;
    } else if (arg === '--ignore-remix') {
      options.ignoreRemix = true;
    } else if (arg === '--ignore') {
      const keywords = args[++i];
      if (keywords) {
        options.ignoreKeywords = keywords.split(',').map(k => k.trim());
      }
    } else if (arg === '--include-only') {
      const keywords = args[++i];
      if (keywords) {
        options.includeOnly = keywords.split(',').map(k => k.trim());
      }
    } else if (arg === '--min-duration') {
      const duration = parseInt(args[++i]);
      if (!isNaN(duration) && duration > 0) {
        options.minDurationSeconds = duration;
      }
    }
  }

  // Set default output file if not specified
  if (!options.outputFile) {
    options.outputFile = `src/data/${options.artistName.toLowerCase().replace(/\s+/g, '-')}-songs.json`;
  }

  return options;
}

// Main execution
const options = parseArgs();

fetchArtistSongs(options.artistName, {
  ignoreInstrumental: options.ignoreInstrumental,
  ignoreRemix: options.ignoreRemix,
  ignoreKeywords: options.ignoreKeywords,
  includeOnly: options.includeOnly,
  minDurationSeconds: options.minDurationSeconds
})
  .then(data => {
    const dir = path.dirname(options.outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(options.outputFile, JSON.stringify(data, null, 2));
    console.log(`\n🎉 Songs saved to ${options.outputFile}`);
    console.log(`📊 Summary:`);
    console.log(`   Artist: ${data.artist.name}`);
    console.log(`   Total songs: ${data.totalSongs}`);
    console.log(`   Albums/Singles: ${[...new Set(data.songs.map(s => s.album))].length}`);
    console.log(`   Date range: ${data.songs[0]?.releaseDate} - ${data.songs[data.songs.length - 1]?.releaseDate}`);
    if (data.filterOptions) {
      console.log(`   Filters applied: ${JSON.stringify(data.filterOptions, null, 2)}`);
    }
  })
  .catch(error => {
    console.error('Failed to fetch songs:', error.message);
    process.exit(1);
  });
