import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { debugBootLog, installDebugBootHandlers } from './lib/debugBoot.js'
import './lib/firebase.js'
import './index.css'
import App from './App.jsx'

installDebugBootHandlers()
debugBootLog('main.jsx:bootstrap', 'Main entry starting', { href: typeof location !== 'undefined' ? location.href : '' }, 'A')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

debugBootLog('main.jsx:render-called', 'React render invoked', {}, 'A')
