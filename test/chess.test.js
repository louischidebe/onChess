const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OnChess Contract", function () {
  let onChess;
  let owner;
  let player1;
  let player2;
  
  const STARTING_FEN = "startpos";
  
  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    
    const OnChess = await ethers.getContractFactory("OnChess");
    onChess = await OnChess.deploy();
    await onChess.waitForDeployment();
  });
  
  describe("Game Creation", function () {
    it("Should create a new game with correct initial state", async function () {
      const tx = await onChess.connect(player1).createGame();
      const receipt = await tx.wait();
      
      // Check GameCreated event
      const event = receipt.logs.find(log => {
        try {
          return onChess.interface.parseLog(log).name === "GameCreated";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
      
      const game = await onChess.getGame(0);
      expect(game.white).to.equal(player1.address);
      expect(game.black).to.equal(ethers.ZeroAddress);
      expect(game.fen).to.equal(STARTING_FEN);
      expect(game.turn).to.equal(0); // White's turn
      expect(game.active).to.be.true;
    });
    
    it("Should initialize game with empty black player", async function () {
      await onChess.connect(player1).createGame();
      const game = await onChess.getGame(0);
      expect(game.black).to.equal(ethers.ZeroAddress);
    });
    
    it("Should increment game counter", async function () {
      await onChess.connect(player1).createGame();
      await onChess.connect(player1).createGame();
      
      const gameCounter = await onChess.gameCounter();
      expect(gameCounter).to.equal(2);
    });
  });
  
  describe("Making Moves", function () {
    beforeEach(async function () {
      await onChess.connect(player1).createGame();
    });
    
    it("Should allow white to make first move", async function () {
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      
      const tx = await onChess.connect(player1).makeMove(0, "e2", "e4", newFen);
      const receipt = await tx.wait();
      
      const game = await onChess.getGame(0);
      expect(game.fen).to.equal(newFen);
      expect(game.turn).to.equal(1); // Now black's turn
      
      // Check MoveMade event
      const event = receipt.logs.find(log => {
        try {
          return onChess.interface.parseLog(log).name === "MoveMade";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });
    
    it("Should enforce turn order", async function () {
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      
      await expect(
        onChess.connect(player2).makeMove(0, "e7", "e5", newFen)
      ).to.be.revertedWith("Not your turn");
    });
    
    it("Should allow alternating moves", async function () {
      // White moves e2-e4
      let newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      await onChess.connect(player1).makeMove(0, "e2", "e4", newFen);
      
      // Black joins the game
      await onChess.connect(player2).joinGame(0);
      
      // Black moves e7-e5
      newFen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2";
      await onChess.connect(player2).makeMove(0, "e7", "e5", newFen);
      
      // White moves Nf3
      newFen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
      await onChess.connect(player1).makeMove(0, "g1", "f3", newFen);
      
      const game = await onChess.getGame(0);
      expect(game.turn).to.equal(1); // Black's turn again
    });
  });
  
  describe("Developer Fee", function () {
    beforeEach(async function () {
      await onChess.connect(player1).createGame();
    });
    
    it("Should allow owner to set dev fee", async function () {
      const fee = ethers.parseEther("0.001");
      await onChess.connect(owner).setDevFee(fee);
      
      expect(await onChess.devFee()).to.equal(fee);
    });
    
    it("Should enforce dev fee on moves", async function () {
      const fee = ethers.parseEther("0.001");
      await onChess.connect(owner).setDevFee(fee);
      
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      
      // Should fail without fee
      await expect(
        onChess.connect(player1).makeMove(0, "e2", "e4", newFen)
      ).to.be.revertedWith("Incorrect dev fee");
      
      // Should succeed with fee
      await onChess.connect(player1).makeMove(0, "e2", "e4", newFen, { value: fee });
      
      expect(await onChess.accumulatedFees()).to.equal(fee);
    });
    
    it("Should allow owner to withdraw fees", async function () {
      const fee = ethers.parseEther("0.001");
      await onChess.connect(owner).setDevFee(fee);
      
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      await onChess.connect(player1).makeMove(0, "e2", "e4", newFen, { value: fee });
      
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await onChess.connect(owner).withdrawDeveloperFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(balanceAfter).to.be.closeTo(balanceBefore + fee - gasUsed, ethers.parseEther("0.0001"));
      expect(await onChess.accumulatedFees()).to.equal(0);
    });
  });
  
  describe("Resignation", function () {
    beforeEach(async function () {
      await onChess.connect(player1).createGame();
    });
    
    it("Should allow player to resign", async function () {
      // Ensure opponent joined to have a winner
      await onChess.connect(player2).joinGame(0);
      
      const tx = await onChess.connect(player1).resign(0);
      const receipt = await tx.wait();
      
      const game = await onChess.getGame(0);
      expect(game.active).to.be.false;
      expect(game.winner).to.equal(player2.address);
      
      // Check GameEnded event
      const event = receipt.logs.find(log => {
        try {
          return onChess.interface.parseLog(log).name === "GameEnded";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });
    
    it("Should not allow moves after resignation", async function () {
      await onChess.connect(player1).resign(0);
      
      const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      await expect(
        onChess.connect(player1).makeMove(0, "e2", "e4", newFen)
      ).to.be.revertedWith("Game is not active");
    });
  });
  
  describe("Admin Functions", function () {
    beforeEach(async function () {
      await onChess.connect(player1).createGame();
    });
    
    it("Should allow owner to terminate game", async function () {
      await onChess.connect(owner).terminateGame(0);
      
      const game = await onChess.getGame(0);
      expect(game.active).to.be.false;
      expect(game.winner).to.equal(ethers.ZeroAddress);
    });
    
    it("Should not allow non-owner to set dev fee", async function () {
      await expect(
        onChess.connect(player1).setDevFee(ethers.parseEther("0.001"))
      ).to.be.reverted;
    });
  });
});
