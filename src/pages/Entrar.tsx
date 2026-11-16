import { AnimatePresence, motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Aviso, Carregando } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { CampoTexto } from "../components/Campo";
import { Pagina, Titulo } from "../components/Pagina";
import { CHAVE_NOVA_SENHA, useAuth } from "../lib/auth";
import { emailSchema } from "../lib/esquemas";
import { supabase } from "../lib/supabase";

type Modo = "codigo" | "senha" | "recuperar";

export default function Entrar() {
  const { session, perfil, curadora, carregando } = useAuth();
  const [modo, setModo] = useState<Modo>("codigo");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (carregando) return <Carregando />;
  if (session) {
    // veio do "esqueci a senha": vai direto criar a senha nova
    if (sessionStorage.getItem(CHAVE_NOVA_SENHA))
      return <Navigate to="/meu-perfil" replace />;
    return (
      <Navigate
        to={perfil ? "/" : curadora ? "/curadoria" : "/meu-perfil"}
        replace
      />
    );
  }

  function trocarModo(m: Modo) {
    setModo(m);
    setErro("");
    setCodigoEnviado(false);
    setCodigo("");
  }

  function emailValido() {
    const v = emailSchema.safeParse(email);
    if (!v.success) {
      setErro("Confira o e-mail");
      return null;
    }
    return v.data;
  }

  async function enviarCodigo(e?: FormEvent) {
    e?.preventDefault();
    const em = emailValido();
    if (!em) return;
    setErro("");
    setOcupado(true);
    // recuperar: usa o modelo "Reset Password"; entrar: cria a conta no primeiro acesso
    const { error } =
      modo === "recuperar"
        ? await supabase.auth.resetPasswordForEmail(em, {
            redirectTo: `${window.location.origin}/entrar`,
          })
        : await supabase.auth.signInWithOtp({
            email: em,
            options: { emailRedirectTo: `${window.location.origin}/entrar` },
          });
    setOcupado(false);
    if (error) {
      setErro(
        error.status === 429
          ? "Você pediu vários códigos seguidos. Espere um minuto e tente de novo."
          : "Não conseguimos enviar o código agora. Tente de novo em instantes.",
      );
      return;
    }
    setCodigoEnviado(true);
  }

  async function confirmarCodigo(e: FormEvent) {
    e.preventDefault();
    const token = codigo.replace(/\D/g, "");
    if (token.length < 6)
      return setErro("Digite o código que chegou no seu e-mail");
    setErro("");
    setOcupado(true);
    if (modo === "recuperar") sessionStorage.setItem(CHAVE_NOVA_SENHA, "1");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: modo === "recuperar" ? "recovery" : "email",
    });
    setOcupado(false);
    if (error) {
      sessionStorage.removeItem(CHAVE_NOVA_SENHA);
      setErro(
        "Esse código não confere ou já expirou. Confira ou peça um novo.",
      );
    }
  }

  async function entrarComSenha(e: FormEvent) {
    e.preventDefault();
    const em = emailValido();
    if (!em) return;
    if (!senha) return setErro("Digite sua senha");
    setErro("");
    setOcupado(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: em,
      password: senha,
    });
    setOcupado(false);
    if (error) {
      setErro(
        error.status === 429
          ? "Muitas tentativas seguidas. Espere um minuto e tente de novo."
          : "E-mail ou senha não conferem. Se você ainda não criou uma senha, entre com código.",
      );
    }
  }

  const aba = (m: Modo, rotulo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => trocarModo(m)}
      className={`min-h-11 flex-1 rounded-full px-4 font-titulo font-semibold lowercase ${
        modo === m
          ? "bg-destaque text-sobre-destaque"
          : "text-texto hover:text-destaque"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <Pagina titulo="Entrar">
      <Titulo
        sub={
          modo === "recuperar"
            ? "Vamos te mandar um código para criar uma senha nova."
            : "Primeira vez aqui? Entre com código: sua conta é criada na hora."
        }
      >
        {modo === "recuperar" ? "Esqueci a senha" : "Entrar"}
      </Titulo>

      {modo !== "recuperar" && (
        <div
          role="tablist"
          aria-label="Como entrar"
          className="mb-8 flex gap-1 rounded-full border-2 border-campo p-1"
        >
          {aba("codigo", "Com código")}
          {aba("senha", "Com senha")}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={modo + String(codigoEnviado)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {(modo === "codigo" || modo === "recuperar") && !codigoEnviado && (
            <form onSubmit={enviarCodigo} noValidate className="space-y-6">
              <CampoTexto
                rotulo="Seu e-mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                erro={erro}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Botao type="submit" carregando={ocupado}>
                  Receber código
                </Botao>
                {modo === "recuperar" && (
                  <Botao
                    type="button"
                    variante="discreto"
                    onClick={() => trocarModo("senha")}
                  >
                    Voltar
                  </Botao>
                )}
              </div>
            </form>
          )}

          {(modo === "codigo" || modo === "recuperar") && codigoEnviado && (
            <form onSubmit={confirmarCodigo} noValidate className="space-y-6">
              <Aviso tipo="ok">
                Enviamos um código{" "}
                {modo === "recuperar" ? "para criar uma senha nova " : ""}para{" "}
                <strong>{email}</strong>. Se não chegar em alguns minutos, olhe
                o spam.
              </Aviso>
              <CampoTexto
                rotulo="Código"
                ajuda="Pode digitar aqui ou clicar no link do e-mail, se estiver no mesmo aparelho."
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                erro={erro}
                className="w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-center font-titulo text-2xl tracking-[0.4em] text-texto focus:border-destaque focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Botao type="submit" carregando={ocupado}>
                  {modo === "recuperar" ? "Continuar" : "Entrar"}
                </Botao>
                <Botao
                  type="button"
                  variante="discreto"
                  disabled={ocupado}
                  onClick={() => enviarCodigo()}
                >
                  Enviar outro código
                </Botao>
              </div>
            </form>
          )}

          {modo === "senha" && (
            <form onSubmit={entrarComSenha} noValidate className="space-y-6">
              <CampoTexto
                rotulo="Seu e-mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <CampoTexto
                rotulo="Senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                erro={erro}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Botao type="submit" carregando={ocupado}>
                  Entrar
                </Botao>
                <Botao
                  type="button"
                  variante="discreto"
                  onClick={() => trocarModo("recuperar")}
                >
                  Esqueci a senha
                </Botao>
                <Botao
                  type="button"
                  variante="discreto"
                  onClick={() => trocarModo("codigo")}
                >
                  Não tenho senha
                </Botao>
              </div>
              <p className="text-sm text-suave">
                A senha é opcional: você pode criar uma em Meu perfil depois.
                de entrar com código.
              </p>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </Pagina>
  );
}
