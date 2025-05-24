import { SongSorter, getSpotifyEmbedUrl, tripleSSongs } from './songSorter.js';

const gameContainer = document.getElementById('game-container');
let sorter = new SongSorter(tripleSSongs, 60);
let currentRoundOptions = null;
let preloadedEmbeds = new Map();

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createSpotifyEmbed(spotifyId) {
  const iframe = document.createElement('iframe');
  iframe.src = getSpotifyEmbedUrl(spotifyId);
  iframe.width = "100%";
  iframe.height = "100";
  iframe.frameBorder = "0";
  iframe.allow = "encrypted-media";
  iframe.style.borderRadius = "12px";
  iframe.style.margin = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  return iframe;
}

function preloadSpotifyEmbed(spotifyId) {
  if (preloadedEmbeds.has(spotifyId)) {
    return preloadedEmbeds.get(spotifyId);
  }

  const iframe = createSpotifyEmbed(spotifyId);
  preloadedEmbeds.set(spotifyId, iframe);
  return iframe;
}

function aggressivePreload(currentRound) {
  // Preload current round songs (already provided)
  currentRound.options.forEach(song => {
    preloadSpotifyEmbed(song.spotifyId);
  });

  // Preload next 5 rounds ahead
  for (let i = 1; i <= 5; i++) {
    const tempSorter = new SongSorter([...sorter.songs], sorter.totalRounds);

    // Copy the current sorter's state
    tempSorter.currentRound = sorter.currentRound + i;
    tempSorter.history = [...sorter.history];

    // Copy song ratings and appearances
    sorter.songs.forEach((song, index) => {
      tempSorter.songs[index].rating = song.rating;
      tempSorter.songs[index].appearances = song.appearances;
    });

    if (tempSorter.currentRound < tempSorter.totalRounds) {
      const futureRound = tempSorter.getCurrentRound();
      if (futureRound) {
        futureRound.options.forEach(song => {
          preloadSpotifyEmbed(song.spotifyId);
        });
      }
    }
  }
}

function renderRound() {
  const round = sorter.getCurrentRound();

  if (!round) {
    renderResults();
    return;
  }

  currentRoundOptions = round.options;

  // Aggressive preloading with current round data
  aggressivePreload(round);

  gameContainer.innerHTML = `
    <div class="round-info">
      <h2>${round.isFinalShowdown ? round.roundDisplay : `Round ${round.roundDisplay}/${round.totalDisplay}`}</h2>
      ${round.phaseMessage ? `<p class="phase-message">${round.phaseMessage}</p>` : ''}
      <div class="progress-bar">
        <div class="progress ${round.isFinalShowdown ? 'burning' : ''}" style="width: ${round.progress}%"></div>
      </div>
    </div>
    <div class="song-options">
      ${round.options.map(song => `
        <div class="song-option">
          <div class="embed-and-button">
            <div class="embed-container" data-spotify-id="${song.spotifyId}"></div>
            <button class="select-button" onclick="selectSong(${song.id})"></button>
          </div>
          <div class="song-content">
            <h4 class="mobile-song-title">${escapeHtml(song.title)}</h4>
            <div class="desktop-song-info">
              <h3>${escapeHtml(song.title)}</h3>
              <p>${escapeHtml(song.album)}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Use cached embeds immediately
  round.options.forEach(song => {
    const container = gameContainer.querySelector(`[data-spotify-id="${song.spotifyId}"]`);
    const cachedEmbed = preloadedEmbeds.get(song.spotifyId);
    if (container && cachedEmbed) {
      container.appendChild(cachedEmbed.cloneNode(true));
    }
  });
}

