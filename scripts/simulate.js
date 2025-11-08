const hre = require("hardhat");

/**
 * Simulation script to run a sequence of chess moves between two accounts
 * This demonstrates the contract working with a real game flow
 */
async function main() {
  console.log("🎮 Starting OnChess simulation...\n");
  
  // Get contract instance
  const contractAddress = require('../frontend/src/contract-address.json').address;
  const OnChess = await hre.ethers.getContractFactory("OnChess");
  const onChess = OnChess.attach(contractAddress);
  
  const [owner, player1, player2] = await hre.ethers.getSigners();
  
  console.log("Players:");
  console.log(`White: ${player1.address}`);
  console.log(`Black: ${player2.address}\n`);
  
  // Create game
  console.log("Creating game...");
  const tx = await onChess.connect(player1).createGame();
  await tx.wait();
  console.log("✅ Game created (ID: 0)\n");
  
  // Black joins
  const jtx = await onChess.connect(player2).joinGame(0);
  await jtx.wait();
  console.log("✅ Black joined the game\n");
  
  // Simulate a sequence of moves (Scholar's Mate)
  const moves = [
    { player: player1, from: "e2", to: "e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", desc: "White: e4" },
    { player: player2, from: "e7", to: "e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", desc: "Black: e5" },
    { player: player1, from: "f1", to: "c4", fen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2", desc: "White: Bc4" },
    { player: player2, from: "b8", to: "c6", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3", desc: "Black: Nc6" },
    { player: player1, from: "d1", to: "h5", fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", desc: "White: Qh5" },
    { player: player2, from: "g8", to: "f6", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", desc: "Black: Nf6" },
    { player: player1, from: "h5", to: "f7", fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4", desc: "White: Qxf7# (Checkmate!)" }
  ];
  
  console.log("Simulating Scholar's Mate sequence:\n");
  
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    console.log(`Move ${i + 1}: ${move.desc}`);
    
    const moveTx = await onChess.connect(move.player).makeMove(0, move.from, move.to, move.fen);
    const receipt = await moveTx.wait();
    
    // Parse event
    const event = receipt.logs.find(log => {
      try {
        return onChess.interface.parseLog(log).name === "MoveMade";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = onChess.interface.parseLog(event);
      console.log(`  ✅ Move recorded: ${parsed.args.from} → ${parsed.args.to}`);
    }
    console.log();
  }
  
  // Get final game state
  const game = await onChess.getGame(0);
  console.log("Final game state:");
  console.log(`Active: ${game.active}`);
  console.log(`FEN: ${game.fen}`);
  console.log(`Turn: ${game.turn === 0 ? 'White' : 'Black'}`);
  console.log("\n🎉 Simulation complete! Scholar's Mate executed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
