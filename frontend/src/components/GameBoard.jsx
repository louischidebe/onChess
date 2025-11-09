import { useState, useEffect, useMemo } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, usePublicClient } from 'wagmi'
import { CONTRACT_ABI } from '../config/abi'
import contractAddressData from '../contract-address.json'
import './GameBoard.css'

function GameBoard({ gameId, onBack }) {
  const { address } = useAccount()
  const [game, setGame] = useState(new Chess())
  const [moveFrom, setMoveFrom] = useState('')
  const [moveTo, setMoveTo] = useState(null)
  const [showPromotionDialog, setShowPromotionDialog] = useState(false)
  const [optionSquares, setOptionSquares] = useState({})
  const [rightClickedSquares, setRightClickedSquares] = useState({})
  const [rematchGameId, setRematchGameId] = useState(null)
  const [rematchRequested, setRematchRequested] = useState(false)
  const publicClient = usePublicClient()

  // Read game state from contract
  const { data: gameData, refetch } = useReadContract({
    address: contractAddressData.address,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
    watch: true
  })

  // Read dev fee
  const { data: devFee } = useReadContract({
    address: contractAddressData.address,
    abi: CONTRACT_ABI,
    functionName: 'devFee',
    watch: true
  })

  // Write contract for making moves
  const { data: hash, writeContract, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  // Write contract for resigning
  const { data: resignHash, writeContract: resignContract, isPending: isResignPending } = useWriteContract()
  const { isLoading: isResignConfirming } = useWaitForTransactionReceipt({ hash: resignHash })
  
  // Write contract for rematch
  const { data: rematchHash, writeContract: rematchContract, isPending: isRematchPending } = useWriteContract()
  const { isLoading: isRematchConfirming } = useWaitForTransactionReceipt({ hash: rematchHash })

  // Watch for move events
  useWatchContractEvent({
    address: contractAddressData.address,
    abi: CONTRACT_ABI,
    eventName: 'MoveMade',
    onLogs: (logs) => {
      const relevantLog = logs.find(log => Number(log.args.gameId) === gameId)
      if (relevantLog) {
        refetch()
      }
    }
  })

  // Update chess.js game when contract state changes
  useEffect(() => {
    if (gameData && gameData.fen) {
      try {
        const newGame = gameData.fen === 'startpos' ? new Chess() : new Chess(gameData.fen)
        setGame(newGame)
      } catch (error) {
        console.error('Invalid FEN:', error)
      }
    }
  }, [gameData])

  const isWhite = useMemo(() => {
    return gameData?.white?.toLowerCase() === address?.toLowerCase()
  }, [gameData, address])

  const isMyTurn = useMemo(() => {
    if (!gameData || !address) return false
    const turn = Number(gameData.turn)
    return (turn === 0 && isWhite) || (turn === 1 && !isWhite)
  }, [gameData, address, isWhite])

  const boardOrientation = isWhite ? 'white' : 'black'

  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true })
    if (moves.length === 0) {
      setOptionSquares({})
      return false
    }

    const newSquares = {}
    moves.forEach((move) => {
      newSquares[move.to] = {
        background: game.get(move.to)
          ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      }
    })
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)'
    }
    setOptionSquares(newSquares)
    return true
  }

  function onSquareClick(square) {
    if (!gameData?.active || !isMyTurn) return

    // If we haven't selected a piece yet
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square)
      if (hasMoveOptions) setMoveFrom(square)
      return
    }

    // Check if we're clicking the same square (deselect)
    if (square === moveFrom) {
      setMoveFrom('')
      setOptionSquares({})
      return
    }

    // Try to make a move
    const moves = game.moves({ square: moveFrom, verbose: true })
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square)

    if (!foundMove) {
      // Not a valid move, try selecting a new piece
      const hasMoveOptions = getMoveOptions(square)
      setMoveFrom(hasMoveOptions ? square : '')
      return
    }

    // Check for pawn promotion
    if (
      (foundMove.piece === 'p' &&
        ((foundMove.color === 'w' && square[1] === '8') ||
          (foundMove.color === 'b' && square[1] === '1')))
    ) {
      setMoveTo(square)
      setShowPromotionDialog(true)
      return
    }

    // Make the move
    makeMove(moveFrom, square)
  }

  function onPromotionPieceSelect(piece) {
    makeMove(moveFrom, moveTo, piece)
    setShowPromotionDialog(false)
    setMoveTo(null)
  }

  async function makeMove(from, to, promotion) {
    // Make move in local game to get new FEN
    const gameCopy = new Chess(game.fen())
    let move
    try {
      move = gameCopy.move({
        from,
        to,
        promotion: promotion || 'q'
      })
    } catch (error) {
      console.error('Invalid move:', error)
      setMoveFrom('')
      setOptionSquares({})
      return
    }

    if (!move) {
      setMoveFrom('')
      setOptionSquares({})
      return
    }

    const newFen = gameCopy.fen()

    // Send transaction
    try {
      writeContract({
        address: contractAddressData.address,
        abi: CONTRACT_ABI,
        functionName: 'makeMove',
        args: [BigInt(gameId), from, to, newFen],
        value: devFee || BigInt(0)
      })
    } catch (error) {
      console.error('Transaction error:', error)
      alert('Failed to submit move: ' + error.message)
    }

    setMoveFrom('')
    setOptionSquares({})
  }

  function handleResign() {
    if (!window.confirm('Are you sure you want to resign?')) return

    resignContract({
      address: contractAddressData.address,
      abi: CONTRACT_ABI,
      functionName: 'resign',
      args: [BigInt(gameId)]
    })
  }
  
  // Rematch functionality
  const handleRequestRematch = () => {
    setRematchRequested(true)
    rematchContract({
      address: contractAddressData.address,
      abi: CONTRACT_ABI,
      functionName: 'createGame',
      args: []
    })
  }
  
  const handleAcceptRematch = () => {
    if (!rematchGameId) return
    rematchContract({
      address: contractAddressData.address,
      abi: CONTRACT_ABI,
      functionName: 'joinGame',
      args: [BigInt(rematchGameId)]
    })
  }
  
  // Watch for rematch game creation
  useEffect(() => {
    if (rematchHash && !isRematchConfirming && !isRematchPending && rematchRequested) {
      (async () => {
        try {
          const counter = await publicClient.readContract({
            address: contractAddressData.address,
            abi: CONTRACT_ABI,
            functionName: 'gameCounter'
          })
          const newGameId = Number(counter) - 1
          setRematchGameId(newGameId)
        } catch (e) {
          console.error('Failed to get rematch game ID:', e)
        }
      })()
    }
  }, [rematchHash, isRematchConfirming, isRematchPending, rematchRequested, publicClient])
  
  // Poll for opponent accepting rematch
  useEffect(() => {
    if (!rematchGameId || !publicClient) return
    
    const checkRematch = setInterval(async () => {
      try {
        const game = await publicClient.readContract({
          address: contractAddressData.address,
          abi: CONTRACT_ABI,
          functionName: 'getGame',
          args: [BigInt(rematchGameId)]
        })
        
        const zeroAddress = '0x0000000000000000000000000000000000000000'
        if (game.black !== zeroAddress) {
          // Opponent joined rematch!
          clearInterval(checkRematch)
          window.location.href = `/?game=${rematchGameId}`
          onBack()
          setTimeout(() => {
            // Navigate to new game (you'll need to add this prop)
            if (window.location.pathname === '/') {
              window.location.reload()
            }
          }, 500)
        }
      } catch (e) {
        console.error('Error checking rematch:', e)
      }
    }, 3000)
    
    return () => clearInterval(checkRematch)
  }, [rematchGameId, publicClient, onBack])

  function onSquareRightClick(square) {
    const color = 'rgba(0, 82, 255, 0.4)'
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]: rightClickedSquares[square]
        ? undefined
        : { backgroundColor: color }
    })
  }

  if (!gameData) {
    return (
      <div className="game-board-container">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`

  return (
    <div className="game-board-container fade-in">
      <div className="game-board-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Games
        </button>
        <div className="game-info">
          <h2>Game #{gameId}</h2>
          {!gameData.active && (
            <span className="game-ended-badge">Game Ended</span>
          )}
        </div>
      </div>

      <div className="game-layout">
        <div className="game-sidebar">
          <div className="player-panel">
            <div className={`player-info ${!isWhite ? 'you' : ''}`}>
              <div className="player-piece">♚</div>
              <div className="player-details">
                <div className="player-name">
                  Black {!isWhite && '(You)'}
                </div>
                <div className="player-address">{formatAddress(gameData.black)}</div>
              </div>
              {gameData.turn === 1 && gameData.active && (
                <div className="turn-indicator">⏰</div>
              )}
            </div>
          </div>

          <div className="game-status-panel">
            {gameData.active ? (
              <>
                <div className="status-item">
                  <span className="status-label">Turn:</span>
                  <span className="status-value">
                    {gameData.turn === 0 ? 'White' : 'Black'}
                  </span>
                </div>
                {isMyTurn && (
                  <div className="your-turn-notice">
                    🔥 Your turn to move!
                  </div>
                )}
                {devFee && BigInt(devFee) > 0 && (
                  <div className="fee-notice">
                    💰 Fee per move: {(Number(devFee) / 1e18).toFixed(6)} ETH
                  </div>
                )}
              </>
            ) : (
              <div className="game-over">
                <h3>Game Over</h3>
                {gameData.winner && gameData.winner !== '0x0000000000000000000000000000000000000000' && (
                  <p>Winner: {formatAddress(gameData.winner)}</p>
                )}
                
                {/* Rematch Section */}
                <div className="rematch-section" style={{marginTop: '1rem'}}>
                  {!rematchGameId && !rematchRequested ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleRequestRematch}
                      disabled={isRematchPending || isRematchConfirming}
                    >
                      {isRematchPending || isRematchConfirming ? 'Creating Rematch...' : '🔁 Request Rematch'}
                    </button>
                  ) : rematchGameId && gameData.white?.toLowerCase() === address?.toLowerCase() ? (
                    <div className="rematch-waiting">
                      <p>⏳ Waiting for opponent to accept rematch...</p>
                      <p style={{fontSize: '0.85em', opacity: 0.7}}>Game #{rematchGameId}</p>
                    </div>
                  ) : rematchGameId ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleAcceptRematch}
                      disabled={isRematchPending || isRematchConfirming}
                    >
                      {isRematchPending || isRematchConfirming ? 'Accepting...' : '✅ Accept Rematch'}
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {game.isCheckmate() && <div className="checkmate">♔ Checkmate!</div>}
            {game.isCheck() && !game.isCheckmate() && <div className="check">⚠️ Check!</div>}
            {game.isDraw() && <div className="draw">🤝 Draw</div>}
          </div>

          {gameData.active && (
            <div className="game-actions">
              <button
                className="btn btn-danger"
                onClick={handleResign}
                disabled={isResignPending || isResignConfirming}
              >
                {isResignPending || isResignConfirming ? 'Resigning...' : 'Resign'}
              </button>
            </div>
          )}

          {(isPending || isConfirming) && (
            <div className="transaction-status">
              <div className="loader-small"></div>
              <p>{isPending ? 'Submitting move...' : 'Confirming...'}</p>
            </div>
          )}

          {hash && !isPending && !isConfirming && (
            <div className="transaction-success">
              ✅ Move submitted!
            </div>
          )}
        </div>

        <div className="chessboard-wrapper">
          <Chessboard
            position={game.fen()}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            boardOrientation={boardOrientation}
            customSquareStyles={{
              ...optionSquares,
              ...rightClickedSquares
            }}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
            }}
            areArrowsAllowed={true}
          />
        </div>

        <div className="game-sidebar">
          <div className="player-panel">
            <div className={`player-info ${isWhite ? 'you' : ''}`}>
              <div className="player-piece">♔</div>
              <div className="player-details">
                <div className="player-name">
                  White {isWhite && '(You)'}
                </div>
                <div className="player-address">{formatAddress(gameData.white)}</div>
              </div>
              {gameData.turn === 0 && gameData.active && (
                <div className="turn-indicator">⏰</div>
              )}
            </div>
          </div>

          <div className="move-history-panel">
            <h4>Move History</h4>
            <div className="move-history">
              {game.history().length === 0 ? (
                <p className="no-moves">No moves yet</p>
              ) : (
                <div className="moves-list">
                  {game.history({ verbose: true }).map((move, index) => (
                    <div key={index} className="move-item">
                      <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                      <span className="move-notation">{move.san}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPromotionDialog && (
        <PromotionDialog
          color={game.turn()}
          onSelect={onPromotionPieceSelect}
          onCancel={() => {
            setShowPromotionDialog(false)
            setMoveTo(null)
            setMoveFrom('')
            setOptionSquares({})
          }}
        />
      )}
    </div>
  )
}

function PromotionDialog({ color, onSelect, onCancel }) {
  const pieces = [
    { piece: 'q', label: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { piece: 'r', label: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { piece: 'b', label: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { piece: 'n', label: 'Knight', symbol: color === 'w' ? '♘' : '♞' }
  ]

  return (
    <div className="promotion-overlay" onClick={onCancel}>
      <div className="promotion-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Choose Promotion Piece</h3>
        <div className="promotion-pieces">
          {pieces.map(({ piece, label, symbol }) => (
            <button
              key={piece}
              className="promotion-piece"
              onClick={() => onSelect(piece)}
            >
              <span className="piece-symbol">{symbol}</span>
              <span className="piece-label">{label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default GameBoard
