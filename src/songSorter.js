// Static imports for bundling
import spotifyData from './data/triples-songs.json';
import deezerData from './data/triples-deezer-songs.json';

// Provider configuration with static data references
const PROVIDER_CONFIG = {
  'spotify': {
    data: spotifyData,
    embedUrl: (id) => `https://open.spotify.com/embed/track/${id}`,
    idField: 'spotifyId'
  },
  'deezer': {
    data: deezerData,
    embedUrl: (id) => `https://widget.deezer.com/widget/dark/track/${id}`,
    idField: 'deezerId'
  }
};

// Load data for specific provider (now synchronous)
function loadProviderData(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const data = config.data;
  console.log(`✅ Loaded ${provider} data from bundle`);
  return data?.songs || data.songs || [];
}

// Get embed URL for provider
function getProviderEmbedUrl(provider, songId) {
  const config = PROVIDER_CONFIG[provider];
  return config ? config.embedUrl(songId) : null;
}

// Get provider ID field name
function getProviderIdField(provider) {
  const config = PROVIDER_CONFIG[provider];
  return config ? config.idField : null;
}

export class SongSorter {
  constructor(songs, totalRounds = 70, musicProvider = 'deezer') {
    this.musicProvider = musicProvider;
    const idField = getProviderIdField(musicProvider);

    if (!idField) {
      throw new Error(`Unknown provider: ${musicProvider}`);
    }

    // Filter songs based on provider availability
    const availableSongs = songs.filter(song => {
      const providerId = song[idField];
      return providerId !== null && providerId !== undefined && providerId !== '';
    });

    console.log(`🎵 Using ${musicProvider} provider`);
    console.log(`📊 Song availability: ${availableSongs.length}/${songs.length} songs have valid ${idField}`);

    if (availableSongs.length === 0) {
      console.error(`❌ No songs available for ${musicProvider} provider!`);
      console.error(`💡 Try running: npm run fetch-${musicProvider}-triples`);
    }

    this.songs = availableSongs.map((song) => ({
      ...song,
      rating: 1200,
      appearances: 0,
    }));
    this.totalRounds = totalRounds;
    this.currentRound = 0;
    this.history = [];
  }

  // Progressive K-factor: starts conservative, gets more punchy in later phases
  getKFactor() {
    if (this.currentRound >= 60) {
      // Phase 4: Final Showdown - Very punchy (K=48)
      return 48;
    } else if (this.currentRound >= 50) {
      // Phase 3: Precision Ranking - Punchy (K=40)
      return 40;
    } else if (this.currentRound >= 30) {
      // Phase 2: Contenders - Moderate (K=32)
      return 32;
    } else {
      // Phase 1: Discovery - Conservative (K=24)
      return 24;
    }
  }

  calculateElo(winnerRating, loserRating) {
    const kFactor = this.getKFactor();
    const expectedWin =
      1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const newWinnerRating = winnerRating + kFactor * (1 - expectedWin);
    const newLoserRating = loserRating + kFactor * (0 - (1 - expectedWin));

    return {
      winner: Math.round(newWinnerRating),
      loser: Math.round(newLoserRating),
    };
  }

