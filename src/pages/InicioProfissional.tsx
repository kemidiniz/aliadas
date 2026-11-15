import { useEffect, useState, type FormEvent } from "react";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoArea } from "../components/Campo";
import { Aviso, Carregando } from "../components/Aviso";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
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
  async function load() {
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
    setRequest(rec ?? null);
    setCard(
      ((c.data as ProCard[]) ?? []).find((x) => x.id === rec?.candidate_id) ??
        null,
    );
    setDraft(
      rec?.draft ??
        "oi! gostaria de conversar com você sobre um objetivo profissional. podemos combinar?",
    );
    setReady(true);
  }
  useEffect(() => {
    load();
  }, [session]); // sessão identifica a jornada; recarregar é uma ação explícita
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
      <Pagina titulo="início">
        <Carregando />
      </Pagina>
    );
  if (!session)
    return (
      <Pagina titulo="aliadas">
        <section className="py-4">
          <p className="mb-4 font-semibold text-coral">
            conexões profissionais com propósito
          </p>
          <h1 className="max-w-4xl font-titulo text-4xl font-bold leading-tight text-destaque sm:text-6xl">
            uma conversa pode abrir novos caminhos.
          </h1>
          <p className="mt-6 text-xl">
            conecte-se com mulheres para trocar experiências, preparar uma
            entrevista ou receber uma opinião sobre seu projeto. de qualquer
            área, na universidade ou na vida profissional.
          </p>
          <div className="my-8 grid gap-5 sm:grid-cols-2">
            {Object.entries(INTENTIONS_PRO).map(([k, v]) => (
              <div key={k} className="rounded-3xl border border-linha p-6">
                <h2 className="font-titulo text-2xl font-bold">{v}</h2>
                <p className="mt-3">
                  {k === "buscar"
                    ? "quero conversar sobre um assunto, desafio ou objetivo profissional."
                    : "estou disponível para dividir experiências e conhecimentos."}
                </p>
              </div>
            ))}
          </div>
          <BotaoLink to="/entrar">criar meu perfil</BotaoLink>
          <p className="mt-4 text-sm text-suave">
            confirme seu e-mail, crie um perfil e escolha seu objetivo. a
            conexão só acontece com a aprovação das duas.
          </p>
          <p className="mt-8">
            incluímos mulheres cis e trans e pessoas não binárias. não é
            mentoria formal nem atendimento terapêutico.
          </p>
        </section>
      </Pagina>
    );
  if (!perfil || !pro)
    return (
      <Pagina titulo="início">
        <Titulo>vamos completar seu perfil profissional?</Titulo>
        <p className="mb-6">
          o cadastro agora está em uma página. suas informações anteriores
          continuam preservadas.
        </p>
        {msg && <Aviso tipo="erro">{msg}</Aviso>}
        <BotaoLink to="/meu-perfil">completar meu perfil</BotaoLink>
      </Pagina>
    );
  if (perfil.status !== "aprovado")
    return (
      <Pagina titulo="início">
        <Titulo>seu perfil está com a curadoria</Titulo>
        <Aviso>
          para proteger a comunidade, novas conversas ficam disponíveis após a
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
          como você quer participar agora?
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
          objetivo principal da conversa
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
        rotulo="um pouco de contexto (opcional)"
        ajuda="não inclua nomes, contatos, dados sensíveis ou informações confidenciais. esta descrição não vai para a IA."
        maxLength={400}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Botao
        type="submit"
        carregando={busy}
        disabled={!pro.available || !pro.intentions.includes(intention)}
      >
        encontrar uma aliada
      </Botao>
      <p className="text-sm text-suave">
        até três solicitações em 24 horas. você escolhe se quer enviar o
        convite.
      </p>
    </form>
  );
  return (
    <Pagina titulo="início">
      <Titulo sub="escolha um objetivo. a gente aproxima experiências para uma conversa profissional.">
        encontre uma aliada
      </Titulo>
      {msg && (
        <div className="mb-5">
          <Aviso>{msg}</Aviso>
        </div>
      )}
      {request ? (
        <details className="mb-6 rounded-xl border border-linha p-4">
          <summary className="cursor-pointer font-semibold">
            mudar o objetivo ou buscar outra aliada
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
            sua sugestão de conversa
          </h2>
          {!card ? (
            <p className="mt-4">
              nenhuma aliada elegível disponível agora. a comunidade cresce com
              novas participantes; tente outro objetivo mais tarde.
            </p>
          ) : (
            <>
              <p className="mt-4 text-xl font-semibold">{card.name}</p>
              <p>{card.occupation}</p>
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
                  rotulo="sua mensagem inicial"
                  ajuda="revise e edite antes de convidar. não inclua contatos nem links: eles só serão liberados após o aceite mútuo."
                  maxLength={600}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Botao
                  carregando={busy}
                  disabled={!draft.trim()}
                  onClick={invite}
                >
                  aprovar e enviar convite
                </Botao>
              </div>
            </>
          )}
          <div className="mt-4">
            <Botao variante="discreto" onClick={load}>
              atualizar resultado
            </Botao>
          </div>
        </section>
      )}
    </Pagina>
  );
}
