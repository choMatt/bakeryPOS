import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProductManager from './components/ProductManager'
import App from './App'

createRoot(document.getElementById('root')).render(
  
  <StrictMode>
    <App/>
  </StrictMode>,
)

// Offline support (production build only, so it doesn't get in the way of dev)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}

// Ask the browser not to clear the sales database when storage runs low
navigator.storage?.persist?.()