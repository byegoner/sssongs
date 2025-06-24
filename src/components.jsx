import { useState, useEffect, useRef } from 'preact/hooks';

// Song option component with embed functionality
export function SongOption({ song, index, provider, onSelect, onPlayEmbed }) {
  const embedId = `${song[provider === 'spotify' ? 'spotifyId' : 'deezerId']}`;
  
  return (
    <div className={`song-option fade-in-${index + 1}`}>
      <div className="embed-and-button">
        <EmbedContainer 
          song={song} 
          embedId={embedId} 
          provider={provider}
          onPlayEmbed={onPlayEmbed}
        />
        <button 
          className="select-button" 
          onClick={() => onSelect(song.id)}
        ></button>
      </div>
      <div className="song-content">
        <div className="desktop-song-info">
          <h3>{song.title}</h3>
          <p>{song.album}</p>
        </div>
      </div>
    </div>
  );
}

// Embed container with play placeholder
function EmbedContainer({ song, embedId, provider, onPlayEmbed }) {
  const placeholderStyle = song.albumCover ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${song.albumCover}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {};

  return (
    <div 
      className="embed-container" 
      data-embed-id={embedId}
      data-provider={provider}
    >
      <div className="play-placeholder" style={placeholderStyle}>
        <div className="song-info">
          <h3>{song.title}</h3>
          <p>{song.album}</p>
        </div>
        <button 
          className="play-button"
          onClick={(e) => onPlayEmbed(embedId, e.target)}
        >
          Play Preview
        </button>
      </div>
    </div>
  );
}

// Main game round component
export function GameRound({ round, provider, onSelect, onPlayEmbed }) {
  // Clean up animation classes and re-enable buttons after fade-in completes
  useEffect(() => {
    // Immediately re-enable any disabled buttons from previous round
    const selectButtons = document.querySelectorAll(".select-button");
    selectButtons.forEach((button) => {
      button.disabled = false;
      button.style.pointerEvents = "auto";
    });

    const timer = setTimeout(() => {
      const songOptions = document.querySelectorAll(".song-option");
      songOptions.forEach((option) => {
        option.classList.remove(
          "fade-in-1",
          "fade-in-2", 
          "fade-in-3",
          "fade-out-1",
          "fade-out-2",
          "fade-out-3"
        );
      });
    }, 600); // After all fade-in animations complete

    return () => clearTimeout(timer);
  }, [round]); // Run when round changes

  if (!round || !round.options || round.options.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading songs...</p>
      </div>
    );
  }

  // Determine phase CSS classes
  const phaseInfo = round.phaseInfo;
  let progressClass = "";
  let phaseMessageClass = "";

  if (phaseInfo) {
    switch (phaseInfo.type) {
      case "discovery":
        progressClass = "phase-discovery";
        phaseMessageClass = "phase-discovery";
        break;
      case "elimination":
        progressClass = "phase-elimination";
        phaseMessageClass = "phase-elimination";
        break;
      case "head-to-head":
        progressClass = "phase-head-to-head";
        phaseMessageClass = "phase-head-to-head";
        break;
    }
  }

  return (
    <>
      <div className="round-info">
        <h2>{round.isFinalShowdown ? round.roundDisplay : `Round ${round.roundDisplay}`}</h2>
        {round.phaseMessage && (
          <p className={`phase-message ${phaseMessageClass}`}>{round.phaseMessage}</p>
        )}
        <div className="progress-bar">
          <div className={`progress ${progressClass}`} style={{ width: `${round.progress}%` }}></div>
        </div>
      </div>
      
      <div className="song-options">
        {round.options.map((song, index) => (
          <SongOption
            key={song.id}
            song={song}
            index={index}
            provider={provider}
            onSelect={onSelect}
            onPlayEmbed={onPlayEmbed}
          />
        ))}
      </div>
    </>
  );
}

// Results component
export function GameResults({ rankings, onRestart, onShare }) {
  return (
    <div className="results">
      <h2>Final Rankings</h2>
      <div className="rankings" id="rankings-container">
        {rankings.slice(0, 10).map((song, index) => (
          <div key={song.id} className="ranking-item">
            <span className="rank">#{index + 1}</span>
            <span className="title">{song.title}</span>
          </div>
        ))}
      </div>
      <div className="results-buttons">
        <button className="share-button" onClick={onShare}>
          📱 Share My Ranking
        </button>
        <button onClick={onRestart}>
          🔄 Start Over
        </button>
      </div>
    </div>
  );
}

// Error components
export function NoSongsError({ provider, onRetry }) {
  return (
    <div className="error-message">
      <h2>❌ No Songs Available</h2>
      <p>No {provider} songs found in the database.</p>
      <p>Run: <code>npm run fetch-{provider}-triples</code> to fetch song data.</p>
      <button onClick={onRetry}>🔄 Retry</button>
    </div>
  );
}

export function DataError({ message, onRetry }) {
  return (
    <div className="error-message">
      <h2>❌ Error Loading Data</h2>
      <p>{message}</p>
      <button onClick={onRetry}>🔄 Retry</button>
    </div>
  );
}