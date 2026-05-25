import './styles/fonts.css'
import './styles/tokens.css'
import './styles/typography.css'
import './styles/editor.css'
import './styles/blocks.css'
import './styles/toolbar.css'
import './styles/dialog.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