function renderResults() {
  const rankings = sorter.getRankings();

  gameContainer.innerHTML = `
    <div class="results">
      <h2>Final Rankings</h2>
      <div class="rankings" id="rankings-container">
        ${rankings.slice(0, 10).map(song => `
          <div class="ranking-item">
            <span class="rank">#${song.rank}</span>
            <span class="title">${escapeHtml(song.title)}</span>
          </div>
        `).join('')}
      </div>
      <div class="results-buttons">
        <button onclick="shareRanking()" class="share-button">📱 Share My Ranking</button>
        <button onclick="restart()">🔄 Start Over</button>
      </div>
    </div>
  `;
}

window.selectSong = function(songId) {
  if (!currentRoundOptions) return;

  const winner = currentRoundOptions.find(song => song.id === songId);
  const losers = currentRoundOptions.filter(song => song.id !== songId);

  if (!winner) return;

  // Update Elo ratings
  losers.forEach(loser => {
    const result = sorter.calculateElo(winner.rating, loser.rating);
    winner.rating = result.winner;
    loser.rating = result.loser;
  });

  // Save to history
  sorter.history.push({
    round: sorter.currentRound + 1,
    options: currentRoundOptions.map(s => s.id),
    winner: songId,
    timestamp: Date.now()
  });

  sorter.currentRound++;
  renderRound();
};

window.shareRanking = async function() {
  const shareButton = document.querySelector('.share-button');
  shareButton.disabled = true;
  shareButton.textContent = '📸 Generating...';

  try {
    // Create a shareable version of the rankings
    const rankingsContainer = document.getElementById('rankings-container');

    // Create a container for the share image
    const shareContainer = document.createElement('div');
    shareContainer.style.position = 'absolute';
    shareContainer.style.left = '-9999px';
    shareContainer.style.top = '-9999px';
    shareContainer.style.width = '600px';
    shareContainer.style.backgroundColor = '#1a1a2e';
    shareContainer.style.padding = '2rem';
    shareContainer.style.borderRadius = '15px';
    shareContainer.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Add title and rankings
    shareContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="background: linear-gradient(135deg, #ff6b9d, #c471ed, #12c2e9); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem; margin: 0; font-weight: 800;">my tripleS ranking</h2>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 2rem; backdrop-filter: blur(10px);">
        ${rankingsContainer.innerHTML}
      </div>
      <div style="text-align: center; margin-top: 1.5rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">
        @ sssorter.pages.dev/songs
      </div>
    `;

    document.body.appendChild(shareContainer);

    // Generate the image
    const canvas = await html2canvas(shareContainer, {
      backgroundColor: '#1a1a2e',
      scale: 2, // Higher quality
      useCORS: true,
      logging: false
    });

    // Clean up
    document.body.removeChild(shareContainer);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      const shareText = 'my #tripleS song ranking @ https://sssorter.pages.dev/songs';

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'ranking.png', { type: 'image/png' })] })) {
        try {
          await navigator.share({
            title: 'My tripleS Song Ranking',
            text: shareText,
            files: [new File([blob], 'triples-ranking.png', { type: 'image/png' })]
          });
        } catch (error) {
          if (error.name !== 'AbortError') {
            fallbackShare(blob, shareText);
          }
        }
      } else {
        // Fallback for desktop
        fallbackShare(blob, shareText);
      }
    }, 'image/png');

  } catch (error) {
    console.error('Error generating share image:', error);
    alert('Sorry, there was an error generating the share image. Please try again.');
  } finally {
    shareButton.disabled = false;
    shareButton.textContent = '📱 Share My Ranking';
  }
};

function fallbackShare(blob, text) {
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-triples-ranking.png';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Copy text to clipboard
  navigator.clipboard.writeText(text).then(() => {
    alert('🎉 Ranking image downloaded!\n📋 Caption copied to clipboard:\n\n' + text);
  }).catch(() => {
    alert('🎉 Ranking image downloaded!\n\nShare with this caption:\n' + text);
  });
}

window.restart = function() {
  preloadedEmbeds.clear();
  sorter = new SongSorter(tripleSSongs, 60);
  renderRound();
};

renderRound();
