import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";
import { Botao } from "./Botao";
import { Chips } from "./ui";
import { useToast } from "./Toast";
import { GOALS_PRO, type ProInvite } from "../lib/professional";
import { nomeHabilidade } from "../lib/habilidades";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
export function ConviteRecebido({ convite, nome, depois }: { convite: ProInvite; nome: string; depois: () => Promise<void> }) {
 const [busy,setBusy]=useState(false),[contexto,setContexto]=useState<{description:string|null;habilidades:string[]}|null>(null),[erro,setErro]=useState("");
 const toast=useToast();
 async function contextoDoConvite() {
  const {data,error}=await supabase.rpc("mvp_invite_context",{invite:convite.id});
  if(error)setErro("Não foi possível carregar os detalhes. Tente abrir novamente.");
  else {setContexto(data);setErro("");}
 }
 async function responder(accept:boolean) {
  setBusy(true);const {error}=await supabase.rpc("mvp_respond",{invite:convite.id,accept});setBusy(false);
  if(error)return toast(mensagemAmigavel(error),"erro");
  toast(accept?"Convite aceito. Os contatos já aparecem no cartão.":"Convite recusado.");
  await depois();
 }
 return <article className="space-y-4 rounded-xl border border-linha bg-fundo p-4">
  <header className="flex items-center gap-3"><Avatar apelido={nome} tamanho={36}/><h3 className="text-base">{nome}</h3></header>
  <details onToggle={e=>{if(e.currentTarget.open && !contexto)void contextoDoConvite();}}>
   <summary className="cursor-pointer text-sm font-semibold text-destaque">Ver mensagem</summary>
   <div className="mt-3 space-y-3 text-sm">
    {convite.goal && <p>Objetivo: {GOALS_PRO[convite.goal as keyof typeof GOALS_PRO]}</p>}
    {erro && <p role="alert">{erro}</p>}
    {contexto?.habilidades?.length ? <Chips rotulo="Habilidades que ajudam" itens={contexto.habilidades.map(nomeHabilidade)}/> : null}
    {contexto?.description && <p>{contexto.description}</p>}
    <p className="whitespace-pre-wrap">{convite.message}</p>
   </div>
  </details>
  <div className="flex flex-wrap gap-2"><Botao carregando={busy} onClick={()=>responder(true)}>Aceitar convite</Botao><Botao variante="secundario" disabled={busy} onClick={()=>responder(false)}>Agora não</Botao></div>
  <p className="text-xs text-suave">Depois do aceite, os contatos autorizados aparecem em <Link to="/minhas-aliancas" className="text-link">Alianças</Link>.</p>
 </article>;
}
