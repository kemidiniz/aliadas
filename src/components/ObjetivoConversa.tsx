import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Botao } from "./Botao";
import { CampoArea, Caixinha } from "./Campo";
import { EscolhaHabilidades } from "./EscolhaHabilidades";
import { nomeHabilidade } from "../lib/habilidades";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import type { ProProfile } from "../lib/professional";

type Objetivo = { id: string; description: string; suggested_skills: string[]; selected_skills: string[]; state: string; mode: string; attempts: number; confirmed_at: string | null; ai_authorized: boolean };
export function ObjetivoConversa({ pro, aoEncontrar }: { pro: ProProfile; aoEncontrar: () => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [consentimento, setConsentimento] = useState(pro.ai_consent && pro.ai_consent_version === "habilidades-v1");
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const [demorou, setDemorou] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const voltou = useRef(false);
  useEffect(() => {
    const id = params.get("objetivo");
    if (voltou.current) return;
    voltou.current = true;
    const consulta = id ? supabase.from("conversation_objectives").select("*").eq("id", id) : supabase.from("conversation_objectives").select("*").eq("owner_id",pro.profile_id).is("confirmed_at",null).gt("created_at",new Date(Date.now()-86400_000).toISOString()).order("created_at",{ascending:false}).limit(1);
    consulta.maybeSingle().then(async ({ data, error }) => {
      if (error || !data) { if (id) setErro("Não conseguimos recuperar seu objetivo. Escreva novamente."); return; }
      setObjetivo(data); setTexto(data.description); setEscolhidas(data.selected_skills.length ? data.selected_skills : data.suggested_skills);
      if (id) setParams({}, { replace: true });
      if (id && data.selected_skills.length) await encontrar(data.id, data.selected_skills);
    });
  }, []);
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
      const { data, error } = await supabase.from("conversation_objectives").select("*").eq("id", objetivo!.id).abortSignal(controller.signal).maybeSingle();
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
    e.preventDefault(); setBusy("analisar"); setErro(""); setDemorou(false);
    const { data, error } = await supabase.rpc("mvp_start_objective", { description: texto.trim(), use_ai: consentimento, consent_version: consentimento ? "habilidades-v1" : null });
    if (error) { setBusy(""); return setErro(mensagemAmigavel(error)); }
    const { data: obj, error: leitura } = await supabase.from("conversation_objectives").select("*").eq("id", data).single();
    setBusy("");
    if (leitura) return setErro("Objetivo salvo. Não conseguimos carregar a análise agora. Tente novamente.");
    setObjetivo(obj); setEscolhidas(obj.suggested_skills); setRevisao(x => x + 1);
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
    setBusy("encontrar"); setErro("");
    const { data, error } = await supabase.rpc("mvp_find_for_objective", { objective: id, skills });
    setBusy("");
    if (error) return setErro(mensagemAmigavel(error));
    if (data.complete_profile) return navegar(`/completar-perfil?objetivo=${encodeURIComponent(id)}`);
    setObjetivo(null); setTexto(""); setEscolhidas([]); await aoEncontrar();
    requestAnimationFrame(() => document.getElementById("indicacao")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const pronta = objetivo?.state === "pronta";
  return <section aria-label="Encontre sua aliada" className="space-y-5 rounded-3xl border border-linha p-5 sm:p-6">
    <ol className="grid grid-cols-3 gap-2 border-b border-linha pb-5" aria-label="Etapas da busca">
      {[["Objetivo","Seu objetivo"],["Habilidades","Revise as habilidades"],["Aliada","Encontre sua aliada"]].map(([curto,completo],i)=>{
        const ativa = i === (objetivo ? 1 : 0);
        return <li key={curto} aria-current={ativa ? "step" : undefined} className="flex min-w-0 flex-col items-center gap-2 text-center">
          <span aria-hidden className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${ativa ? "border-destaque bg-destaque text-sobre-destaque" : "border-campo text-suave"}`}>{i+1}</span>
          <span className={`text-xs leading-5 ${ativa ? "font-semibold text-destaque" : "text-suave"}`}><span className="sm:hidden">{curto}</span><span className="hidden sm:inline">{completo}</span></span>
        </li>;
      })}
    </ol>
    {!objetivo ? <form onSubmit={analisar} className="space-y-5">
      <CampoArea rotulo="Qual é o objetivo da sua próxima conversa?" ajuda="Conte o que você quer alcançar em uma ou duas frases. Sem nomes, contatos ou informações confidenciais." placeholder="Ex.: Quero me preparar para minha primeira entrevista de emprego." minLength={8} maxLength={300} rows={4} required value={texto} onChange={e => setTexto(e.target.value)} />
      <Caixinha marcado={consentimento} aoMudar={setConsentimento}>Autorizo a IA a sugerir habilidades para este objetivo, usando apenas expressões profissionais, minha situação e área. Nunca nome, contatos ou foto.</Caixinha>
      <p className="text-xs text-suave">O texto é minimizado no servidor antes do envio. No plano gratuito, o Google pode usar os dados enviados para melhorar produtos. <Link to="/termos-e-privacidade#ia" className="text-link">Entenda o uso da IA</Link>.</p>
      <Botao type="submit" carregando={busy === "analisar"} disabled={texto.trim().length < 8}>{consentimento ? "Descobrir habilidades com IA" : "Escolher habilidades sem IA"}</Botao>
    </form> : <div className="space-y-5">
      <div><h2 className="text-lg">Seu objetivo</h2><p className="mt-2 whitespace-pre-wrap break-words">{objetivo.description}</p></div>
      {!pronta && !demorou && <p role="status">A IA está identificando as habilidades que podem ajudar…</p>}
      {demorou && <p role="status" className="text-sm text-suave">A IA está demorando. Você pode escolher as habilidades e continuar.</p>}
      {pronta && objetivo.mode === "ia" && objetivo.suggested_skills.length > 0 ? <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">A IA sugere estas habilidades. Quais fazem sentido para você?</legend>{objetivo.suggested_skills.map(h => <Caixinha key={h} marcado={escolhidas.includes(h)} aoMudar={sim => setEscolhidas(sim ? [...escolhidas, h] : escolhidas.filter(s => s !== h))}>{nomeHabilidade(h)}</Caixinha>)}</fieldset> : pronta && <><p className="text-sm text-suave">{objetivo.ai_authorized ? "A IA não trouxe uma indicação de habilidades. Escolha diretamente no menu para continuar." : "Você pode escolher as habilidades sem usar IA."}</p><EscolhaHabilidades valores={escolhidas} aoMudar={setEscolhidas} max={3} rotulo="Quais habilidades ajudariam no seu objetivo?" ajuda="Escolha até três. Vamos procurar quem oferece essas habilidades." /></>}
      <div className="flex flex-wrap gap-3">
        {pronta && <Botao carregando={busy === "encontrar"} disabled={!escolhidas.length || Boolean(busy)} onClick={() => encontrar()}>Encontrar minha aliada</Botao>}
        {pronta && objetivo.mode === "ia" && objetivo.attempts < 3 && !objetivo.confirmed_at && <Botao variante="secundario" carregando={busy === "outras"} disabled={Boolean(busy)} onClick={outras}>Sugerir outras habilidades</Botao>}
        {(demorou || (pronta && objetivo.mode === "ia")) && <Botao variante="discreto" carregando={busy === "manual"} disabled={Boolean(busy)} onClick={manual}>Escolher por conta própria</Botao>}
        <Botao variante="discreto" disabled={Boolean(busy)} onClick={() => { setObjetivo(null); setEscolhidas([]); setDemorou(false); }}>Editar objetivo</Botao>
      </div>
      {pronta && <p className="text-xs text-suave">Só buscamos uma pessoa depois da sua confirmação. O convite também depende da sua revisão.</p>}
    </div>}
    {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
  </section>;
}
