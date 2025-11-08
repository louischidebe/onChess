const hre = require("hardhat");

/**
 * Setup script for quick local testing
 * Creates two games with test accounts and sets a small dev fee
 */

async function main() {
  console.log("🎮 OnChess Local Setup\n");

  const contractAddress = require('../frontend/src/contract-address.json').address;
  const OnChess = await hre.ethers.getContractFactory("OnChess");
  const onChess = OnChess.attach(contractAddress);

  const [owner, player1, player2, player3, player4] = await hre.ethers.getSigners();

  console.log("Contract:", contractAddress);
  console.log("Owner:", owner.address);
  console.log("\nTest Accounts:");
  console.log("  Player 1 (White):", player1.address);
  console.log("  Player 2 (Black):", player2.address);
  console.log("  Player 3:", player3.address);
  console.log("  Player 4:", player4.address);
  console.log();

  // Set a small dev fee for testing (0.0001 ETH)
  const devFee = hre.ethers.parseEther("0.0001");
  console.log("Setting dev fee to 0.0001 ETH...");
  await onChess.connect(owner).setDevFee(devFee);
  console.log("✅ Dev fee set\n");

  // Create test games
  console.log("Creating test games...\n");

  // Game 1: Player 1 vs Player 2
  let tx = await onChess.connect(player1).createGame(player2.address);
  await tx.wait();
  console.log("✅ Game 0: Player 1 (white) vs Player 2 (black)");

  // Game 2: Player 3 vs Player 4
  tx = await onChess.connect(player3).createGame(player4.address);
  await tx.wait();
  console.log("✅ Game 1: Player 3 (white) vs Player 4 (black)");

  // Game 3: Player 2 vs Player 1 (reversed colors)
  tx = await onChess.connect(player2).createGame(player1.address);
  await tx.wait();
  console.log("✅ Game 2: Player 2 (white) vs Player 1 (black)");

  console.log("\n📋 Setup Complete!\n");
  console.log("Next steps:");
  console.log("1. Import test accounts into browsers:");
  console.log("   - Check Hardhat node terminal for private keys");
  console.log("   - Import Player 1 and Player 2 keys into different browsers/profiles");
  console.log("\n2. Configure wallet network:");
  console.log("   - Network: Localhost");
  console.log("   - RPC: http://127.0.0.1:8545");
  console.log("   - Chain ID: 31337");
  console.log("\n3. Open frontend in both browsers:");
  console.log("   - Browser 1: Connect Player 1 wallet");
  console.log("   - Browser 2: Connect Player 2 wallet");
  console.log("\n4. You'll see 2 shared games - start playing!");
  console.log("\n💡 Each move costs 0.0001 ETH (test fee)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
