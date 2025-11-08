import { useState, useEffect } from 'react'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import { CONTRACT_ABI } from '../config/abi'
import contractAddressData from '../contract-address.json'
import './GameList.css'

function GameList({ onGameSelect, onCreateGame, refreshTrigger }) {
  const { address } = useAccount()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const publicClient = usePublicClient()

  const { data: gameCounter } = useReadContract({
    address: contractAddressData.address,
    abi: CONTRACT_ABI,
    functionName: 'gameCounter',
    watch: true
  })

  useEffect(() => {
    const fetchGames = async () => {
      if (!gameCounter || !publicClient) return

      setLoading(true)
      const gamesList = []
      const count = Number(gameCounter)

      for (let i = 0; i < count; i++) {
        try {
          const game = await publicClient.readContract({
            address: contractAddressData.address,
            abi: CONTRACT_ABI,
            functionName: 'getGame',
            args: [BigInt(i)]
          })

          gamesList.push({
            id: i,
            ...game
          })
        } catch (error) {
          console.error(`Error fetching game ${i}:`, error)
        }
      }

      setGames(gamesList.reverse()) // Show newest first
      setLoading(false)
    }

    fetchGames()
  }, [gameCounter, publicClient, refreshTrigger])

  const isMyGame = (game) => {
    if (!address) return false
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    return game.white?.toLowerCase() === address.toLowerCase() || 
           (game.black?.toLowerCase() === address.toLowerCase() && game.black !== zeroAddress)
  }

  const getGameStatus = (game) => {
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    if (!game.active) {
      if (game.winner && game.winner !== zeroAddress) {
        return `Won by ${game.winner.slice(0, 8)}...`
      }
      return 'Ended'
    }
    if (game.black === zeroAddress) {
      return 'Waiting for opponent'
    }
    return game.turn === 0 ? "White's turn" : "Black's turn"
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const myGames = games.filter(isMyGame)
  const otherGames = games.filter(g => !isMyGame(g))

  if (!address) {
    return (
      <div className="game-list-container">
        <div className="empty-state">
          <div className="empty-icon">🔌</div>
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to view and create games</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-list-container fade-in">
      <div className="game-list-header">
        <div>
          <h2 className="game-list-title">Your Games</h2>
          <p className="game-list-subtitle">All games are stored on-chain on Base</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateGame}>
          <span>+</span> New Game
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading games from chain...</p>
        </div>
      ) : (
        <>
          {myGames.length > 0 ? (
            <div className="games-grid">
              {myGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isMyGame={true}
                  currentAddress={address}
                  onSelect={() => onGameSelect(game.id)}
                  getGameStatus={getGameStatus}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">♟️</div>
              <h3>No active games</h3>
              <p>Create a new game to start playing</p>
              <button className="btn btn-primary" onClick={onCreateGame}>
                Create Game
              </button>
            </div>
          )}

          {otherGames.length > 0 && (
            <>
              <h3 className="section-title">Other Games</h3>
              <div className="games-grid">
                {otherGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isMyGame={false}
                    currentAddress={address}
                    onSelect={() => onGameSelect(game.id)}
                    getGameStatus={getGameStatus}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function GameCard({ game, isMyGame, currentAddress, onSelect, getGameStatus }) {
  const formatAddress = (addr) => {
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    if (addr === zeroAddress) return 'Waiting...'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
  const isWhite = game.white?.toLowerCase() === currentAddress?.toLowerCase()
  const zeroAddress = '0x0000000000000000000000000000000000000000'
  const needsOpponent = game.black === zeroAddress
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div 
      className={`game-card ${isMyGame ? 'my-game' : ''} ${!game.active ? 'ended' : ''}`}
      onClick={onSelect}
    >
      <div className="game-card-header">
        <div className="game-id">
          Game #{game.id}
          <span style={{marginLeft: '8px', fontSize: '0.85em', opacity: 0.7}}>
            {formatTimestamp(game.createdAt)}
          </span>
        </div>
        <div className={`game-status ${game.active ? 'active' : 'ended'}`}>
          {getGameStatus(game)}
        </div>
      </div>

      <div className="game-players">
        <div className={`player ${isWhite ? 'you' : ''}`}>
          <span className="piece">♔</span>
          <div>
            <div className="player-color">White</div>
            <div className="player-addr">{formatAddress(game.white)}</div>
          </div>
          {isWhite && <span className="you-badge">You</span>}
        </div>

        <div className="vs">VS</div>

        <div className={`player ${!isWhite && isMyGame ? 'you' : ''} ${needsOpponent ? 'waiting' : ''}`}>
          <span className="piece">♚</span>
          <div>
            <div className="player-color">Black</div>
            <div className="player-addr">{formatAddress(game.black)}</div>
          </div>
          {!isWhite && isMyGame && !needsOpponent && <span className="you-badge">You</span>}
        </div>
      </div>

      {game.active && isMyGame && (
        <div className="game-card-footer">
          {(isWhite && game.turn === 0) || (!isWhite && game.turn === 1) ? (
            <div className="your-turn">🔥 Your turn!</div>
          ) : (
            <div className="waiting">⏳ Waiting for opponent</div>
          )}
        </div>
      )}
    </div>
  )
}

export default GameList
