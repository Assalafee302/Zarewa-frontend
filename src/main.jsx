import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { debugBootLog, installDebugBootHandlers } from './lib/debugBoot.js'
import './lib/firebase.js'
import './index.css'

installDebugBootHandlers()
debugBootLog('main.jsx:bootstrap', 'Main entry starting', { href: typeof location !== 'undefined' ? location.href : '' }, 'A')

import('./App.jsx')
  .then(({ default: App }) => {
    debugBootLog('main.jsx:app-import-ok', 'App module imported successfully', {}, 'A')
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    debugBootLog('main.jsx:render-called', 'React render invoked', {}, 'A')
  })
  .catch((err) => {
    debugBootLog(
      'main.jsx:app-import-fail',
      'App module import failed',
      { message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 800) },
      'A'
    )
    throw err
  })
