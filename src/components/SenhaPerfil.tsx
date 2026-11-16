import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { CHAVE_NOVA_SENHA } from "../lib/auth";
import { CampoTexto } from "./Campo";
import { Botao } from "./Botao";
import { Aviso } from "./Aviso";
export function SenhaPerfil() {
  const [recovery, setRecovery] = useState(() =>
    Boolean(sessionStorage.getItem(CHAVE_NOVA_SENHA)),
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8 || password !== confirmation)
      return setMessage(
        "Use pelo menos oito caracteres e confirme a mesma senha.",
      );
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error)
      setMessage(
        "Não foi possível salvar a senha. Peça um novo código e tente novamente.",
      );
    else {
      sessionStorage.removeItem(CHAVE_NOVA_SENHA);
      setRecovery(false);
      setPassword("");
      setConfirmation("");
      setMessage("Senha atualizada.");
    }
  }
  return (
    <>
      <details
        open={recovery || undefined}
        className="my-6 rounded-2xl border border-linha p-5"
      >
        <summary className="cursor-pointer font-semibold">
          {recovery ? "Criar uma senha nova" : "Senha de acesso (opcional)"}
        </summary>
        <form className="mt-5 space-y-4" onSubmit={save}>
          <CampoTexto
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <CampoTexto
            rotulo="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <Botao type="submit" carregando={busy}>
            Salvar senha
          </Botao>
        </form>
      </details>
      {message && <Aviso>{message}</Aviso>}
    </>
  );
}
