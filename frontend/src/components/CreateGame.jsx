import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { CONTRACT_ABI } from '../config/abi'
import contractAddressData from '../contract-address.json'
import './CreateGame.css'

function CreateGame({ onGameCreated, onCancel, initialJoinGameId }) {
  const [joinCode, setJoinCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [challengeFid, setChallengeFid] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [sendNotification, setSendNotification] = useState(false)
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
          setStatusMessage(`✅ Game created! Share code: ${code}`)
          
          // Send notification if FID challenge was requested
          if (sendNotification && challengeFid) {
            try {
              const targetUrl = `${window.location.origin}/?gameId=${gameId}&code=${code}`
              const apiKey = import.meta.env.VITE_NEYNAR_API_KEY
              
              if (!apiKey) {
                setStatusMessage(`⚠️ Code: ${code} (No Neynar API key - notification not sent)`)
                return
              }

              const res = await fetch('https://api.neynar.com/v2/mini-app/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Api-Key': apiKey
                },
                body: JSON.stringify({
                  recipient_fid: Number(challengeFid),
                  title: '♟ New Chess Challenge!',
                  body: 'You have been challenged to an OnChess match.',
                  target_url: targetUrl
                })
              })
              
              if (!res.ok) {
                const text = await res.text()
                throw new Error(text)
              }
              
              setStatusMessage(`✅ Challenge sent to FID ${challengeFid}! Code: ${code}`)
            } catch (error) {
              console.error('Failed to send Neynar notification:', error)
              setStatusMessage(`⚠️ Code: ${code} (Notification failed: ${error.message})`)
            }
            setSendNotification(false)
          }
        } catch (e) {
          console.error('Failed to fetch gameId:', e)
          setStatusMessage('❌ Failed to generate code')
        }
      })()
    }
  }, [hash, isConfirming, isPending, publicClient, sendNotification, challengeFid])

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
    try {
      await writeContract({
        address: contractAddressData.address,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId)]
      })
      setStatusMessage(`Joined game #${gameId}`)
      onGameCreated?.()
    } catch (error) {
      console.error('Error joining game:', error)
      alert('Failed to join game: ' + error.message)
    }
  }

  const handleChallengeByFid = async () => {
    if (!challengeFid) {
      alert('Please enter opponent FID')
      return
    }
    setSendNotification(true)
    createNewGame()
  }

  // Auto-join if ?gameId is present in URL
  useEffect(() => {
    if (initialJoinGameId != null) {
      (async () => {
        try {
          await writeContract({
            address: contractAddressData.address,
            abi: CONTRACT_ABI,
            functionName: 'joinGame',
            args: [BigInt(initialJoinGameId)]
          })
          setStatusMessage(`Joined game #${initialJoinGameId}`)
          onGameCreated?.()
        } catch (e) {
          // ignore if already joined
          console.warn('Auto-join failed or already joined:', e?.message)
        }
      })()
    }
  }, [initialJoinGameId])

  return (
    <div className="create-game-container fade-in">
      <div className="create-game-card">
        <h2 className="create-game-title">
          <span className="title-icon">⚔️</span>
          Create or Join Game
        </h2>
        
        <p className="create-game-description">
          Create a new on-chain game and share a short join code, or join a game using a code. You can also challenge a Farcaster user by FID.
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
              <div className="status-message success">
                🎲 Join Code: <strong style={{fontSize: '1.2em', letterSpacing: '2px'}}>{generatedCode}</strong>
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

          <div className="form-group">
            <label className="form-label">Challenge by FID</label>
            <div className="flex gap-sm">
              <input
                type="number"
                className="form-input"
                placeholder="Enter opponent FID"
                value={challengeFid}
                onChange={(e) => setChallengeFid(e.target.value)}
                disabled={isPending || isConfirming}
              />
              <button className="btn btn-primary" onClick={handleChallengeByFid} disabled={isPending || isConfirming}>Challenge</button>
            </div>
            <p className="form-hint">Sends a Farcaster notification via Neynar with a join link</p>
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
