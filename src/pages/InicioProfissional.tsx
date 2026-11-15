import { useEffect, useState, useRef, type FormEvent } from "react";
import { useConversationJob } from "../lib/useConversationJob";
import { conversationStatus } from "../lib/conversationStatus";
import LandingInstitucional from "./LandingInstitucional";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoArea } from "../components/Campo";
import { Aviso, Carregando } from "../components/Aviso";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
  AREAS_PRO,
  GOALS_PRO,
  INTENTIONS_PRO,
  type ProProfile,
  type ProRequest,
  type ProCard,
} from "../lib/professional";
export default function InicioProfissional() {
  const { session, perfil, carregando } = useAuth();
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [intention, setIntention] = useState("buscar");
  const [goal, setGoal] = useState("carreira");
  const [description, setDescription] = useState("");
  const [request, setRequest] = useState<ProRequest | null>(null);
  const [card, setCard] = useState<ProCard | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const draftEdited = useRef(false);
  const lastRequest = useRef<string | undefined>(undefined);
  const {
    job,
    stalled,
    refresh: refreshJob,
  } = useConversationJob(request?.id, load);
  const loadRevision = useRef(0);
  async function load() {
    const version = ++loadRevision.current;
    if (!session) {
      setReady(true);
      return;
    }
    const [p, r, c] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("*")
        .eq("profile_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("conversation_requests")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.rpc("mvp_cards"),
    ]);
    if (version !== loadRevision.current) return;
    if (p.error || r.error || c.error) {
      setMsg(
        "não foi possível carregar sua jornada. tente novamente ou procure a curadoria.",
      );
      setReady(true);
      return;
    }
    setPro(p.data);
    if (p.data && !p.data.intentions.includes(intention))
      setIntention(p.data.intentions[0]);
    const rec = r.data?.[0] as ProRequest | undefined;
    if (rec?.id !== lastRequest.current) {
      draftEdited.current = false;
      lastRequest.current = rec?.id;
    }
    setRequest(rec ?? null);
    setCard(
      ((c.data as ProCard[]) ?? []).find((x) => x.id === rec?.candidate_id) ??
        null,
    );
    if (!draftEdited.current)
      setDraft(
        rec?.draft ??
          "oi! gostaria de conversar com você sobre um objetivo profissional. podemos combinar?",
      );
    setReady(true);
  }
  useEffect(() => {
    setReady(false);
    setPro(null);
    setRequest(null);
    setCard(null);
    draftEdited.current = false;
    lastRequest.current = undefined;
    load();
    return () => {
      loadRevision.current++;
    };
  }, [session?.user.id]); // sessão identifica a jornada; recarregar é uma ação explícita
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("mvp_create_request", {
      intention,
      goal,
      description,
    });
    if (error) setMsg(mensagemAmigavel(error));
    else await load();
    setBusy(false);
  }
  async function invite() {
    if (!request) return;
    setBusy(true);
    const { error } = await supabase.rpc("mvp_invite", {
      request: request.id,
      message: draft,
    });
    setMsg(
      error
        ? mensagemAmigavel(error)
        : "convite enviado. acompanhe o aceite em minhas conversas.",
    );
    setBusy(false);
  }
  if (carregando || (!ready && session))
    return (
      <Pagina titulo="Início">
        <Carregando />
      </Pagina>
    );
  if (!session) return <LandingInstitucional />;
  if (!perfil || !pro)
    return (
      <Pagina titulo="Início">
        <Titulo>vamos completar seu perfil profissional?</Titulo>
        <p className="mb-6">
          O cadastro agora está em uma página. suas informações anteriores
          continuam preservadas.
        </p>
        {msg && <Aviso tipo="erro">{msg}</Aviso>}
        <BotaoLink to="/meu-perfil">completar meu perfil</BotaoLink>
      </Pagina>
    );
  if (perfil.status !== "aprovado")
    return (
      <Pagina titulo="Início">
        <Titulo>seu perfil está com a curadoria</Titulo>
        <Aviso>
          Para proteger a comunidade, novas conversas ficam disponíveis após a
          aprovação. se seu perfil está pausado, fale com a curadoria pelo
          feedback.
        </Aviso>
        <div className="mt-5">
          <BotaoLink to="/meu-perfil">revisar meu perfil</BotaoLink>
        </div>
      </Pagina>
    );
  const requestForm = (
    <form
      onSubmit={create}
      className="space-y-5 rounded-3xl border border-linha p-6"
    >
      <fieldset>
        <legend className="mb-3 font-semibold">
          Como você quer participar agora?
        </legend>
        <div className="flex flex-wrap gap-5">
          {Object.entries(INTENTIONS_PRO)
            .filter(([k]) => pro.intentions.includes(k))
            .map(([k, v]) => (
              <label key={k} className="flex gap-2">
                <input
                  required
                  type="radio"
                  name="intention"
                  value={k}
                  checked={intention === k}
                  onChange={() => setIntention(k)}
                />
                {v}
              </label>
            ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block font-semibold">
          Objetivo principal da conversa
        </span>
        <select
          className="w-full rounded-xl border-2 border-campo bg-fundo p-3"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        >
          {Object.entries(GOALS_PRO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <CampoArea
        rotulo="Um pouco de contexto (opcional)"
        ajuda="Não inclua nomes, contatos, dados sensíveis ou informações confidenciais. esta descrição não vai para a IA."
        maxLength={400}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Botao
        type="submit"
        carregando={busy}
        disabled={!pro.available || !pro.intentions.includes(intention)}
      >
        Encontrar uma aliada
      </Botao>
      <p className="text-sm text-suave">
        Até três solicitações em 24 horas. você escolhe se quer enviar o
        convite.
      </p>
    </form>
  );
  return (
    <Pagina titulo="Início">
      <Titulo sub="Escolha um objetivo. a gente aproxima experiências para uma conversa profissional.">
        Encontre uma aliada
      </Titulo>
      {busy && <Aviso>{conversationStatus(null, true)}</Aviso>}
      {msg && (
        <div className="mb-5">
          <Aviso>{msg}</Aviso>
        </div>
      )}
      {request ? (
        <details className="mb-6 rounded-xl border border-linha p-4">
          <summary className="cursor-pointer font-semibold">
            Mudar o objetivo ou buscar outra aliada
          </summary>
          <div className="mt-4">{requestForm}</div>
        </details>
      ) : (
        requestForm
      )}
      {request && (
        <section
          className="mt-8 rounded-3xl bg-superficie p-6"
          aria-live="polite"
        >
          <h2 className="font-titulo text-2xl font-bold">
            Sua indicação de aliada
          </h2>
          <p role="status" className="mt-3 text-sm font-medium text-destaque">
            {conversationStatus(
              job
                ? { ...job, has_candidate: Boolean(card) }
                : {
                    state:
                      request.mode === "generativa" ? "concluida" : "sem_ia",
                    mode: request.mode,
                    has_candidate: Boolean(card),
                  },
              false,
              stalled,
            )}
          </p>
          {!card ? (
            <p className="mt-4">
              Nenhuma aliada elegível disponível agora. a comunidade cresce com
              novas participantes; tente outro objetivo mais tarde.
            </p>
          ) : (
            <>
              <p className="mt-4 text-xl font-semibold">{card.name}</p>
              <p>{card.occupation}</p>
              <p className="mt-2 text-sm text-suave">
                {card.areas
                  .map((x) => AREAS_PRO[x as keyof typeof AREAS_PRO] ?? x)
                  .join(", ")}
              </p>
              <p className="mt-4 text-sm font-semibold">
                {request.mode === "generativa"
                  ? "apoio de IA generativa • revise antes de convidar"
                  : "compatibilidade básica • sem IA generativa"}
              </p>
              <p className="mt-2">{request.explanation}</p>
              {request.questions.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold">duas perguntas para começar</h3>
                  <ul className="list-disc pl-5">
                    {request.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5">
                <CampoArea
                  rotulo="Sua mensagem inicial"
                  ajuda="Revise e edite antes de convidar. não inclua contatos nem links: eles só serão liberados após o aceite mútuo."
                  maxLength={600}
                  value={draft}
                  onChange={(e) => {
                    draftEdited.current = true;
                    setDraft(e.target.value);
                  }}
                />
                <Botao
                  carregando={busy}
                  disabled={!draft.trim()}
                  onClick={invite}
                >
                  Aprovar e enviar convite
                </Botao>
              </div>
            </>
          )}
          <div className="mt-4">
            <Botao
              variante="discreto"
              onClick={() => {
                load();
                refreshJob();
              }}
            >
              Atualizar resultado
            </Botao>
          </div>
        </section>
      )}
    </Pagina>
  );
}
