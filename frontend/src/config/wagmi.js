import { http, createConfig } from 'wagmi'
import { base, baseSepolia, localhost } from 'wagmi/chains'
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors'

// Determine chain based on environment
const chainId = parseInt(import.meta.env.VITE_CHAIN_ID || '31337')

const chains = {
  31337: localhost,
  84532: baseSepolia,
  8453: base
}

const currentChain = chains[chainId] || localhost

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
    [currentChain.id]: http(import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545')
  },
  ssr: false
})

export { currentChain }
