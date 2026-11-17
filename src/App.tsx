import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Cabecalho } from "./components/Cabecalho";
import { Rodape } from "./components/Rodape";
import { NavInferior } from "./components/NavInferior";
import { ToastProvider } from "./components/Toast";
import { useAuth } from "./lib/auth";
import { Protegida } from "./components/Protegida";
import { Aviso, Carregando } from "./components/Aviso";
import { supabaseConfigurado } from "./lib/supabase";
import Home from "./pages/InicioProfissional";
import Entrar from "./pages/Entrar";
const Cadastro = lazy(() => import("./pages/PerfilProfissional"));
const Conversas = lazy(() => import("./pages/ConversasProfissionais"));
const Curadoria = lazy(() => import("./pages/Curadoria"));
const FeedbackPagina = lazy(() => import("./pages/Feedback"));
import Sobre from "./pages/LandingInstitucional";
const TermosEPrivacidade = lazy(() => import("./pages/Textos").then(m => ({ default:m.TermosEPrivacidade })));
function RedirecionarLegal({ parte }: { parte: string }) {
 const local=useLocation();
 return <Navigate to={`/termos-e-privacidade${local.search}${local.hash || `#${parte}`}`} replace />;
}
import NaoEncontrada from "./pages/NaoEncontrada";

export function App() {
  const local = useLocation();
  const { session } = useAuth();
  useEffect(() => {
    if (local.hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(local.hash.slice(1))
          ?.scrollIntoView(),
      );
    } else window.scrollTo(0, 0);
  }, [local.pathname, local.hash]);

  return (
    <ToastProvider>
    <div className={`flex min-h-dvh flex-col ${session ? "pb-16 sm:pb-0" : ""}`}>
      <Cabecalho />
      {!supabaseConfigurado && (
        <div className="mx-auto mt-4 w-full max-w-[1200px] px-5 sm:px-8">
          <Aviso tipo="erro">
            A conexão com o serviço está indisponível. Tente novamente em
            instantes.
          </Aviso>
        </div>
      )}
      <main id="conteudo" className="flex-1">
        <Suspense fallback={<Carregando />}>
          <AnimatePresence mode="wait">
            <Routes location={local} key={local.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route
                path="/cadastro"
                element={
                  <Protegida precisaPerfil={false}>
                    <Cadastro />
                  </Protegida>
                }
              />
              <Route
                path="/minhas-aliadas"
                element={<Navigate to="/" replace />}
              />
              <Route path="/minhas-conversas" element={<Navigate to="/minhas-aliancas" replace />} />
              <Route path="/meu-pitch" element={<Navigate to="/" replace />} />
              <Route path="/forum" element={<Navigate to="/" replace />} />
              <Route
                path="/conexoes"
                element={<Navigate to="/minhas-aliancas" replace />}
              />
              <Route
                path="/minhas-aliancas"
                element={
                  <Protegida>
                    <Conversas />
                  </Protegida>
                }
              />
              <Route
                path="/minha-conta"
                element={<Navigate to="/meu-perfil" replace />}
              />
              <Route
                path="/completar-perfil"
                element={
                  <Protegida precisaPerfil={false}>
                    <Cadastro completar />
                  </Protegida>
                }
              />
              <Route
                path="/meu-perfil"
                element={
                  <Protegida precisaPerfil={false}>
                    <Cadastro />
                  </Protegida>
                }
              />
              <Route
                path="/painel"
                element={
                  <Protegida apenasCuradora>
                    <Curadoria />
                  </Protegida>
                }
              />
              <Route path="/curadoria" element={<Navigate to="/painel" replace />} />
              <Route
                path="/recomendacoes"
                element={<Navigate to="/" replace />}
              />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/quem-somos" element={<Navigate to="/sobre" replace />} />
              <Route path="/ajuda" element={<FeedbackPagina />} />
              <Route path="/feedback" element={<Navigate to="/ajuda" replace />} />
              <Route path="/termos-e-privacidade" element={<TermosEPrivacidade />} />
              <Route path="/termo-de-conduta" element={<RedirecionarLegal parte="termos" />} />
              <Route path="/privacidade" element={<RedirecionarLegal parte="privacidade" />} />
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      <Rodape />
      <NavInferior />
    </div>
    </ToastProvider>
  );
}
