import { SongSorter, loadProviderData, getProviderEmbedUrl, getProviderIdField } from "./songSorter.js";

// Configuration - choose ONE provider
const MUSIC_PROVIDER = 'deezer'; // 'spotify' or 'deezer'

const gameContainer = document.getElementById("game-container");
let sorter = null;
let currentRoundOptions = null;
let preloadedEmbeds = new Map();
let activeEmbeds = new Set();
let tripleSSongs = [];

// Initialize the app with provider-specific data
function initializeApp() {
  try {
    console.log(`🔄 Loading ${MUSIC_PROVIDER} data...`);
    tripleSSongs = loadProviderData(MUSIC_PROVIDER);
    sorter = new SongSorter(tripleSSongs, 70, MUSIC_PROVIDER);

    if (sorter.songs.length === 0) {
      showNoSongsError();
      return;
    }

    renderRound();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showDataError(error.message);
  }
}

function showNoSongsError() {
  gameContainer.innerHTML = `
    <div class="error-message">
      <h2>❌ No Songs Available</h2>
      <p>No ${MUSIC_PROVIDER} songs found in the database.</p>
      <p>Run: <code>npm run fetch-${MUSIC_PROVIDER}-triples</code> to fetch song data.</p>
      <button onclick="location.reload()">🔄 Retry</button>
    </div>
  `;
}

