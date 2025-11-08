import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import sdk from '@farcaster/frame-sdk'
import './index.css'
import App from './App.jsx'

// Initialize Farcaster SDK
const initApp = async () => {
  try {
    const context = await sdk.context
    console.log('Farcaster context:', context)
  } catch (error) {
    console.warn('Not running in Farcaster frame:', error)
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Signal to Farcaster that the app is ready
  sdk.actions.ready()
}

initApp()
