import { useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import Header from './components/Header'
import GameList from './components/GameList'
import GameBoard from './components/GameBoard'
import CreateGame from './components/CreateGame'
import './App.css'

const queryClient = new QueryClient()

function AppContent() {
  const [selectedGameId, setSelectedGameId] = useState(null)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [initialJoinGameId, setInitialJoinGameId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('gameId')
    if (gid) {
      setInitialJoinGameId(parseInt(gid))
      setShowCreateGame(true)
    }
  }, [])

  const handleGameCreated = (gameId) => {
    setShowCreateGame(false)
    if (gameId) {
      setSelectedGameId(gameId)
    } else {
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleGameSelected = (gameId) => {
    setSelectedGameId(gameId)
  }

  const handleBackToList = () => {
    setSelectedGameId(null)
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        {selectedGameId !== null ? (
          <GameBoard 
            gameId={selectedGameId} 
            onBack={handleBackToList}
          />
        ) : showCreateGame ? (
          <CreateGame 
            onGameCreated={handleGameCreated}
            onCancel={() => setShowCreateGame(false)}
            initialJoinGameId={initialJoinGameId}
          />
        ) : (
          <GameList 
            onGameSelect={handleGameSelected}
            onCreateGame={() => setShowCreateGame(true)}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>
      
      <footer className="footer">
        <div className="footer-content">
          <p>Built on Base • Every move is onchain</p>
          <div className="footer-links">
            <a href="https://base.org" target="_blank" rel="noopener noreferrer">About Base</a>
            <span>•</span>
            <a href="https://github.com/louischidebe" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