function showDataError(message) {
  gameContainer.innerHTML = `
    <div class="error-message">
      <h2>❌ Data Loading Error</h2>
      <p>Failed to load ${MUSIC_PROVIDER} data: ${message}</p>
      <p>Make sure the data file exists for ${MUSIC_PROVIDER}.</p>
      <button onclick="location.reload()">🔄 Retry</button>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getEmbedUrl(song) {
  const idField = getProviderIdField(MUSIC_PROVIDER);
  const songId = song[idField];
  return songId ? getProviderEmbedUrl(MUSIC_PROVIDER, songId) : null;
}

function getEmbedId(song) {
  const idField = getProviderIdField(MUSIC_PROVIDER);
  const songId = song[idField];
  return songId ? `${MUSIC_PROVIDER}-${songId}` : null;
}

function createMusicEmbed(song, autoplay = false) {
  const embedUrl = getEmbedUrl(song);
  const embedId = getEmbedId(song);

  if (!embedUrl || !embedId) {
    console.warn(`No ${MUSIC_PROVIDER} embed available for song: ${song.title}`);
    return null;
  }

  // Use regular embed URL - Deezer doesn't support autoplay reliably
  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.width = "100%";
  iframe.height = "140";
  iframe.frameBorder = "0";
  iframe.title = "deezer-widget";
  iframe.allowTransparency = true;
  iframe.allow = "encrypted-media; clipboard-write; accelerometer; gyroscope; magnetometer";
  iframe.style.borderRadius = "12px";
  iframe.style.margin = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.setAttribute("data-embed-id", embedId);
  iframe.setAttribute("data-provider", MUSIC_PROVIDER);
  return iframe;
}

// Load and play embed when user clicks play button
window.loadAndPlayEmbed = function(embedId, playButton) {
  console.log(`🎵 Loading embed on demand: ${embedId}`);

  const container = playButton.closest('.embed-container');
  const placeholder = container.querySelector('.play-placeholder');

  if (!container || !placeholder) return;

  // Find the song data
  const song = currentRoundOptions.find(s => getEmbedId(s) === embedId);
  if (!song) return;

  // Show loading state
  playButton.innerHTML = `
    <div class="loading-spinner-simple"></div>
  `;
  playButton.disabled = true;

  // Create embed with autoplay
  const embed = createMusicEmbed(song, true);
  if (embed) {
    container.appendChild(embed);
    activeEmbeds.add(embed);

    // Fade out placeholder and fade in embed
    placeholder.style.opacity = "0";
    embed.style.opacity = "0";
    embed.style.transition = "opacity 0.5s ease";

    setTimeout(() => {
      embed.style.opacity = "1";
      setTimeout(() => placeholder.remove(), 500);
    }, 200);
  }
};

// Listen for embed events to sync playback (mainly for Spotify)
window.addEventListener("message", function (event) {
  // Only handle Spotify sync since Deezer embeds are simpler
  if (event.origin !== "https://open.spotify.com" || MUSIC_PROVIDER !== 'spotify') return;

  const data = event.data;
  if (data.type === "playback_update") {
    const playingEmbedId =
      event.source?.frameElement?.getAttribute("data-embed-id");

    if (data.isPaused === false && playingEmbedId) {
      // A track started playing, pause all other embeds
      pauseOtherEmbeds(playingEmbedId);
    }
  }
});

function pauseOtherEmbeds(currentlyPlayingId) {
  // Only needed for Spotify embeds - Deezer handles this better natively
  if (MUSIC_PROVIDER !== 'spotify') return;

  activeEmbeds.forEach((embedFrame) => {
    const embedId = embedFrame.getAttribute("data-embed-id");
    if (embedId !== currentlyPlayingId) {
      // Send pause command to other embeds
      try {
        embedFrame.contentWindow.postMessage(
          {
            command: "toggle",
          },
          "https://open.spotify.com",
        );
      } catch (e) {
        // Ignore cross-origin errors
      }
    }
  });
}

function preloadMusicEmbed(song) {
  const embedId = getEmbedId(song);
  if (preloadedEmbeds.has(embedId)) {
    return preloadedEmbeds.get(embedId);
  }

  const iframe = createMusicEmbed(song);
  if (iframe) {
    preloadedEmbeds.set(embedId, iframe);
  }
  return iframe;
}

function aggressivePreload(currentRound) {
  // Preload current round songs (already provided)
  currentRound.options.forEach((song) => {
    preloadMusicEmbed(song);
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
        futureRound.options.forEach((song) => {
          preloadMusicEmbed(song);
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

  // No preloading needed since embeds load on-demand

  gameContainer.innerHTML = `
    <div class="round-info">
      <h2>${round.isFinalShowdown ? round.roundDisplay : `Round ${round.roundDisplay}`}</h2>
      ${round.phaseMessage ? `<p class="phase-message">${round.phaseMessage}</p>` : ""}
      <div class="progress-bar">
        <div class="progress ${round.isFinalShowdown ? "burning" : ""}" style="width: ${round.progress}%"></div>
      </div>
    </div>
    <div class="song-options">
      ${round.options
        .map(
          (song) => `
        <div class="song-option">
          <div class="embed-and-button">
            <div class="embed-container" data-embed-id="${getEmbedId(song)}" data-provider="${MUSIC_PROVIDER}">
              <div class="play-placeholder" ${song.albumCover ? `style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${song.albumCover}'); background-size: cover; background-position: center;"` : ''}>
                <div class="song-info">
                  <h3>${escapeHtml(song.title)}</h3>
                  <p>${escapeHtml(song.album)}</p>
                </div>
                <button class="play-button" onclick="loadAndPlayEmbed('${getEmbedId(song)}', this)">
                  Play Preview
                </button>
              </div>
            </div>
            <button class="select-button" onclick="selectSong(${song.id})"></button>
          </div>
          <div class="song-content">
            <div class="desktop-song-info">
              <h3>${escapeHtml(song.title)}</h3>
              <p>${escapeHtml(song.album)}</p>
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  // Clear previous active embeds
  activeEmbeds.clear();

  // No automatic embed creation - embeds load on-demand when play button is clicked
}

function renderResults() {
  const rankings = sorter.getRankings();

  gameContainer.innerHTML = `
    <div class="results">
      <h2>Final Rankings</h2>
      <div class="rankings" id="rankings-container">
        ${rankings
          .slice(0, 10)
          .map(
            (song) => `
          <div class="ranking-item">
            <span class="rank">#${song.rank}</span>
            <span class="title">${escapeHtml(song.title)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="results-buttons">
        <button onclick="shareRanking()" class="share-button">📱 Share My Ranking</button>
        <button onclick="restart()">🔄 Start Over</button>
      </div>
    </div>
  `;
}

window.selectSong = function (songId) {
  if (!currentRoundOptions) return;

  const winner = currentRoundOptions.find((song) => song.id === songId);
  const losers = currentRoundOptions.filter((song) => song.id !== songId);

  if (!winner) return;

  // Update Elo ratings
  losers.forEach((loser) => {
    const result = sorter.calculateElo(winner.rating, loser.rating);
    winner.rating = result.winner;
    loser.rating = result.loser;
  });

  // Save to history
  sorter.history.push({
    round: sorter.currentRound + 1,
    options: currentRoundOptions.map((s) => s.id),
    winner: songId,
    timestamp: Date.now(),
  });

  sorter.currentRound++;
  renderRound();
};

window.shareRanking = async function () {
  const shareButton = document.querySelector(".share-button");
  shareButton.disabled = true;
  shareButton.textContent = "📸 Generating...";

  try {
    // Get the rankings data
    const rankings = sorter.getRankings();

    // Create a container for the share image with mobile proportions
    const shareContainer = document.createElement("div");
    shareContainer.style.position = "fixed"; // Use fixed instead of absolute
    shareContainer.style.top = "0";
    shareContainer.style.left = "0";
    shareContainer.style.zIndex = "-9999"; // Hide behind content instead of positioning off-screen
    shareContainer.style.width = "400px"; // Mobile-like width
    shareContainer.style.fontFamily =
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Simplified background (remove complex gradients that might not render)
    shareContainer.style.background = "#0a0a0a";
    shareContainer.style.padding = "2rem 1.5rem";
    shareContainer.style.borderRadius = "0";
    shareContainer.style.boxSizing = "border-box";
    shareContainer.style.display = "flex";
    shareContainer.style.flexDirection = "column";

    shareContainer.innerHTML = `
      <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;">
        <!-- Title Section -->
        <div style="text-align: center; margin-bottom: 2rem; flex-shrink: 0;">
          <h1 style="
            font-size: 1.8rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #ff6b9d, #c471ed, #12c2e9);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin: 0 0 0.5rem 0;
          ">tripleS Song Sorter</h1>
          <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #ff6b9d, #c471ed); border-radius: 2px; margin: 0 auto 1.5rem auto;"></div>
          <h2 style="
            font-size: 1.5rem;
            color: #ffffff;
            font-weight: 600;
            margin: 0;
          ">my tripleS song ranking</h2>
        </div>

        <!-- Rankings Section -->
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          flex: 1;
        ">
          ${rankings
            .slice(0, 10)
            .map(
              (song, index) => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.75rem 0;
              ${index < 9 ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.2);' : ''}
            ">
              <span style="
                font-weight: bold;
                font-size: 1.1rem;
                min-width: 40px;
                color: #ffffff;
              ">#${song.rank}</span>
              <span style="
                flex: 1;
                text-align: left;
                margin-left: 1rem;
                color: #ffffff;
                font-size: 0.95rem;
                line-height: 1.3;
              ">${escapeHtml(song.title)}</span>
            </div>
          `,
            )
            .join("")}
        </div>

        <!-- Footer -->
        <div style="
          text-align: center;
          padding: 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        ">
          <p style="
            margin: 0;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
          ">sssorter.pages.dev/songs</p>
        </div>
      </div>
    `;

    document.body.appendChild(shareContainer);

    // Wait a moment for the DOM to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate proper height based on content
    const actualHeight = shareContainer.scrollHeight;
    const finalHeight = Math.max(actualHeight, 700); // Ensure minimum height

    // Generate the image with optimized settings for reliability
    const canvas = await html2canvas(shareContainer, {
      backgroundColor: "#0a0a0a", // Explicit background color
      scale: 2, // Reduced scale to avoid memory issues
      useCORS: true,
      logging: true, // Enable logging for debugging
      allowTaint: false,
      foreignObjectRendering: false, // Disable for better compatibility
      imageTimeout: 5000,
      removeContainer: false,
      width: 400,
      height: finalHeight,
      x: 0,
      y: 0,
    });

    // Clean up
    document.body.removeChild(shareContainer);

    // Verify canvas has content
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("Canvas has no dimensions");
    }

    // Convert to blob with error handling
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to generate image blob"));
            return;
          }
          resolve(blob);
        },
        "image/png",
        0.9,
      );
    });

    if (blob.size === 0) {
      throw new Error("Generated image is empty");
    }

    const shareText =
      "my #tripleS song ranking @ https://sssorter.pages.dev/songs";

    // Try Web Share API first (mobile)
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({
        files: [new File([blob], "ranking.png", { type: "image/png" })],
      })
    ) {
      try {
        await navigator.share({
          title: "My tripleS Song Ranking",
          text: shareText,
          files: [
            new File([blob], "triples-ranking.png", { type: "image/png" }),
          ],
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          fallbackShare(blob, shareText);
        }
      }
    } else {
      // Fallback for desktop
      fallbackShare(blob, shareText);
    }
  } catch (error) {
    console.error("Error generating share image:", error);
    alert(
      "Sorry, there was an error generating the share image. Please try again.\n\nError: " + error.message,
    );
  } finally {
    shareButton.disabled = false;
    shareButton.textContent = "📱 Share My Ranking";
  }
};

function fallbackShare(blob, text) {
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-triples-ranking.png";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Copy text to clipboard
  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert(
        "🎉 Ranking image downloaded!\n📋 Caption copied to clipboard:\n\n" +
          text,
      );
    })
    .catch(() => {
      alert(
        "🎉 Ranking image downloaded!\n\nShare with this caption:\n" + text,
      );
    });
}

window.restart = function () {
  preloadedEmbeds.clear();
  if (tripleSSongs.length > 0) {
    sorter = new SongSorter(tripleSSongs, 70, MUSIC_PROVIDER);
    renderRound();
  } else {
    initializeApp();
  }
};

// Initialize the app when the page loads
initializeApp();