  selectThreeSongs() {
    // Determine current phase and available songs
    const progress = this.currentRound / this.totalRounds;
    let availableSongs = [...this.songs];
    let phaseMessage = "";

    if (this.currentRound >= 60) {
      // Phase 4: Final Showdown (top 25%) - rounds 61-70
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.25);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🏆 Final Showdown - Elite competition";
    } else if (this.currentRound >= 50) {
      // Phase 3: Precision Ranking (top 50%) - rounds 51-60
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.5);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🎯 Focusing on top contenders";
    } else if (this.currentRound >= 30) {
      // Phase 2: Focus on Contenders (top 75%) - rounds 31-50
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.75);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🎵 Focusing on promising songs";
    }
    // Phase 1: Full Discovery (rounds 1-30) - prioritize unshown

    // Add safety net for songs that haven't appeared recently (but not in final showdown)
    if (this.currentRound < 60) {
      const neglectedSongs = this.songs.filter((song) => {
        const lastAppearance = this.getLastAppearance(song.id);
        return lastAppearance === -1 || this.currentRound - lastAppearance > 10;
      });

      if (neglectedSongs.length > 0 && Math.random() < 0.3) {
        // 30% chance to include a neglected song
        // Only add neglected songs that aren't already in availableSongs
        const uniqueNeglectedSongs = neglectedSongs.filter(
          (neglectedSong) =>
            !availableSongs.some(
              (availableSong) => availableSong.id === neglectedSong.id,
            ),
        );
        availableSongs = [...availableSongs, ...uniqueNeglectedSongs];
      }
    }

    // PHASE 1 SPECIAL LOGIC: Prioritize unshown songs in first 30 rounds
    if (this.currentRound < 30) {
      const unshownSongs = this.songs.filter(song => song.appearances === 0);

      if (unshownSongs.length >= 3) {
        // If we have 3+ unshown songs, strongly prioritize them
        const weights = unshownSongs.map(() => 10); // High weight for unshown songs
        return this.weightedSelection(unshownSongs, weights, 3);
      } else if (unshownSongs.length > 0) {
        // Mix unshown songs with lightly shown songs
        const lightlyShownSongs = this.songs.filter(song => song.appearances <= 2);
        const combinedSongs = [...unshownSongs, ...lightlyShownSongs];
        const weights = combinedSongs.map(song =>
          song.appearances === 0 ? 10 : (3 - song.appearances) // Unshown=10, 1 appearance=2, 2 appearances=1
        );
        return this.weightedSelection(combinedSongs, weights, 3);
      }
    }

    // Calculate weights based on inverse appearances (normal logic for other phases)
    const weights = availableSongs.map((song) => 1 / (song.appearances + 1));

    // Store phase message for UI display
    if (phaseMessage) {
      this.currentPhaseMessage = phaseMessage;
    }

    return this.weightedSelection(availableSongs, weights, 3);
  }

  // Extract weighted selection logic into reusable method
  weightedSelection(availableSongs, weights, count) {
    const selected = [];
    const selectablePool = [...availableSongs];

    for (let i = 0; i < count; i++) {
      const availableWeights = selectablePool.map((song) => {
        const originalIndex = availableSongs.indexOf(song);
        return weights[originalIndex];
      });
      const availableTotalWeight = availableWeights.reduce(
        (sum, w) => sum + w,
        0,
      );

      if (availableTotalWeight === 0) break; // Safety check

      let random = Math.random() * availableTotalWeight;
      let selectedIndex = 0;

      for (let j = 0; j < availableWeights.length; j++) {
        random -= availableWeights[j];
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }

      selected.push(selectablePool[selectedIndex]);
      selectablePool.splice(selectedIndex, 1);

      if (selectablePool.length === 0) break; // No more songs to select
    }

    return selected;
  }

  getLastAppearance(songId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].options.includes(songId)) {
        return this.history[i].round;
      }
    }
    return -1;
  }

  getCurrentRound() {
    if (this.currentRound >= this.totalRounds) {
      return null;
    }

    const options = this.selectThreeSongs();

    options.forEach((song) => song.appearances++);

    // Custom round display logic
    let roundDisplay, totalDisplay, progress;

    if (this.currentRound >= 60) {
      // Final Showdown rounds (61-70)
      const finalRoundNumber = this.currentRound - 59; // 1-10 for rounds 61-70
      roundDisplay = `Final Showdown ${finalRoundNumber}`;
      totalDisplay = 10;
      progress = (finalRoundNumber / 10) * 100; // Reset progress for final showdown
    } else {
      // Regular rounds (1-60) - show just "Round X" without total
      roundDisplay = this.currentRound + 1;
      totalDisplay = null; // No total count shown
      progress = ((this.currentRound + 1) / 60) * 100; // Progress based on 60 rounds
    }

    return {
      round: this.currentRound + 1,
      roundDisplay: roundDisplay,
      totalRounds: this.totalRounds,
      totalDisplay: totalDisplay,
      options: options,
      progress: progress,
      phaseMessage: this.currentPhaseMessage || null,
      isFinalShowdown: this.currentRound >= 60,
    };
  }

  selectWinner(winnerId) {
    if (this.currentRound >= this.totalRounds) return;

    // Get current round options before advancing
    const options = this.selectThreeSongs();
    const winner = options.find((song) => song.id === winnerId);
    const losers = options.filter((song) => song.id !== winnerId);

    if (!winner) return;

    // Update appearances
    options.forEach((song) => song.appearances++);

    losers.forEach((loser) => {
      const result = this.calculateElo(winner.rating, loser.rating);
      winner.rating = result.winner;
      loser.rating = result.loser;
    });

    this.history.push({
      round: this.currentRound + 1,
      options: options.map((s) => s.id),
      winner: winnerId,
      timestamp: Date.now(),
    });

    this.currentRound++;
  }

  getRankings() {
    return [...this.songs]
      .sort((a, b) => b.rating - a.rating)
      .map((song, index) => ({
        rank: index + 1,
        ...song,
      }));
  }

  isComplete() {
    return this.currentRound >= this.totalRounds;
  }

  getStats() {
    const avgAppearances =
      this.songs.reduce((sum, song) => sum + song.appearances, 0) /
      this.songs.length;
    const minAppearances = Math.min(...this.songs.map((s) => s.appearances));
    const maxAppearances = Math.max(...this.songs.map((s) => s.appearances));

    return {
      avgAppearances: avgAppearances.toFixed(1),
      minAppearances,
      maxAppearances,
      totalComparisons: this.currentRound * 2,
      distributionFairness: maxAppearances - minAppearances,
    };
  }
}

// Export the provider functions and a placeholder for songs (will be loaded dynamically)
export { loadProviderData, getProviderEmbedUrl, getProviderIdField, PROVIDER_CONFIG };
