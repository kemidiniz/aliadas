import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConversationJob } from "../lib/useConversationJob";
import { conversationStatus } from "../lib/conversationStatus";
import LandingInstitucional from "./LandingInstitucional";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoArea } from "../components/Campo";
import { Avatar } from "../components/Avatar";
import { CartaoCarregando, Chips, Vazio } from "../components/ui";
import { useToast } from "../components/Toast";
import { MARCAS } from "../components/AvaliacaoConversa";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
  AREAS_PRO,
  GOALS_PRO,
  SITUACAO_PRO,
  type ProCard,
  type ProProfile,
  type ProRequest,
} from "../lib/professional";

import { ObjetivoConversa } from "../components/ObjetivoConversa";
import { nomeHabilidade } from "../lib/habilidades";
const modeloConvite = (r: ProRequest) => `Oi! Vi na aliadas que você pode ajudar com ${r.habilidades_que_ajudam?.length ? nomeHabilidade(r.habilidades_que_ajudam[0]) : "este objetivo profissional"}. Estou buscando apoio para ${r.description?.trim() || GOALS_PRO[r.goal as keyof typeof GOALS_PRO] || "um objetivo profissional"}. Topa uma conversa?`;


export default function InicioProfissional() {
  const { session, perfil, carregando } = useAuth();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [atual, setAtual] = useState<ProRequest | null>(null);
  const [cards, setCards] = useState<ProCard[]>([]);
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const { job, stalled, refresh } = useConversationJob(atual?.id, load);
  const rev = useRef(0);

  async function load() {
    const v = ++rev.current;
    if (!session) return setReady(true);
    const eu = session.user.id;
    const [p, r, c, i] = await Promise.all([
      supabase.from("professional_profiles").select("*").eq("profile_id", eu).maybeSingle(),
      // só a busca mais recente dos últimos 7 dias; o histórico fica em Meu perfil
      supabase
        .from("conversation_requests")
        .select("*")
        .eq("owner_id", eu)
        .gt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.rpc("mvp_cards"),
      supabase.from("conversation_invites").select("request_id").eq("sender_id", eu),
    ]);
    if (v !== rev.current) return;
    if (p.error || r.error || c.error || i.error) {
      setErro("Não foi possível carregar a busca. Tente novamente.");
      return setReady(true);
    }
    const inv = (i.data as { request_id: string }[]) ?? [];
    const ultima = (r.data as ProRequest[])?.[0];
    setPro(p.data);
    setAtual(ultima && !inv.some((x) => x.request_id === ultima.id) ? ultima : null);
    setCards((c.data as ProCard[]) ?? []);
    setReady(true);
  }
  useEffect(() => {
    setReady(false);
    load();
    return () => {
      rev.current++;
    };
  }, [session?.user.id]);

  if (carregando || (!ready && session))
    return (
      <Pagina titulo="Encontrar uma aliada">
        <CartaoCarregando />
      </Pagina>
    );
  if (!session) return <LandingInstitucional />;
  if (!perfil || !pro)
    return (
      <Pagina titulo="Encontrar uma aliada">
        <Titulo sub="Leva menos de dois minutos.">Vamos criar seu perfil?</Titulo>
        {erro && <p className="mb-4 text-erro">{erro}</p>}
        <BotaoLink to="/meu-perfil">Começar</BotaoLink>
      </Pagina>
    );
  if (!["pendente", "aprovado"].includes(perfil.status))
    return (
      <Pagina titulo="Encontrar uma aliada">
        <Titulo sub="Sua conta está pausada ou restrita. Entre em contato para receber ajuda.">
          Sua conta está indisponível para novas buscas
        </Titulo>
        <BotaoLink to="/meu-perfil" variante="secundario">Revisar meu perfil</BotaoLink>
      </Pagina>
    );

  return (
    <Pagina titulo="Encontrar uma aliada">
      <Titulo sub="Conte seu objetivo, revise as habilidades e encontre uma aliada.">Encontre sua aliada</Titulo>
      {pro.available && !pro.habilidades?.length && <p className="mb-6 rounded-xl bg-superficie p-4 text-sm">Escolha suas habilidades para poder ser indicada. <Link to="/meu-perfil#ajudar" className="text-link">Escolher habilidades</Link></p>}
      {erro && <p className="mb-6 text-erro" role="alert">{erro}</p>}
      <div className="space-y-6">
          <ObjetivoConversa pro={pro} aoEncontrar={load} />

          {atual && (
            <section aria-labelledby="indicacao" className="space-y-4">
              <h2 id="indicacao" className="text-xl">Sua indicação</h2>
              <Indicacao
                key={`${atual.id}:${atual.candidate_id}`}
                r={atual}
                card={cards.find((c) => c.id === atual.candidate_id)}
                status={conversationStatus(job ? { ...job, has_candidate: Boolean(atual.candidate_id) } : null, false, stalled)}
                busy={busy}
                setBusy={setBusy}
                depois={async (outraSugestao) => {
                  if (outraSugestao) refresh();
                  await load();
                }}
              />
            </section>
          )}

      </div>
    </Pagina>
  );
}

