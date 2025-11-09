import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { CONTRACT_ABI } from '../config/abi'
import contractAddressData from '../contract-address.json'
import './CreateGame.css'

function CreateGame({ onGameCreated, onCancel, initialJoinGameId }) {
  const [joinCode, setJoinCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [generatedGameId, setGeneratedGameId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [joinedGameId, setJoinedGameId] = useState(null)
  const { address } = useAccount()
  const { data: hash, writeContract, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })
  const publicClient = usePublicClient()

  const createNewGame = async () => {
    try {
      writeContract({
        address: contractAddressData.address,
        abi: CONTRACT_ABI,
        functionName: 'createGame',
        args: []
      })
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Failed to create game: ' + error.message)
    }
  }

  // After confirmation, fetch latest gameId and show join code
  useEffect(() => {
    if (hash && !isConfirming && !isPending) {
      (async () => {
        try {
          const counter = await publicClient.readContract({
            address: contractAddressData.address,
            abi: CONTRACT_ABI,
            functionName: 'gameCounter'
          })
          const gameId = Number(counter) - 1
          const code = btoa(gameId.toString()).slice(0, 6).toUpperCase()
          setGeneratedCode(code)
          setGeneratedGameId(gameId)
          setStatusMessage(`✅ Game created! Share code: ${code}`)
        } catch (e) {
          console.error('Failed to fetch gameId:', e)
          setStatusMessage('❌ Failed to generate code')
        }
      })()
    }
  }, [hash, isConfirming, isPending, publicClient])

  // Navigate to game when join is successful or when player 1 gets notified
  useEffect(() => {
    if (joinedGameId !== null) {
      onGameCreated(joinedGameId)
    }
  }, [joinedGameId, onGameCreated])
  
  // Player 1: Navigate to game after player 2 joins (watch for GameJoined event)
  useEffect(() => {
    if (!generatedGameId || !publicClient) return
    
    const checkForOpponent = setInterval(async () => {
      try {
        const game = await publicClient.readContract({
          address: contractAddressData.address,
          abi: CONTRACT_ABI,
          functionName: 'getGame',
          args: [BigInt(generatedGameId)]
        })
        
        const zeroAddress = '0x0000000000000000000000000000000000000000'
        if (game.black !== zeroAddress && game.black !== address) {
          // Opponent joined!
          setStatusMessage('🎮 Opponent joined! Starting game...')
          setTimeout(() => {
            onGameCreated(generatedGameId)
          }, 1500)
          clearInterval(checkForOpponent)
        }
      } catch (e) {
        console.error('Error checking game:', e)
      }
    }, 3000) // Check every 3 seconds
    
    return () => clearInterval(checkForOpponent)
  }, [generatedGameId, publicClient, address, onGameCreated])

  const handleJoinByCode = async () => {
    if (!joinCode) {
      alert('Please enter a join code')
      return
    }
    let gameId
    try {
      gameId = parseInt(atob(joinCode))
    } catch (e) {
      alert('Invalid join code')
      return
    }
    
    // Verify game exists and needs a player
    try {
      const game = await publicClient.readContract({
        address: contractAddressData.address,
        abi: CONTRACT_ABI,
        functionName: 'getGame',
        args: [BigInt(gameId)]
      })
      
      const zeroAddress = '0x0000000000000000000000000000000000000000'
      if (game.black !== zeroAddress) {
        alert('This game already has both players')
        return
      }
      
      if (!game.active) {
        alert('This game is no longer active')
        return
      }
    } catch (e) {
      alert('Game not found or invalid code')
      return
    }
    
    try {
      writeContract({
        address: contractAddressData.address,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId)]
      })
      // Will navigate after transaction confirms
      setJoinedGameId(gameId)
    } catch (error) {
      console.error('Error joining game:', error)
      alert('Failed to join game: ' + error.message)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(`✅ Code ${text} copied to clipboard!`)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Auto-join if ?gameId is present in URL
  useEffect(() => {
    if (initialJoinGameId != null) {
      (async () => {
        try {
          writeContract({
            address: contractAddressData.address,
            abi: CONTRACT_ABI,
            functionName: 'joinGame',
            args: [BigInt(initialJoinGameId)]
          })
          setJoinedGameId(initialJoinGameId)
        } catch (e) {
          console.warn('Auto-join failed or already joined:', e?.message)
        }
      })()
    }
  }, [initialJoinGameId])

  return (
    <div className="create-game-container fade-in">
      <div className="create-game-card">
        <h2 className="create-game-title">
          Create or Join Game
        </h2>
        
        <p className="create-game-description">
          Create a new onchain game and share a short join code, or join a game using a code.
        </p>

        <div className="create-game-form">
          <div className="form-group">
            <label className="form-label">New Game</label>
            <button
              className="btn btn-primary"
              onClick={createNewGame}
              disabled={isPending || isConfirming}
            >
              {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Generate Join Code'}
            </button>
            {generatedCode && (
              <div className="status-message success" onClick={() => copyToClipboard(generatedCode)} style={{cursor: 'pointer'}}>
                🎲 Join Code: <strong style={{fontSize: '1.2em', letterSpacing: '2px'}}>{generatedCode}</strong>
                <span style={{marginLeft: '8px', fontSize: '0.9em'}}>📋 Click to copy</span>
              </div>
            )}
            {statusMessage && (
              <p className="form-hint" style={{marginTop: '8px'}}>{statusMessage}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Join Game by Code</label>
            <div className="flex gap-sm">
              <input
                type="text"
                className="form-input"
                placeholder="AB12XY"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                disabled={isPending || isConfirming}
              />
              <button className="btn btn-secondary" onClick={handleJoinByCode} disabled={isPending || isConfirming}>Join</button>
            </div>
            <p className="form-hint">Enter the short code your opponent shared</p>
          </div>

          {hash && isPending && (
            <div className="status-message">⏳ Waiting for signature...</div>
          )}
          {hash && isConfirming && (
            <div className="status-message">⏳ Confirming transaction...</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isPending || isConfirming}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateGame
