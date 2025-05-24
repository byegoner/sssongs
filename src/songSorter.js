import triplesData from './data/triples-songs.json' assert { type: 'json' };

export class SongSorter {
  constructor(songs, totalRounds = 35) {
    this.songs = songs.map(song => ({
      ...song,
      rating: 1200,
      appearances: 0
    }));
    this.totalRounds = totalRounds;
    this.currentRound = 0;
    this.history = [];
  }

  calculateElo(winnerRating, loserRating, kFactor = 32) {
    const expectedWin = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const newWinnerRating = winnerRating + kFactor * (1 - expectedWin);
    const newLoserRating = loserRating + kFactor * (0 - (1 - expectedWin));

    return {
      winner: Math.round(newWinnerRating),
      loser: Math.round(newLoserRating)
    };
  }

  selectThreeSongs() {
    // Determine current phase and available songs
    const progress = this.currentRound / this.totalRounds;
    let availableSongs = [...this.songs];
    let phaseMessage = "";

    if (this.currentRound >= 50) {
      // Phase 4: Final Showdown (top 25%)
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.25);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🏆 Final Showdown - Elite competition";
    } else if (progress >= 0.7) {
      // Phase 3: Precision Ranking (top 50%)
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.5);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🎯 Focusing on top contenders";
    } else if (progress >= 0.4) {
      // Phase 2: Focus on Contenders (top 75%)
      const sortedSongs = [...this.songs].sort((a, b) => b.rating - a.rating);
      const topCount = Math.floor(this.songs.length * 0.75);
      availableSongs = sortedSongs.slice(0, Math.max(topCount, 3)); // Ensure at least 3 songs
      phaseMessage = "🎵 Focusing on promising songs";
    }
    // Phase 1: Full Discovery (0-40%) - use all songs, no message needed

    // Add safety net for songs that haven't appeared recently (but not in final showdown)
    if (this.currentRound < 50) {
      const neglectedSongs = this.songs.filter(song => {
        const lastAppearance = this.getLastAppearance(song.id);
        return lastAppearance === -1 || (this.currentRound - lastAppearance) > 10;
      });

      if (neglectedSongs.length > 0 && Math.random() < 0.3) {
        // 30% chance to include a neglected song
        // Only add neglected songs that aren't already in availableSongs
        const uniqueNeglectedSongs = neglectedSongs.filter(neglectedSong =>
          !availableSongs.some(availableSong => availableSong.id === neglectedSong.id)
        );
        availableSongs = [...availableSongs, ...uniqueNeglectedSongs];
      }
    }

    // Calculate weights based on inverse appearances
    const weights = availableSongs.map(song => 1 / (song.appearances + 1));

    const selected = [];
    const selectablePool = [...availableSongs];

    for (let i = 0; i < 3; i++) {
      const availableWeights = selectablePool.map(song => {
        const originalIndex = availableSongs.indexOf(song);
        return weights[originalIndex];
      });
      const availableTotalWeight = availableWeights.reduce((sum, w) => sum + w, 0);

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

    // Store phase message for UI display
    if (phaseMessage && selected.length === 3) {
      this.currentPhaseMessage = phaseMessage;
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

    options.forEach(song => song.appearances++);

    // Custom round display logic
    let roundDisplay, totalDisplay, progress;

    if (this.currentRound >= 50) {
      // Final Showdown rounds (51-60)
      const finalRoundNumber = this.currentRound - 49; // 1-10 for rounds 51-60
      roundDisplay = `Final Showdown ${finalRoundNumber}`;
      totalDisplay = 10;
      progress = (finalRoundNumber / 10) * 100; // Reset progress for final showdown
    } else {
      // Regular rounds (1-50)
      roundDisplay = this.currentRound + 1;
      totalDisplay = 50;
      progress = ((this.currentRound + 1) / 50) * 100; // Progress based on 50 rounds
    }

    return {
      round: this.currentRound + 1,
      roundDisplay: roundDisplay,
      totalRounds: this.totalRounds,
      totalDisplay: totalDisplay,
      options: options,
      progress: progress,
      phaseMessage: this.currentPhaseMessage || null,
      isFinalShowdown: this.currentRound >= 50
    };
  }

  selectWinner(winnerId) {
    if (this.currentRound >= this.totalRounds) return;

    // Get current round options before advancing
    const options = this.selectThreeSongs();
    const winner = options.find(song => song.id === winnerId);
    const losers = options.filter(song => song.id !== winnerId);

    if (!winner) return;

    // Update appearances
    options.forEach(song => song.appearances++);

    losers.forEach(loser => {
      const result = this.calculateElo(winner.rating, loser.rating);
      winner.rating = result.winner;
      loser.rating = result.loser;
    });

    this.history.push({
      round: this.currentRound + 1,
      options: options.map(s => s.id),
      winner: winnerId,
      timestamp: Date.now()
    });

    this.currentRound++;
  }

  getRankings() {
    return [...this.songs]
      .sort((a, b) => b.rating - a.rating)
      .map((song, index) => ({
        rank: index + 1,
        ...song
      }));
  }

  isComplete() {
    return this.currentRound >= this.totalRounds;
  }

  getStats() {
    const avgAppearances = this.songs.reduce((sum, song) => sum + song.appearances, 0) / this.songs.length;
    const minAppearances = Math.min(...this.songs.map(s => s.appearances));
    const maxAppearances = Math.max(...this.songs.map(s => s.appearances));

    return {
      avgAppearances: avgAppearances.toFixed(1),
      minAppearances,
      maxAppearances,
      totalComparisons: this.currentRound * 2,
      distributionFairness: maxAppearances - minAppearances
    };
  }
}

export function getSpotifyEmbedUrl(spotifyId) {
  return `https://open.spotify.com/embed/track/${spotifyId}`;
}

export const tripleSSongs = triplesData.songs;
