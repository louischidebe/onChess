// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OnChess
 * @notice Fully on-chain 1v1 chess game contract for Farcaster miniapp on Base.
 * @dev Each move is an on-chain transaction. The contract stores authoritative minimal state:
 *      FEN string, player addresses, turn, active flag, timestamps.
 *      Move legality is computed client-side using chess.js; contract enforces turn order
 *      and accepts newFEN from client. Each move can include a configurable dev fee.
 */
contract OnChess is Ownable, ReentrancyGuard {
    
    struct Game {
        address white;           // White player address
        address black;           // Black player address
        string fen;              // Current board FEN string
        uint8 turn;              // 0 = white's turn, 1 = black's turn
        bool active;             // Game is currently active
        uint256 createdAt;       // Block timestamp when game was created
        uint256 lastMoveAt;      // Block timestamp of last move
        address winner;          // Winner address (0x0 if game ongoing or draw)
    }
    
    // Game storage
    mapping(uint256 => Game) public games;
    uint256 public gameCounter;
    
    // Developer fee configuration (per move, in wei)
    uint256 public devFee;
    uint256 public accumulatedFees;
    
    // Game timeout: 1 hour for any inactive game
    uint256 constant GAME_TIMEOUT = 1 hours;
    
    // Starting position FEN
    string constant STARTING_FEN = "startpos";
    
    // Events
    event GameCreated(uint256 indexed gameId, address indexed white);
    event GameJoined(uint256 indexed gameId, address indexed player);
    event MoveMade(uint256 indexed gameId, address indexed player, string from, string to, string newFen, uint256 timestamp);
    event GameEnded(uint256 indexed gameId, address indexed winner, string reason, uint256 timestamp);
    event DevFeeChanged(uint256 oldFee, uint256 newFee);
    
    constructor() Ownable(msg.sender) {
        devFee = 0; // Default no fee; owner can set later
    }
    
    /**
     * @notice Create a new chess game
     * @return gameId The ID of the newly created game
     */
    function createGame() external returns (uint256 gameId) {
        gameId = gameCounter++;
        
        games[gameId] = Game({
            white: msg.sender,
            black: address(0),
            fen: STARTING_FEN,
            turn: 0, // White moves first
            active: true,
            createdAt: block.timestamp,
            lastMoveAt: block.timestamp,
            winner: address(0)
        });
        
        emit GameCreated(gameId, msg.sender);
    }
    
    /**
     * @notice Join an existing game as black
     * @param gameId The game ID
     */
    function joinGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.active, "Game is not active");
        require(game.black == address(0), "Game already has an opponent");
        require(msg.sender != game.white, "Host cannot join as opponent");
        
        // Check if game has timed out (inactive for over 1 hour without opponent)
        if (block.timestamp > game.createdAt + GAME_TIMEOUT) {
            game.active = false;
            emit GameEnded(gameId, address(0), "timeout - no opponent joined", block.timestamp);
            revert("Game has timed out");
        }
        
        game.black = msg.sender;
        game.lastMoveAt = block.timestamp;
        
        emit GameJoined(gameId, msg.sender);
    }
    /**
     * @notice Close an inactive game that has timed out
     * @param gameId The game ID
     * @dev Anyone can call this for games inactive over 1 hour
     */
    function closeInactiveGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.active, "Game already ended");
        require(block.timestamp > game.lastMoveAt + GAME_TIMEOUT, "Game has not timed out yet");
        
        game.active = false;
        
        emit GameEnded(gameId, address(0), "timeout - inactive", block.timestamp);
    }
    
    /**
     * @notice Make a move in an active game
     * @param gameId The game ID
     * @param from Move from square (e.g., "e2")
     * @param to Move to square (e.g., "e4")
     * @param newFen The new FEN string after the move (computed client-side)
     * @dev Caller must be the player whose turn it is. If devFee > 0, msg.value must equal devFee.
     */
    function makeMove(
        uint256 gameId, 
        string calldata from, 
        string calldata to, 
        string calldata newFen
    ) external payable {
        Game storage game = games[gameId];
        
        require(game.active, "Game is not active");
        require(
            (game.turn == 0 && msg.sender == game.white) || 
            (game.turn == 1 && msg.sender == game.black),
            "Not your turn"
        );
        
        // Enforce dev fee if set
        if (devFee > 0) {
            require(msg.value == devFee, "Incorrect dev fee");
            accumulatedFees += msg.value;
        } else {
            require(msg.value == 0, "No fee required");
        }
        
        // Basic validation: from and to should not be empty
        require(bytes(from).length > 0 && bytes(to).length > 0, "Invalid move notation");
        require(bytes(newFen).length > 0, "Invalid FEN");
        
        // Update game state
        game.fen = newFen;
        game.turn = game.turn == 0 ? 1 : 0; // Toggle turn
        game.lastMoveAt = block.timestamp;
        
        emit MoveMade(gameId, msg.sender, from, to, newFen, block.timestamp);
    }
    
    /**
     * @notice Resign from a game (forfeit)
     * @param gameId The game ID
     * @dev Caller must be one of the players. The other player wins.
     */
    function resign(uint256 gameId) external {
        Game storage game = games[gameId];
        
        require(game.active, "Game is not active");
        require(
            msg.sender == game.white || msg.sender == game.black,
            "Not a player in this game"
        );
        
        game.active = false;
        game.winner = msg.sender == game.white ? game.black : game.white;
        
        emit GameEnded(gameId, game.winner, "resignation", block.timestamp);
    }
    
    /**
     * @notice Terminate a game (owner/admin emergency function)
     * @param gameId The game ID
     * @dev Only owner can call. Use in case of disputes or bugs. No winner declared.
     */
    function terminateGame(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.active, "Game already ended");
        
        game.active = false;
        
        emit GameEnded(gameId, address(0), "terminated by admin", block.timestamp);
    }
    
    /**
     * @notice Set the per-move developer fee
     * @param feeWei New fee amount in wei
     * @dev Only owner can call. Fee is charged per move and accumulated for withdrawal.
     */
    function setDevFee(uint256 feeWei) external onlyOwner {
        uint256 oldFee = devFee;
        devFee = feeWei;
        emit DevFeeChanged(oldFee, feeWei);
    }
    
    /**
     * @notice Withdraw accumulated developer fees
     * @dev Only owner can call. Protected against reentrancy.
     */
    function withdrawDeveloperFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @notice Get game details
     * @param gameId The game ID
     * @return Game struct data
     */
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    /**
     * @notice Get accumulated developer fees
     * @return Amount in wei
     */
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees;
    }
}
