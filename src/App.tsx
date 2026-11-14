import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Cabecalho } from './components/Cabecalho'
import { Rodape } from './components/Rodape'
import { Protegida } from './components/Protegida'
import { Aviso, Carregando } from './components/Aviso'
import { supabaseConfigurado } from './lib/supabase'
import Home from './pages/Home'
import Entrar from './pages/Entrar'
const Cadastro = lazy(() => import('./pages/Cadastro'))
const MinhasAliadas = lazy(() => import('./pages/MinhasAliadas'))
const Conexoes = lazy(() => import('./pages/Conexoes'))
const MinhaConta = lazy(() => import('./pages/MinhaConta'))
const Curadoria = lazy(() => import('./pages/Curadoria'))
const FeedbackPagina = lazy(() => import('./pages/Feedback'))
const Recomendacoes = lazy(() => import('./pages/Recomendacoes'))
const TermoDeConduta = lazy(() => import('./pages/Textos').then((m) => ({ default: m.TermoDeConduta })))
const Privacidade = lazy(() => import('./pages/Textos').then((m) => ({ default: m.Privacidade })))
import NaoEncontrada from './pages/NaoEncontrada'

export function App() {
  const local = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [local.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho />
      {!supabaseConfigurado && (
        <div className="mx-auto mt-4 w-full max-w-3xl px-5">
          <Aviso tipo="erro">
            configuração ausente: crie o arquivo <code>.env.local</code> a partir do <code>.env.example</code> (veja docs/SUPABASE.md).
          </Aviso>
        </div>
      )}
      <main id="conteudo" className="flex-1">
        <Suspense fallback={<Carregando />}>
        <AnimatePresence mode="wait">
          <Routes location={local} key={local.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/cadastro" element={<Protegida precisaPerfil={false}><Cadastro /></Protegida>} />
            <Route path="/minhas-aliadas" element={<Protegida><MinhasAliadas /></Protegida>} />
            <Route path="/conexoes" element={<Protegida><Conexoes /></Protegida>} />
            <Route path="/minha-conta" element={<Protegida precisaPerfil={false}><MinhaConta /></Protegida>} />
            <Route path="/curadoria" element={<Protegida apenasCuradora><Curadoria /></Protegida>} />
            <Route path="/recomendacoes" element={<Recomendacoes />} />
            <Route path="/feedback" element={<FeedbackPagina />} />
            <Route path="/termo-de-conduta" element={<TermoDeConduta />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </AnimatePresence>
        </Suspense>
      </main>
      <Rodape />
    </div>
  )
}
