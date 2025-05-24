import { SongSorter, getSpotifyEmbedUrl, tripleSSongs } from "./songSorter.js";

const gameContainer = document.getElementById("game-container");
let sorter = new SongSorter(tripleSSongs, 70);
let currentRoundOptions = null;
let preloadedEmbeds = new Map();
let activeEmbeds = new Set(); // Track currently visible embeds

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function createSpotifyEmbed(spotifyId) {
  const iframe = document.createElement("iframe");
  iframe.src = getSpotifyEmbedUrl(spotifyId);
  iframe.width = "100%";
  iframe.height = "100";
  iframe.frameBorder = "0";
  iframe.allow = "encrypted-media";
  iframe.style.borderRadius = "12px";
  iframe.style.margin = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.setAttribute("data-spotify-id", spotifyId);
  return iframe;
}

// Listen for Spotify embed events to sync playback
window.addEventListener("message", function (event) {
  if (event.origin !== "https://open.spotify.com") return;

  const data = event.data;
  if (data.type === "playback_update") {
    const playingEmbedId =
      event.source?.frameElement?.getAttribute("data-spotify-id");

    if (data.isPaused === false && playingEmbedId) {
      // A track started playing, pause all other embeds
      pauseOtherEmbeds(playingEmbedId);
    }
  }
});

function pauseOtherEmbeds(currentlyPlayingId) {
  activeEmbeds.forEach((embedFrame) => {
    const embedId = embedFrame.getAttribute("data-spotify-id");
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
  currentRound.options.forEach((song) => {
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
        futureRound.options.forEach((song) => {
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
      `,
        )
        .join("")}
    </div>
  `;

  // Clear previous active embeds
  activeEmbeds.clear();

  // Use cached embeds immediately
  round.options.forEach((song) => {
    const container = gameContainer.querySelector(
      `[data-spotify-id="${song.spotifyId}"]`,
    );
    const cachedEmbed = preloadedEmbeds.get(song.spotifyId);
    if (container && cachedEmbed) {
      const clonedEmbed = cachedEmbed.cloneNode(true);
      container.appendChild(clonedEmbed);
      // Track this embed for synchronization
      activeEmbeds.add(clonedEmbed);
    }
  });
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
    shareContainer.style.position = "absolute";
    shareContainer.style.left = "-9999px";
    shareContainer.style.top = "-9999px";
    shareContainer.style.width = "400px"; // Mobile-like width
    shareContainer.style.fontFamily =
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Match the app's background gradient
    shareContainer.style.background =
      "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)";
    shareContainer.style.minHeight = "600px";
    shareContainer.style.padding = "2rem 1.5rem";
    shareContainer.style.borderRadius = "0";

    // Add the lighting effects like the app
    shareContainer.style.position = "relative";
    shareContainer.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.2) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%); pointer-events: none;"></div>

      <div style="position: relative; z-index: 1;">
        <!-- Title Section -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="
            font-size: 1.8rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #ff6b9d, #c471ed, #12c2e9);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            letter-spacing: -0.02em;
            text-shadow: 0 0 30px rgba(255, 107, 157, 0.5);
            margin: 0 0 0.5rem 0;
          ">tripleS Song Sorter</h1>
          <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #ff6b9d, #c471ed); border-radius: 2px; box-shadow: 0 0 10px rgba(255, 107, 157, 0.8); margin: 0 auto 1.5rem auto;"></div>
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
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          margin-bottom: 2rem;
        ">
          ${rankings
            .slice(0, 10)
            .map(
              (song) => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.75rem 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.2);
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
          border-top: 1px solid rgba(255, 255, 255, 0.1);
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

    // Generate the image with optimized settings
    const canvas = await html2canvas(shareContainer, {
      backgroundColor: null, // Let the gradient handle background
      scale: 3, // Very high quality
      useCORS: true,
      logging: false,
      allowTaint: true,
      foreignObjectRendering: true,
      imageTimeout: 15000,
      removeContainer: false,
    });

    // Clean up
    document.body.removeChild(shareContainer);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
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
      },
      "image/png",
      0.95,
    );
  } catch (error) {
    console.error("Error generating share image:", error);
    alert(
      "Sorry, there was an error generating the share image. Please try again.",
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
  sorter = new SongSorter(tripleSSongs, 70);
  renderRound();
};

renderRound();
