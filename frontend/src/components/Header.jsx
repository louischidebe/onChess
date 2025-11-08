import { useAccount, useConnect, useDisconnect } from 'wagmi'
import './Header.css'

function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo">
            <span className="logo-icon">♔</span>
            <h1 className="logo-text">OnChess</h1>
          </div>
          <span className="badge">On Base</span>
        </div>

        <div className="wallet-section">
          {isConnected ? (
            <div className="connected-wallet">
              <div className="wallet-address">
                <span className="wallet-indicator"></span>
                {formatAddress(address)}
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="connect-buttons">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  className="btn btn-primary"
                  onClick={() => connect({ connector })}
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
