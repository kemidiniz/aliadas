import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Avisos rápidos no canto da tela (substituem o aviso no topo da página).
type Tipo = "ok" | "erro";
type Item = { id: number; texto: string; tipo: Tipo };
const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const n = useRef(0);
  const reduzir = useReducedMotion();
  const mostrar = useCallback((texto: string, tipo: Tipo = "ok") => {
    const id = ++n.current;
    setItens((x) => [...x.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setItens((x) => x.filter((i) => i.id !== id)), 5000);
  }, []);
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
      >
        <AnimatePresence>
          {itens.map((i) => (
            <motion.div
              key={i.id}
              role={i.tipo === "erro" ? "alert" : "status"}
              initial={reduzir ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzir ? { opacity: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto w-full max-w-sm rounded-xl border-l-4 bg-texto px-4 py-3 text-sm font-medium text-fundo shadow-lg ${
                i.tipo === "erro" ? "border-erro" : "border-coral"
              }`}
            >
              {i.texto}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