function Indicacao({
  r,
  card,
  status,
  busy,
  setBusy,
  depois,
}: {
  r: ProRequest;
  card?: ProCard;
  status: string | null;
  busy: string;
  setBusy: (v: string) => void;
  depois: (acompanhar?: string) => Promise<void>;
}) {
  const toast = useToast();
  const [msg, setMsg] = useState(modeloConvite(r));
  const editado = useRef(false);
  useEffect(() => {
    if (!editado.current) setMsg(modeloConvite(r));
  }, [r.candidate_id, r.habilidades_que_ajudam?.join(",")]);
  const objetivo = r.goal === "outro" && r.description ? r.description : (GOALS_PRO[r.goal as keyof typeof GOALS_PRO] ?? r.goal);

  async function convidar() {
    setBusy(`convite-${r.id}`);
    const { error } = await supabase.rpc("mvp_invite_reviewed", { request: r.id, candidate:r.candidate_id, message: msg });
    setBusy("");
    if (error) { toast(mensagemAmigavel(error), "erro"); await depois(); return; }
    toast("Convite enviado. Você acompanha em Alianças.");
    await depois();
  }
  async function outra() {
    setBusy(`outra-${r.id}`);
    editado.current = false;
    const { error } = await supabase.rpc("mvp_next_suggestion", { request: r.id });
    setBusy("");
    if (error) return toast(mensagemAmigavel(error), "erro");
    await depois(r.id);
  }

  if (status === "A IA está procurando quem pode ajudar…") return <article className="rounded-3xl border border-linha p-6" role="status"><p>{status}</p><p className="mt-2 text-sm text-suave">A indicação aparecerá aqui. Você revisa antes de enviar o convite.</p></article>;
  if (!card)
    return (
      <article className="rounded-3xl border border-linha p-5 sm:p-6">
        <p className="text-xs font-semibold text-suave">{objetivo}</p>
        <Vazio titulo="Ninguém compatível agora.">
          Ninguém compatível agora. Tente outro objetivo ou volte em alguns dias.
        </Vazio>
      </article>
    );
  return (
    <article className="space-y-5 rounded-3xl border-2 border-destaque p-5 sm:p-6" aria-live="polite">
      <p className="text-xs font-semibold text-suave">{objetivo}</p>
      <header className="flex items-center gap-4">
        <Avatar apelido={card.name} fotoPath={card.foto_path} tamanho={56} />
        <div className="min-w-0">
          <h3 className="text-lg">{card.name}</h3>
          <p className="text-sm text-suave">
            {[SITUACAO_PRO[card.situacao as keyof typeof SITUACAO_PRO], AREAS_PRO[card.area_principal as keyof typeof AREAS_PRO]].filter(Boolean).join(" · ") || card.occupation}
          </p>
        </div>
      </header>
      {(card.conversas ?? 0) > 0 && (
        <p className="text-sm text-suave">
          {card.conversas} {card.conversas === 1 ? "conversa realizada" : "conversas realizadas"}
          {card.marcas?.length ? ` · ${card.marcas.map((m) => MARCAS[m] ?? m).join(" · ")}` : ""}
        </p>
      )}
      {r.mode === "ia" && (
        <span className="inline-flex rounded-full border border-campo px-3 py-1 text-xs font-semibold text-suave">
          Recomendada pela IA
        </span>
      )}
      <div className="space-y-2"><h4 className="text-sm font-semibold">Por que ela:</h4><Chips rotulo="Habilidades que ajudam" itens={(r.habilidades_que_ajudam ?? []).map(nomeHabilidade)} /></div>
      {!r.habilidades_que_ajudam?.length && <p className="text-sm text-suave">Ela informou que pode conversar sobre esse objetivo. As habilidades do perfil ainda serão atualizadas.</p>}
      {r.habilidades_necessarias?.length > 1 && <p className="text-xs text-suave">Ela oferece {r.habilidades_que_ajudam?.length ?? 0} de {r.habilidades_necessarias.length} habilidades que você escolheu.</p>}
      <p className="text-xs text-suave">Você precisa de: {(r.habilidades_necessarias ?? []).map(nomeHabilidade).join(" · ")}</p>
      {status && <p className="text-xs text-suave" role="status">{status}</p>}
      <CampoArea
        rotulo="Sua mensagem"
        ajuda="Revise antes de enviar. Contatos só aparecem depois do aceite."
        maxLength={600}
        rows={3}
        value={msg}
        onChange={(e) => {
          editado.current = true;
          setMsg(e.target.value);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Botao carregando={busy === `convite-${r.id}`} disabled={!msg.trim() || Boolean(busy)} onClick={convidar}>
          Enviar convite
        </Botao>
        <Botao variante="secundario" carregando={busy === `outra-${r.id}`} disabled={Boolean(busy)} onClick={outra}>
          Ver outra indicação
        </Botao>
      </div>
    </article>
  );
}
