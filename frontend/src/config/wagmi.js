import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors'

// Use Base mainnet as priority chain
const currentChain = base

// Configure wagmi
export const config = createConfig({
  chains: [currentChain],
  connectors: [
    coinbaseWallet({
      appName: 'OnChess',
      preference: 'smartWalletOnly',
    }),
    metaMask({
      dappMetadata: {
        name: 'OnChess',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://onchess.app',
      }
    }),
    injected()
  ],
  transports: {
    [currentChain.id]: http(import.meta.env.VITE_RPC_URL || 'https://mainnet.base.org')
  },
  ssr: false
})

export { currentChain }
