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
    return game.white?.toLowerCase() === address.toLowerCase() || 
           game.black?.toLowerCase() === address.toLowerCase()
  }

  const getGameStatus = (game) => {
    if (!game.active) {
      if (game.winner && game.winner !== '0x0000000000000000000000000000000000000000') {
        return `Won by ${game.winner.slice(0, 8)}...`
      }
      return 'Ended'
    }
    return game.turn === 0 ? "White's turn" : "Black's turn"
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
  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const isWhite = game.white?.toLowerCase() === currentAddress?.toLowerCase()

  return (
    <div 
      className={`game-card ${isMyGame ? 'my-game' : ''} ${!game.active ? 'ended' : ''}`}
      onClick={onSelect}
    >
      <div className="game-card-header">
        <div className="game-id">Game #{game.id}</div>
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

        <div className={`player ${!isWhite && isMyGame ? 'you' : ''}`}>
          <span className="piece">♚</span>
          <div>
            <div className="player-color">Black</div>
            <div className="player-addr">{formatAddress(game.black)}</div>
          </div>
          {!isWhite && isMyGame && <span className="you-badge">You</span>}
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
