const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Leaderboard Generator
 * 
 * Parses MoveMade and GameEnded events from the OnChess contract
 * to generate a simple leaderboard CSV with wins per address.
 * 
 * This is a bonus feature for tracking player statistics.
 */

async function main() {
  console.log("📊 Generating OnChess Leaderboard...\n");

  // Get contract instance
  const contractAddress = require('../frontend/src/contract-address.json').address;
  const OnChess = await hre.ethers.getContractFactory("OnChess");
  const onChess = OnChess.attach(contractAddress);

  console.log(`Contract: ${contractAddress}`);
  console.log(`Network: ${hre.network.name}\n`);

  // Fetch all GameEnded events
  const filter = onChess.filters.GameEnded();
  const events = await onChess.queryFilter(filter);

  console.log(`Found ${events.length} completed games\n`);

  // Count wins per address
  const stats = {};

  for (const event of events) {
    const gameId = event.args.gameId.toString();
    const winner = event.args.winner;
    const reason = event.args.reason;

    // Skip terminated games (no winner)
    if (winner === hre.ethers.ZeroAddress) {
      console.log(`Game ${gameId}: Terminated by admin (no winner)`);
      continue;
    }

    console.log(`Game ${gameId}: Winner ${winner} (${reason})`);

    // Initialize stats for new players
    if (!stats[winner]) {
      stats[winner] = {
        wins: 0,
        games: 0
      };
    }

    stats[winner].wins++;
    stats[winner].games++;

    // Track games for loser too
    const game = await onChess.getGame(gameId);
    const loser = game.white === winner ? game.black : game.white;
    
    if (!stats[loser]) {
      stats[loser] = {
        wins: 0,
        games: 0
      };
    }
    stats[loser].games++;
  }

  // Generate CSV
  let csv = "Address,Wins,Games,Win Rate\n";
  
  const sortedPlayers = Object.entries(stats).sort((a, b) => b[1].wins - a[1].wins);

  for (const [address, data] of sortedPlayers) {
    const winRate = ((data.wins / data.games) * 100).toFixed(1);
    csv += `${address},${data.wins},${data.games},${winRate}%\n`;
  }

  // Save to file
  const outputPath = path.join(__dirname, '..', 'leaderboard.csv');
  fs.writeFileSync(outputPath, csv);

  console.log("\n✅ Leaderboard generated!\n");
  console.log("Rankings:");
  console.log("─".repeat(80));
  
  sortedPlayers.forEach(([address, data], index) => {
    const winRate = ((data.wins / data.games) * 100).toFixed(1);
    const rank = index + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
    console.log(`${medal} #${rank} ${address}`);
    console.log(`     Wins: ${data.wins} | Games: ${data.games} | Win Rate: ${winRate}%`);
  });

  console.log("─".repeat(80));
  console.log(`\nLeaderboard saved to: ${outputPath}`);
  console.log("\nNote: This is a simple leaderboard. For production, consider:");
  console.log("  - ELO rating system");
  console.log("  - Backend API for real-time updates");
  console.log("  - Player profiles with usernames");
  console.log("  - Move accuracy analysis");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
