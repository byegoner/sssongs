/**
 * Round Calculator for Hybrid Song Sorting System
 * Calculates optimal rounds for Score Accumulation + Head-to-Head Matrix approach
 */

/**
 * Calculates optimal number of rounds for head-to-head phase
 * @param {number} songCount - Number of songs in head-to-head phase
 * @returns {number} Number of rounds (in 5-round increments)
 */
export function calculateHeadToHeadRounds(songCount) {
  // For pure head-to-head precision: aim for 100% pairwise coverage
  const totalPairs = (songCount * (songCount - 1)) / 2;

  // Each round covers 3 pairs: (A vs B), (A vs C), (B vs C)
  const roundsForFullCoverage = Math.ceil(totalPairs / 3);

  // Also ensure each song appears at least 4 times for reliable data
  const minAppearancesPerSong = 4;
  const totalAppearances = songCount * minAppearancesPerSong;
  const roundsForAppearances = Math.ceil(totalAppearances / 3);

  // Take the higher requirement
  const baseRounds = Math.max(roundsForFullCoverage, roundsForAppearances);

  // Round to nearest 5
  return Math.ceil(baseRounds / 5) * 5;
}

/**
 * Calculates full hybrid system rounds breakdown
 * @param {number} totalSongs - Total songs in database
 * @returns {object} Round breakdown with phase details
 */
export function calculateHybridSystem(totalSongs) {
  // Phase 1: Ensure each song appears at least 2 times for fair scoring
  const minAppearancesPerSong = 2;
  const minTotalAppearances = totalSongs * minAppearancesPerSong;
  const phase1Rounds = Math.ceil(minTotalAppearances / 3);
  const phase1RoundsRounded = Math.ceil(phase1Rounds / 5) * 5;

  // Survivors after Phase 1 (top ~60% since elimination is more lenient now)
  const phase1Survivors = Math.ceil(totalSongs * 0.6);

  // Phase 2: Elimination to exactly 15 finalists for optimal head-to-head coverage
  const finalSongs = 15; // Fixed count for 100% pairwise coverage in reasonable rounds
  const phase2Rounds = Math.ceil((phase1Survivors * 1.2) / 3);
  const phase2RoundsRounded = Math.ceil(phase2Rounds / 5) * 5;

  // Phase 3: Head-to-head matrix
  const phase3Rounds = calculateHeadToHeadRounds(finalSongs);

  return {
    phase1: {
      rounds: phase1RoundsRounded,
      description: `Discovery Phase - exploring all ${totalSongs} songs`,
      survivors: phase1Survivors,
      minAppearances: minAppearancesPerSong
    },
    phase2: {
      rounds: phase2RoundsRounded,
      description: `Elimination Round - top contenders compete`,
      survivors: finalSongs,
      eliminationThreshold: Math.ceil(phase2RoundsRounded * 0.3)
    },
    phase3: {
      rounds: phase3Rounds,
      description: `Final Showdown - crown your champions`,
      survivors: "Top rankings"
    },
    totalRounds: phase1RoundsRounded + phase2RoundsRounded + phase3Rounds,
    phases: 3
  };
}

/**
 * Determines which phase the current round belongs to
 * @param {number} currentRound - Current round number (1-based)
 * @param {object} systemConfig - Result from calculateHybridSystem()
 * @returns {object} Phase information
 */
export function getCurrentPhase(currentRound, systemConfig) {
  const { phase1, phase2, phase3 } = systemConfig;

  if (currentRound <= phase1.rounds) {
    return {
      phase: 1,
      phaseRound: currentRound,
      maxPhaseRounds: phase1.rounds,
      description: phase1.description,
      type: 'discovery'
    };
  } else if (currentRound <= phase1.rounds + phase2.rounds) {
    return {
      phase: 2,
      phaseRound: currentRound - phase1.rounds,
      maxPhaseRounds: phase2.rounds,
      description: phase2.description,
      type: 'elimination'
    };
  } else {
    return {
      phase: 3,
      phaseRound: currentRound - phase1.rounds - phase2.rounds,
      maxPhaseRounds: phase3.rounds,
      description: phase3.description,
      type: 'head-to-head'
    };
  }
}

/**
 * Gets phase message for UI display
 * @param {object} phaseInfo - Result from getCurrentPhase()
 * @returns {string} User-friendly phase message
 */
export function getPhaseMessage(phaseInfo) {
  switch (phaseInfo.type) {
    case 'discovery':
      return 'Discovery Phase - Exploring All Songs';
    case 'elimination':
      return 'Elimination Round - The Competition Heats Up';
    case 'head-to-head':
      return 'Final Showdown - Crown Your Champions';
    default:
      return '';
  }
}
