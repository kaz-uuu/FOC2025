/**
 * FOC 2025 Configuration
 * Update this file to change event details, scoring rules, etc.
 */

export const FOC_CONFIG = {
  // Event Information
  event: {
    name: "FOC 2025",
    dates: ["2025-06-01", "2025-06-02"],
    venue: "Campus Main Hall",
  },
  
  // User Types
  userTypes: ["OC", "GL", "GP"],
  
  // Games Configuration
  games: {
    day1: [1, 2, 3, 4],     // IDs of day 1 games
    scavenger: [5],          // IDs of scavenger hunt games
    day2: [6, 7, 8],         // IDs of day 2 games
    
    // Game Types and Scoring Methods
    gameTypes: {
      // Rank-based scoring (1st = 10pts, 2nd = 7pts, 3rd = 5pts, 4th = 3pts, others = 1pt)
      rankGames: [1, 3, 4, 6, 7, 8],
      
      // Short games (direct point assignment)
      shortGames: [2],
      
      // Special scoring for scavenger hunt
      scavengerGames: [5],
      
      // Additive games (points are simply added)
      additiveGames: [9, 10, 11]
    }
  },
  
  // Scoring Rules
  scoring: {
    rank: {
      1: 10, // 1st place gets 10 points
      2: 7,  // 2nd place gets 7 points
      3: 5,  // 3rd place gets 5 points
      4: 3,  // 4th place gets 3 points
      default: 1 // All other places get 1 point
    },
    
    // Special scoring for top performers
    bonusPoints: {
      overallWinner: 15,    // Additional points for overall winner
      dayWinner: 10         // Additional points for daily winner
    }
  },
  
  // Default Database State
  defaultState: {
    game: "1",           // Start with day 1 activities
    freeze: "false"      // Start with scoreboard unfrozen
  }
}; 