import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './styles/index.css'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import { TemaProvider } from './lib/tema'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": respeita prefers-reduced-motion em todo o app */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <TemaProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TemaProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
