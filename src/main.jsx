import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { installChunkReloadHandlers } from './lib/lazyWithRetry.js'
import { appQueryClient } from './lib/queryClient.js'
import './index.css'
import App from './App.jsx'

installChunkReloadHandlers()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
