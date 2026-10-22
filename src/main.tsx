import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startRemovingNlBadgeFrame } from './removeNlBadgeFrame.ts'

startRemovingNlBadgeFrame()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
