import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Botao } from "./Botao";
import { CampoArea, Caixinha } from "./Campo";
import { EscolhaHabilidades } from "./EscolhaHabilidades";
import { MaisHistorico, useHistorico } from "./Historico";
import { nomeHabilidade } from "../lib/habilidades";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import type { ProProfile, ProRequest } from "../lib/professional";

type Objetivo = { id: string; description: string; suggested_skills: string[]; selected_skills: string[]; state: string; mode: string; attempts: number; confirmed_at: string | null; ai_authorized: boolean; created_at: string };
type Etapa = 0 | 1 | 2;
type Props = {
  pro: ProProfile;
  pedido: ProRequest | null;
  aoEncontrar: (pedidoId?: string) => Promise<void>;
  aoAbrirBusca: (objetivoId: string) => Promise<boolean>;
  aoLimparBusca: () => void;
  children: ReactNode;
};
const CAMPOS = "id,description,suggested_skills,selected_skills,state,mode,attempts,confirmed_at,ai_authorized,created_at";
const mesclarHistorico = (anteriores: Objetivo[], novos: Objetivo[]) => [...new Map([...anteriores, ...novos].map(o => [o.id, o])).values()].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,30);
export function ObjetivoConversa({ pro, pedido, aoEncontrar, aoAbrirBusca, aoLimparBusca, children }: Props) {
  const [texto, setTexto] = useState("");
  const [consentimento, setConsentimento] = useState(pro.ai_consent && pro.ai_consent_version === "habilidades-v1");
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<Etapa>(pedido ? 2 : 0);
  const [historico, setHistorico] = useState<Objetivo[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [erroHistorico, setErroHistorico] = useState(false);
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const [demorou, setDemorou] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const { limite, mais, recolher } = useHistorico(pro.profile_id);
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();

  function recuperar(o: Objetivo) {
    setObjetivo(o); setTexto(o.description);
    setEscolhidas(o.selected_skills.length ? o.selected_skills : o.suggested_skills);
    setErro(""); setDemorou(false);
  }
  async function carregarHistorico() {
    setCarregandoHistorico(true); setErroHistorico(false);
    // RLS limita à dona. A consulta também funciona após atingir a cota de criação.
    const { data, error } = await supabase.from("conversation_objectives").select(CAMPOS).eq("owner_id", pro.profile_id).order("created_at", { ascending: false }).limit(30);
    setCarregandoHistorico(false);
    if (error) { setErroHistorico(true); return []; }
    const itens = (data ?? []) as Objetivo[]; setHistorico(anteriores => mesclarHistorico(anteriores, itens)); return itens;
  }
  useEffect(() => {
    let ativo = true;
    const id = params.get("objetivo");
    carregarHistorico().then(async itens => {
      if (!ativo) return;
      let o = itens.find(x => x.id === (id || pedido?.objective_id));
      if (id && !o) {
        const { data } = await supabase.from("conversation_objectives").select(CAMPOS).eq("owner_id", pro.profile_id).eq("id", id).maybeSingle();
        if (!ativo) return;
        o = data ?? undefined;
      }
      if (!o && !pedido && !id) o = itens.find(x => !x.confirmed_at && new Date(x.created_at).getTime() > Date.now() - 86400_000);
      if (!o) { if (id) setErro("Não conseguimos recuperar seu objetivo. Escolha uma busca anterior ou escreva novamente."); return; }
      recuperar(o);
      if (!pedido || id) setEtapa(1);
      if (id) setParams({}, { replace: true });
      if (id && o.selected_skills.length) await encontrar(o.id, o.selected_skills);
    });
    return () => { ativo = false; };
  }, []);
  useEffect(() => {
    if (objetivo) setHistorico(itens => mesclarHistorico(itens, [objetivo]));
  }, [objetivo]);
  // Busca finita: nunca fica consultando o banco indefinidamente; pausa em abas ocultas.
  useEffect(() => {
    if (!objetivo || objetivo.state === "pronta") return;
    let ativo = true, tentativa = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    const controller = new AbortController();
    async function consultar() {
      timer = undefined;
      if (!ativo || document.visibilityState === "hidden") return;
      const { data, error } = await supabase.from("conversation_objectives").select(CAMPOS).eq("id", objetivo!.id).abortSignal(controller.signal).maybeSingle();
      if (!ativo) return;
      if (data?.state === "pronta") { setObjetivo(data); setEscolhidas(data.selected_skills.length ? data.selected_skills : data.suggested_skills); return; }
      tentativa++;
      if (error || tentativa >= 6 || Date.now() - inicio >= 15000) { setDemorou(true); return; }
      timer = setTimeout(consultar, 3000);
    }
    const visivel = () => { if (ativo && document.visibilityState === "visible" && !timer && tentativa < 6) timer = setTimeout(consultar, 0); };
    document.addEventListener("visibilitychange", visivel); timer = setTimeout(consultar, 0);
    return () => { ativo = false; clearTimeout(timer); controller.abort(); document.removeEventListener("visibilitychange", visivel); };
  }, [objetivo?.id, revisao]);
  async function analisar(e: FormEvent) {
    e.preventDefault(); setErro("");
    // Voltar ao mesmo objetivo não cria outro registro nem chama a IA.
    if (objetivo && texto.trim() === objetivo.description) { setEtapa(1); return; }
    setBusy("analisar"); setDemorou(false);
    const { data, error } = await supabase.rpc("mvp_start_objective", { description: texto.trim(), use_ai: consentimento, consent_version: consentimento ? "habilidades-v1" : null });
    if (error) { setBusy(""); await carregarHistorico(); return setErro(mensagemAmigavel(error)); }
    const { data: obj, error: leitura } = await supabase.from("conversation_objectives").select(CAMPOS).eq("id", data).single();
    setBusy("");
    if (leitura || !obj) { await carregarHistorico(); return setErro("Objetivo salvo. Reabra a busca no histórico para continuar."); }
    aoLimparBusca(); setObjetivo(obj); setEscolhidas(obj.suggested_skills); setEtapa(1); setRevisao(x => x + 1);
  }
  async function abrir(o: Objetivo) {
    setBusy("historico"); setErro("");
    try {
      const temPedido = await aoAbrirBusca(o.id); recuperar(o); setEtapa(temPedido ? 2 : 1);
      requestAnimationFrame(() => {
        const card = document.getElementById("busca-aliada");
        card?.scrollIntoView({ block: "start" });
        card?.querySelector<HTMLButtonElement>('li[aria-current="step"] button')?.focus({ preventScroll: true });
      });
    }
    catch { setErro("Não conseguimos abrir essa busca agora. Tente novamente."); }
    finally { setBusy(""); }
  }
  async function outras() {
    if (!objetivo) return;
    setBusy("outras"); setErro("");
    const { error } = await supabase.rpc("mvp_retry_objective", { objective: objetivo.id });
    setBusy("");
    if (error) return setErro(mensagemAmigavel(error));
    setObjetivo({ ...objetivo, state: "pendente", attempts: objetivo.attempts + 1, suggested_skills: [] }); setEscolhidas([]); setDemorou(false); setRevisao(x => x + 1);
  }
  async function manual() {
    if (!objetivo) return;
    setBusy("manual"); setErro("");
    const { error } = await supabase.rpc("mvp_manual_objective", { objective: objetivo.id });
    setBusy("");
    if (error) return setErro(mensagemAmigavel(error));
    setObjetivo({ ...objetivo, state: "pronta", mode: "regra", suggested_skills: [] }); setEscolhidas([]); setDemorou(false);
  }
  async function encontrar(id = objetivo?.id, skills = escolhidas) {
    if (!id) return;
    if (pedido?.objective_id === id) { setEtapa(2); return; }
    setBusy("encontrar"); setErro("");
    const { data, error } = await supabase.rpc("mvp_find_for_objective", { objective: id, skills });
    if (error) { setBusy(""); return setErro(mensagemAmigavel(error)); }
    if (data.complete_profile) { setBusy(""); return navegar(`/completar-perfil?objetivo=${encodeURIComponent(id)}`); }
    try {
      await aoEncontrar(data.request_id); setEtapa(2);
      setObjetivo(o => o ? { ...o, selected_skills: skills, confirmed_at: new Date().toISOString() } : o);
    } catch { setErro("Sua busca foi salva. Reabra pelo histórico para ver a indicação."); }
    finally { setBusy(""); }
  }
  const pronta = objetivo?.state === "pronta";
  const limiteAtingido = historico.filter(o => new Date(o.created_at).getTime() > Date.now() - 86400_000).length >= 3;
  const mesmoObjetivo = Boolean(objetivo && texto.trim() === objetivo.description);
  const habilidadesConfirmadas = Boolean(pedido && (!objetivo || pedido.objective_id === objetivo.id));
  return <section id="busca-aliada" aria-label="Encontre sua aliada" className="scroll-mt-28 space-y-6 rounded-3xl border border-linha p-5 sm:p-6">
    <ol className="grid grid-cols-3 gap-1 rounded-2xl bg-superficie p-1" aria-label="Etapas da busca">
      {["Objetivo", "Habilidades", "Aliada"].map((nome, i) => <li key={nome} aria-current={etapa === i ? "step" : undefined} className="min-w-0">
        <button type="button" aria-label={`Etapa ${i+1}: ${nome}`} aria-controls="busca-etapa" disabled={Boolean(busy) || (i === 1 && !objetivo && !pedido) || (i === 2 && !pedido)} onClick={() => { setEtapa(i as Etapa); setErro(""); }} className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2.5 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm disabled:cursor-not-allowed disabled:opacity-45 ${etapa === i ? "bg-destaque text-sobre-destaque" : "text-suave hover:bg-fundo"}`}>
          <span aria-hidden className="text-xs font-semibold leading-4 tabular-nums">{i+1}</span><span className="text-xs font-semibold leading-5">{nome}</span>
        </button>
      </li>)}
    </ol>
    {limiteAtingido && <p className="text-sm text-suave" role="status">Você já definiu três objetivos nas últimas 24 horas. Suas buscas anteriores continuam disponíveis, sem gastar uma nova tentativa. <a href="#historico-buscas" className="text-link">Ver últimas buscas</a></p>}
    <div id="busca-etapa">
      {etapa === 0 && <form onSubmit={analisar} className="space-y-5">
        <CampoArea rotulo="Qual é o objetivo da sua próxima conversa?" ajuda="Conte o que você quer alcançar em uma ou duas frases. Sem nomes, contatos ou informações confidenciais." placeholder="Ex.: Quero me preparar para minha primeira entrevista de emprego." minLength={8} maxLength={300} rows={4} required value={texto} onChange={e => setTexto(e.target.value)} />
        <Caixinha marcado={consentimento} aoMudar={setConsentimento}>Autorizo a IA a sugerir habilidades para este objetivo, usando apenas expressões profissionais, minha situação e área. Nunca nome, contatos ou foto.</Caixinha>
        <p className="text-xs text-suave">O texto é minimizado no servidor antes do envio. No plano gratuito, o Google pode usar os dados enviados para melhorar produtos. <Link to="/termos-e-privacidade#ia" className="text-link">Entenda o uso da IA</Link>.</p>
        <Botao type="submit" carregando={busy === "analisar"} disabled={texto.trim().length < 8 || (limiteAtingido && !mesmoObjetivo)}>{mesmoObjetivo ? "Rever habilidades" : consentimento ? "Descobrir habilidades com IA" : "Escolher habilidades sem IA"}</Botao>
      </form>}
      {etapa === 1 && <div className="space-y-5">
        <div><h2 className="text-lg">Seu objetivo</h2><p className="mt-2 whitespace-pre-wrap break-words">{objetivo?.description || pedido?.description}</p></div>
        {habilidadesConfirmadas ? <>
          <p className="text-sm text-suave">Você confirmou estas habilidades para esta busca.</p>
          <ul className="flex flex-wrap gap-2" aria-label="Habilidades confirmadas">{pedido!.habilidades_necessarias.map(h => <li key={h} className="rounded-full border border-linha px-3 py-1 text-sm">{nomeHabilidade(h)}</li>)}</ul>
          <Botao onClick={() => setEtapa(2)}>Ver indicação</Botao>
        </> : <>
          {!pronta && !demorou && <p role="status">A IA está identificando as habilidades que podem ajudar…</p>}
          {demorou && <p role="status" className="text-sm text-suave">A IA está demorando. Você pode escolher as habilidades e continuar.</p>}
          {pronta && objetivo.mode === "ia" && objetivo.suggested_skills.length > 0 ? <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">A IA sugere estas habilidades. Quais fazem sentido para você?</legend>{objetivo.suggested_skills.map(h => <Caixinha key={h} marcado={escolhidas.includes(h)} aoMudar={sim => setEscolhidas(sim ? [...escolhidas, h] : escolhidas.filter(s => s !== h))}>{nomeHabilidade(h)}</Caixinha>)}</fieldset> : pronta && <><p className="text-sm text-suave">{objetivo.ai_authorized ? "A IA não trouxe uma indicação de habilidades. Escolha diretamente no menu para continuar." : "Você pode escolher as habilidades sem usar IA."}</p><EscolhaHabilidades valores={escolhidas} aoMudar={setEscolhidas} max={3} rotulo="Quais habilidades ajudariam no seu objetivo?" ajuda="Escolha até três. Vamos procurar quem oferece essas habilidades." /></>}
          <div className="flex flex-wrap gap-3">
            {pronta && <Botao carregando={busy === "encontrar"} disabled={!escolhidas.length || Boolean(busy)} onClick={() => encontrar()}>Encontrar minha aliada</Botao>}
            {pronta && objetivo.mode === "ia" && objetivo.attempts < 3 && !objetivo.confirmed_at && <Botao variante="secundario" carregando={busy === "outras"} disabled={Boolean(busy)} onClick={outras}>Sugerir outras habilidades</Botao>}
            {(demorou || (pronta && objetivo?.mode === "ia")) && <Botao variante="discreto" carregando={busy === "manual"} disabled={Boolean(busy)} onClick={manual}>Escolher por conta própria</Botao>}
            <Botao variante="discreto" disabled={Boolean(busy)} onClick={() => setEtapa(0)}>Editar objetivo</Botao>
          </div>
          {pronta && <p className="text-xs text-suave">Só buscamos uma pessoa depois da sua confirmação. O convite também depende da sua revisão.</p>}
        </>}
      </div>}
      <div hidden={etapa !== 2}>{children}</div>
    </div>
    {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
    <section aria-labelledby="historico-buscas" className="border-t border-linha pt-5">
      <h2 id="historico-buscas" className="scroll-mt-28 text-base">Suas últimas buscas</h2>
      {carregandoHistorico ? <p role="status" className="mt-3 text-sm text-suave">Carregando suas buscas…</p> : erroHistorico ? <div className="mt-3 text-sm"><p>Não conseguimos carregar suas buscas.</p><Botao variante="discreto" onClick={carregarHistorico}>Tentar novamente</Botao></div> : historico.length ? <>
        <ul className="mt-3 divide-y divide-linha">{historico.slice(0,limite).map(o => <li key={o.id}>
          <button type="button" disabled={Boolean(busy)} onClick={() => abrir(o)} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left disabled:opacity-50">
            <span className="min-w-0"><span className="line-clamp-2 break-words text-sm font-semibold">{o.description}</span><span className="mt-1 block text-xs text-suave">{(o.selected_skills.length ? o.selected_skills : o.suggested_skills).map(nomeHabilidade).join(" · ") || "Retomar escolha de habilidades"}{o.created_at && ` · ${new Date(o.created_at).toLocaleDateString("pt-BR")}`}</span></span>
            <span className="shrink-0 text-sm font-semibold text-destaque">Reabrir</span>
          </button>
        </li>)}</ul>
        <MaisHistorico total={historico.length} limite={limite} mais={mais} recolher={recolher} />
      </> : <p className="mt-3 text-sm text-suave">Seus objetivos e habilidades aparecerão aqui para você retomar depois.</p>}
    </section>
  </section>;
}
