import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useConversationJob } from "../lib/useConversationJob";
import { conversationStatus } from "../lib/conversationStatus";
import LandingInstitucional from "./LandingInstitucional";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoArea, CampoSelect, CampoTexto } from "../components/Campo";
import { Avatar } from "../components/Avatar";
import { CartaoCarregando, Chips, Vazio } from "../components/ui";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
  AREAS_PRO,
  GOALS_PRO,
  SITUACAO_PRO,
  type ProCard,
  type ProInvite,
  type ProProfile,
  type ProRequest,
} from "../lib/professional";

const RASCUNHO = "Oi! Vi que você pode ajudar com isso e gostaria de conversar. Topa?";
const OPCOES_OBJETIVO = Object.entries(GOALS_PRO).map(([valor, rotulo]) => ({ valor, rotulo }));

export default function InicioProfissional() {
  const { session, perfil, carregando } = useAuth();
  const toast = useToast();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState("");
  const [outro, setOutro] = useState("");
  const [atual, setAtual] = useState<ProRequest | null>(null);
  const [cards, setCards] = useState<ProCard[]>([]);
  const [convites, setConvites] = useState<ProInvite[]>([]);
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
      supabase
        .from("conversation_invites")
        .select("*")
        .or(`sender_id.eq.${eu},recipient_id.eq.${eu}`)
        .order("created_at", { ascending: false }),
    ]);
    if (v !== rev.current) return;
    if (p.error || r.error || c.error || i.error) {
      setErro("Não foi possível carregar seu início. Tente novamente.");
      return setReady(true);
    }
    const inv = (i.data as ProInvite[]) ?? [];
    const ultima = (r.data as ProRequest[])?.[0];
    setPro(p.data);
    if (p.data && !goal) setGoal(p.data.want_talk?.[0] ?? "carreira");
    setAtual(ultima && !inv.some((x) => x.request_id === ultima.id) ? ultima : null);
    setCards((c.data as ProCard[]) ?? []);
    setConvites(inv);
    setReady(true);
  }
  useEffect(() => {
    setReady(false);
    load();
    return () => {
      rev.current++;
    };
  }, [session?.user.id]);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setBusy("criar");
    const { error } = await supabase.rpc("mvp_create_request", { goal, description: goal === "outro" ? outro : "" });
    setBusy("");
    if (error) return toast(mensagemAmigavel(error), "erro");
    setOutro("");
    await load();
  }

  if (carregando || (!ready && session))
    return (
      <Pagina titulo="Início">
        <CartaoCarregando />
      </Pagina>
    );
  if (!session) return <LandingInstitucional />;
  if (!perfil || !pro)
    return (
      <Pagina titulo="Início">
        <Titulo sub="Leva menos de dois minutos.">Vamos criar seu perfil?</Titulo>
        {erro && <p className="mb-4 text-erro">{erro}</p>}
        <BotaoLink to="/meu-perfil">Começar</BotaoLink>
      </Pagina>
    );
  if (perfil.status !== "aprovado")
    return (
      <Pagina titulo="Início">
        <Titulo sub="Novas conversas ficam disponíveis depois da aprovação. Isso protege a comunidade.">
          Seu perfil está com a curadoria
        </Titulo>
        <BotaoLink to="/meu-perfil" variante="secundario">Revisar meu perfil</BotaoLink>
      </Pagina>
    );

  const eu = session.user.id;
  const esperando = convites.filter((x) => x.state === "pendente" && x.recipient_id === eu);
  const nomeDe = (id: string) => cards.find((c) => c.id === id)?.name ?? "Participante";

  return (
    <Pagina titulo="Início">
      <Titulo sub="Escolha um objetivo e receba uma indicação.">Olá, {perfil.apelido.split(" ")[0]}</Titulo>
      {erro && <p className="mb-6 text-erro" role="alert">{erro}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <form onSubmit={criar} className="space-y-5 rounded-3xl border border-linha p-5 sm:p-6">
            <CampoSelect
              rotulo="Qual é o objetivo da sua próxima conversa?"
              value={goal}
              opcoes={OPCOES_OBJETIVO}
              onChange={(e) => setGoal(e.target.value)}
            />
            {goal === "outro" && (
              <CampoTexto
                rotulo="Qual é o objetivo?"
                ajuda="Não coloque nomes nem contatos."
                maxLength={200}
                required
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
              />
            )}
            <Botao type="submit" carregando={busy === "criar"} disabled={!pro.available || !goal || (goal === "outro" && !outro.trim())}>
              Encontrar minha aliada
            </Botao>
            {!pro.available && (
              <p className="text-sm text-suave">
                Você está como indisponível. <Link to="/meu-perfil#privacidade" className="text-link">Mudar no perfil</Link>
              </p>
            )}
          </form>

          {atual && (
            <section aria-labelledby="indicacao" className="space-y-4">
              <h2 id="indicacao" className="text-xl">Sua indicação</h2>
              <Indicacao
                key={atual.id}
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

        <aside>
          <section aria-labelledby="esperando" className="rounded-3xl bg-superficie p-5">
            <h2 id="esperando" className="flex items-center gap-2 text-lg">
              Convites esperando sua resposta
              {esperando.length > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-coral px-2 text-sm text-vinho-noite">
                  {esperando.length}
                </span>
              )}
            </h2>
            {esperando.length ? (
              <ul className="mt-3 space-y-2">
                {esperando.slice(0, 3).map((x) => (
                  <li key={x.id} className="flex items-center gap-3">
                    <Avatar apelido={nomeDe(x.sender_id)} tamanho={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{nomeDe(x.sender_id)}</span>
                      {x.goal && <span className="block truncate text-xs text-suave">{GOALS_PRO[x.goal as keyof typeof GOALS_PRO]}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-suave">Nenhum convite novo.</p>
            )}
            {esperando.length > 0 && (
              <div className="mt-4">
                <BotaoLink to="/minhas-conversas" variante="secundario">Responder</BotaoLink>
              </div>
            )}
          </section>
        </aside>
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
  const [msg, setMsg] = useState(r.draft ?? RASCUNHO);
  const editado = useRef(false);
  useEffect(() => {
    if (!editado.current) setMsg(r.draft ?? RASCUNHO);
  }, [r.draft, r.candidate_id]);
  const objetivo = r.goal === "outro" && r.description ? r.description : (GOALS_PRO[r.goal as keyof typeof GOALS_PRO] ?? r.goal);

  async function convidar() {
    setBusy(`convite-${r.id}`);
    const { error } = await supabase.rpc("mvp_invite", { request: r.id, message: msg });
    setBusy("");
    if (error) return toast(mensagemAmigavel(error), "erro");
    toast("Convite enviado. Você acompanha em Conversas.");
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

  if (!card)
    return (
      <article className="rounded-3xl border border-linha p-5 sm:p-6">
        <p className="text-xs font-semibold text-suave">{objetivo}</p>
        <Vazio titulo="Ninguém compatível agora.">
          A comunidade está crescendo. Tente de novo em alguns dias ou escolha outro objetivo.
        </Vazio>
      </article>
    );
  return (
    <article className="space-y-5 rounded-3xl border-2 border-destaque p-5 sm:p-6" aria-live="polite">
      <p className="text-xs font-semibold text-suave">{objetivo}</p>
      <header className="flex items-center gap-4">
        <Avatar apelido={card.name} tamanho={56} />
        <div className="min-w-0">
          <h3 className="text-lg">{card.name}</h3>
          <p className="text-sm text-suave">
            {[SITUACAO_PRO[card.situacao as keyof typeof SITUACAO_PRO], AREAS_PRO[card.area_principal as keyof typeof AREAS_PRO]].filter(Boolean).join(" · ") || card.occupation}
          </p>
        </div>
      </header>
      <Chips rotulo="Áreas" itens={card.areas.map((a) => AREAS_PRO[a as keyof typeof AREAS_PRO] ?? a)} />
      {r.mode === "generativa" && (
        <span className="inline-flex rounded-full border border-campo px-3 py-1 text-xs font-semibold text-suave">
          Sugerido pela IA
        </span>
      )}
      <p>{r.explanation}</p>
      {r.questions.length > 0 && (
        <div className="rounded-2xl bg-superficie p-4">
          <h4 className="mb-2 text-sm font-semibold">Duas perguntas para começar</h4>
          <ol className="list-decimal space-y-1 pl-5">
            {r.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}
      {status && <p className="text-xs text-suave" role="status">{status}</p>}
      <CampoArea
        rotulo="Sua mensagem"
        ajuda={
          r.mode === "generativa"
            ? "Revise antes de enviar. Você decide se manda."
            : "Revise antes de enviar. Contatos só aparecem depois do aceite."
        }
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
          Ver outra sugestão
        </Botao>
      </div>
    </article>
  );
}
