import { useState } from "react";
import { Botao } from "./Botao";
import { EscolhaChips, MultiEscolha, Nota1a5 } from "./Campo";
import { useToast } from "./Toast";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";

export const MARCAS: Record<string, string> = {
  escuta: "Escuta",
  dica: "Dica prática",
  contato: "Indicação de contato",
  outro_olhar: "Outro olhar sobre o problema",
};

// Vocês conversaram? → se sim, foi útil? (1 a 5) e o que ela trouxe (várias escolhas)
export function AvaliacaoConversa({ invite, aoTerminar }: { invite: string; aoTerminar: () => void }) {
  const toast = useToast();
  const [resposta, setResposta] = useState<"" | "sim" | "ainda_nao" | "nao_vai_rolar">("");
  const [nota, setNota] = useState<number | null>(null);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function enviar() {
    setBusy(true);
    const { error } = await supabase.rpc("mvp_feedback_v2", {
      invite,
      resposta,
      utility: resposta === "sim" ? nota : null,
      marcas: resposta === "sim" ? marcas : [],
    });
    setBusy(false);
    if (error) return toast(mensagemAmigavel(error), "erro");
    toast(resposta === "ainda_nao" ? "Combinado, perguntamos de novo em alguns dias." : "Obrigada por contar!");
    aoTerminar();
  }
  return (
    <div className="space-y-4">
      <EscolhaChips
        nome={`conversaram-${invite}`}
        rotulo="Vocês conversaram?"
        valor={resposta}
        aoMudar={setResposta}
        opcoes={[
          { valor: "sim", rotulo: "Sim" },
          { valor: "ainda_nao", rotulo: "Ainda não" },
          { valor: "nao_vai_rolar", rotulo: "Não vai rolar" },
        ]}
      />
      {resposta === "sim" && (
        <>
          <Nota1a5 rotulo="Foi útil?" valor={nota} aoMudar={setNota} />
          <MultiEscolha
            rotulo="O que ela trouxe?"
            opcoes={Object.entries(MARCAS).map(([valor, rotulo]) => ({ valor, rotulo }))}
            valores={marcas}
            aoMudar={setMarcas}
          />
        </>
      )}
      <Botao carregando={busy} disabled={!resposta || (resposta === "sim" && !nota)} onClick={enviar}>
        Enviar
      </Botao>
    </div>
  );
}
