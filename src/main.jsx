import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installChunkReloadHandlers } from './lib/lazyWithRetry.js'
import './lib/firebase.js'
import './index.css'
import App from './App.jsx'

installChunkReloadHandlers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
