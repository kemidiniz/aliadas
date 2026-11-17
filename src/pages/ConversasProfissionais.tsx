import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoArea, EscolhaChips, Nota1a5, rotuloCampo } from "../components/Campo";
import { Avatar } from "../components/Avatar";
import { Abas, Badge, CartaoCarregando, Vazio, type EstadoConversa } from "../components/ui";
import {
  IconeEmail,
  IconeLinkedin,
  IconeMais,
  IconeWhatsapp,
} from "../components/Icones";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
  AREAS_PRO,
  GOALS_PRO,
  type ProCard,
  type ProContacts,
  type ProInvite,
} from "../lib/professional";

type Feedback = { invite_id: string; happened: boolean; utility: number | null; outcome: string };
type Aba = "recebidos" | "enviados" | "concluidas";

export default function ConversasProfissionais() {
  const { session } = useAuth();
  const eu = session!.user.id;
  const [invites, setInvites] = useState<ProInvite[] | null>(null);
  const [cards, setCards] = useState<ProCard[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<Aba>("recebidos");
  const escolhida = useRef(false);

  async function load() {
    const [i, c, f] = await Promise.all([
      supabase
        .from("conversation_invites")
        .select("*")
        .or(`sender_id.eq.${eu},recipient_id.eq.${eu}`)
        .order("created_at", { ascending: false }),
      supabase.rpc("mvp_cards"),
      supabase.from("conversation_feedback").select("*").eq("author_id", eu),
    ]);
    if (i.error || c.error) {
      setErro("Não foi possível carregar as conversas. Tente novamente.");
      setInvites([]);
      return;
    }
    const lista = i.data as ProInvite[];
    const fb = (f.data as Feedback[]) ?? [];
    setInvites(lista);
    setCards(c.data);
    setFeedback(fb);
    // abre na aba com algo esperando resposta
    if (!escolhida.current) {
      escolhida.current = true;
      const temRecebido = lista.some((x) => grupo(x, eu, fb) === "recebidos");
      const temEnviado = lista.some((x) => grupo(x, eu, fb) === "enviados");
      setAba(temRecebido ? "recebidos" : temEnviado ? "enviados" : "recebidos");
    }
  }
  useEffect(() => {
    load();
  }, [eu]);

  const contagem = (a: Aba) => (invites ?? []).filter((x) => grupo(x, eu, feedback) === a).length;
  const pendentesParaMim = (invites ?? []).filter((x) => x.state === "pendente" && x.recipient_id === eu).length;
  const visiveis = (invites ?? []).filter((x) => grupo(x, eu, feedback) === aba);

  return (
    <Pagina titulo="Minhas conversas">
      <Titulo sub="Convites, horários e avaliações em um só lugar.">Minhas conversas</Titulo>
      {erro && <p className="mb-6 text-erro" role="alert">{erro}</p>}
      {!invites ? (
        <CartaoCarregando />
      ) : !invites.length ? (
        <Vazio titulo="Nenhuma conversa por aqui ainda.">
          <p className="mb-5">Escolha um objetivo e receba uma indicação.</p>
          <BotaoLink to="/">Encontrar minha aliada</BotaoLink>
        </Vazio>
      ) : (
        <>
          <Abas
            rotulo="Conversas"
            atual={aba}
            aoMudar={setAba}
            abas={[
              { id: "recebidos", rotulo: "Recebidos", contagem: pendentesParaMim },
              { id: "enviados", rotulo: "Enviados", contagem: undefined },
              { id: "concluidas", rotulo: "Concluídas", contagem: undefined },
            ]}
          />
          {!visiveis.length ? (
            <Vazio titulo={aba === "concluidas" ? "Nenhuma conversa concluída ainda." : "Nada nesta aba agora."} />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              {visiveis.map((i) => {
                const outra = i.sender_id === eu ? i.recipient_id : i.sender_id;
                return (
                  <Conversa
                    key={i.id}
                    invite={i}
                    eu={eu}
                    card={cards.find((c) => c.id === outra)}
                    feedback={feedback.find((f) => f.invite_id === i.id)}
                    reload={load}
                  />
                );
              })}
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {contagem(aba)} conversas nesta aba
          </p>
        </>
      )}
    </Pagina>
  );
}

function grupo(i: ProInvite, eu: string, fb: Feedback[]): Aba {
  if (i.state === "recusada" || i.state === "expirado" || fb.some((f) => f.invite_id === i.id)) return "concluidas";
  return i.recipient_id === eu ? "recebidos" : "enviados";
}

const PASSOS = ["Convite", "Aceite", "Contatos liberados", "Avaliação"];
function Linha({ atual, parada }: { atual: number; parada?: boolean }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Etapas da conversa">
      {PASSOS.map((p, n) => {
        const feito = n < atual;
        const agora = n === atual && !parada;
        return (
          <li key={p} className="flex flex-1 flex-col items-center gap-1 text-center" aria-current={agora ? "step" : undefined}>
            <span
              className={`h-1.5 w-full rounded-full ${feito ? "bg-destaque" : agora ? "bg-coral" : "bg-linha"}`}
            />
            <span className={`text-xs ${agora ? "font-semibold text-texto" : "text-suave"}`}>
              {p}
              <span className="sr-only">{feito ? " (feito)" : agora ? " (etapa atual)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Conversa({
  invite: i,
  eu,
  card,
  feedback,
  reload,
}: {
  invite: ProInvite;
  eu: string;
  card?: ProCard;
  feedback?: Feedback;
  reload: () => Promise<void>;
}) {
  const toast = useToast();
  const [contatos, setContatos] = useState<(ProContacts & { slots?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [avaliar, setAvaliar] = useState(false);
  const [painel, setPainel] = useState<"" | "bloquear" | "denunciar">("");
  const souRemetente = i.sender_id === eu;
  const outra = souRemetente ? i.recipient_id : i.sender_id;
  const nome = card?.name ?? "Participante";

  useEffect(() => {
    if (i.state !== "aceita") return;
    supabase.rpc("mvp_shared_contacts", { invite: i.id }).then(({ data, error }) => {
      if (!error) setContatos(data);
    });
  }, [i.id, i.state]);

  async function rpc(name: string, args: Record<string, unknown>, ok: string) {
    setBusy(true);
    const { error } = await supabase.rpc(name, args);
    setBusy(false);
    if (error) toast(mensagemAmigavel(error), "erro");
    else {
      toast(ok);
      await reload();
    }
    return !error;
  }

  // Convite → Aceite → Contatos liberados → Avaliação
  const atual =
    i.state === "pendente" || i.state === "recusada" || i.state === "expirado" ? 1 : feedback ? 4 : 3;
  const estado: EstadoConversa =
    i.state === "pendente"
      ? "pendente"
      : i.state === "recusada"
        ? "recusada"
        : i.state === "expirado"
          ? "expirado"
          : feedback?.happened
            ? "realizada"
            : "aceita";

  return (
    <article className="space-y-5 rounded-3xl border border-linha p-5 sm:p-6">
      <header className="flex items-start gap-4">
        <Avatar apelido={nome} tamanho={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg">{nome}</h2>
            <Badge estado={estado} />
          </div>
          {card?.occupation && <p className="text-sm text-suave">{card.occupation}</p>}
          {card && (
            <p className="text-xs text-suave">
              {card.areas.map((a) => AREAS_PRO[a as keyof typeof AREAS_PRO] ?? a).join(" · ")}
            </p>
          )}
        </div>
        <MenuMais aoEscolher={setPainel} />
      </header>
      <Linha atual={atual} parada={i.state === "recusada" || i.state === "expirado"} />
      {i.goal && (
        <p className="text-sm">
          <span className="font-semibold">Quer conversar sobre:</span>{" "}
          {GOALS_PRO[i.goal as keyof typeof GOALS_PRO] ?? i.goal}
          {i.goal === "outro" && i.goal_text && <span className="block text-suave">{i.goal_text}</span>}
        </p>
      )}
      <blockquote className="rounded-xl bg-superficie px-4 py-3 text-sm break-words">
        <span className="mb-1 block text-xs font-semibold text-suave">
          {souRemetente ? "Sua mensagem" : "Mensagem dela"}
        </span>
        {i.message}
      </blockquote>

      {/* Etapa atual: só a ação dela fica aberta */}
      {i.state === "pendente" &&
        (souRemetente ? (
          <p className="text-sm text-suave">Aguardando o aceite. Contatos só aparecem depois dele.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Botao carregando={busy} onClick={() => rpc("mvp_respond", { invite: i.id, accept: true }, "Convite aceito. Agora combinem um horário.")}>
              Aceitar convite
            </Botao>
            <Botao variante="secundario" disabled={busy} onClick={() => rpc("mvp_respond", { invite: i.id, accept: false }, "Convite recusado.")}>
              Agora não
            </Botao>
          </div>
        ))}
      {i.state === "recusada" && <p className="text-sm text-suave">Este convite foi recusado.</p>}
      {i.state === "expirado" &&
        (souRemetente ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-suave">Expirou sem resposta.</p>
            <BotaoLink to="/" variante="secundario">Pedir outra indicação</BotaoLink>
          </div>
        ) : (
          <p className="text-sm text-suave">Este convite expirou sem resposta.</p>
        ))}

      {i.state === "aceita" && (
        <>
          <Contatos c={contatos} />
          <p className="text-sm text-suave">Combinem a conversa por onde preferirem.</p>
          {avaliar && !feedback ? (
            <Avaliacao invite={i.id} busy={busy} rpc={rpc} />
          ) : (
            !feedback && (
              <button type="button" className="text-sm font-semibold text-destaque underline underline-offset-4" onClick={() => setAvaliar(true)}>
                Já conversaram? Avaliar a conversa
              </button>
            )
          )}
          {feedback && (
            <p className="text-sm text-suave">
              {feedback.happened ? `Sua avaliação: ${feedback.utility} de 5. Obrigada!` : "Você registrou que a conversa não aconteceu."}
            </p>
          )}
        </>
      )}

      {painel === "bloquear" && (
        <div className="space-y-3 rounded-2xl border border-erro p-4">
          <p className="text-sm">O bloqueio encerra convites e esconde os contatos. Não dá para desfazer por aqui.</p>
          <div className="flex gap-3">
            <Botao
              variante="perigo"
              carregando={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await supabase.from("conversation_blocks").insert({ owner_id: eu, blocked_id: outra });
                setBusy(false);
                if (error) toast(mensagemAmigavel(error), "erro");
                else {
                  toast("Participante bloqueada.");
                  await reload();
                }
              }}
            >
              Confirmar bloqueio
            </Botao>
            <Botao variante="discreto" onClick={() => setPainel("")}>Cancelar</Botao>
          </div>
        </div>
      )}
      {painel === "denunciar" && <Denuncia alvo={outra} busy={busy} rpc={rpc} fechar={() => setPainel("")} />}
    </article>
  );
}

function MenuMais({ aoEscolher }: { aoEscolher: (v: "bloquear" | "denunciar") => void }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const itens = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!aberto) return;
    itens.current[0]?.focus();
    const fora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  function teclas(e: KeyboardEvent) {
    const idx = itens.current.findIndex((b) => b === document.activeElement);
    if (e.key === "Escape") setAberto(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      itens.current[(idx + (e.key === "ArrowDown" ? 1 : -1) + 2) % 2]?.focus();
    }
  }
  return (
    <div ref={caixaRef} className="relative" onKeyDown={teclas}>
      <button
        type="button"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-suave hover:bg-superficie"
      >
        <IconeMais />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-linha bg-fundo shadow-lg">
          {(["bloquear", "denunciar"] as const).map((v, n) => (
            <button
              key={v}
              ref={(el) => {
                itens.current[n] = el;
              }}
              role="menuitem"
              type="button"
              className="block w-full px-4 py-3 text-left text-sm hover:bg-superficie focus:bg-superficie"
              onClick={() => {
                setAberto(false);
                aoEscolher(v);
              }}
            >
              {v === "bloquear" ? "Bloquear" : "Denunciar"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Contatos({ c }: { c: ProContacts | null }) {
  if (!c) return null;
  const itens = [
    c.linkedin && { href: c.linkedin, rotulo: "LinkedIn", Icone: IconeLinkedin, ext: true },
    c.whatsapp && { href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`, rotulo: "WhatsApp", Icone: IconeWhatsapp, ext: true },
    c.email && { href: `mailto:${c.email}`, rotulo: "E-mail", Icone: IconeEmail, ext: false },
  ].filter(Boolean) as { href: string; rotulo: string; Icone: typeof IconeEmail; ext: boolean }[];
  return (
    <div>
      <p className={rotuloCampo}>Contatos liberados</p>
      {c.nome_completo && <p className="mt-1 text-sm">Nome completo: {c.nome_completo}</p>}
      {itens.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {itens.map(({ href, rotulo, Icone, ext }) => (
            <a
              key={rotulo}
              href={href}
              {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-campo px-4 text-sm font-semibold hover:border-destaque"
            >
              <Icone /> {rotulo}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-suave">Ela ainda não liberou um contato.</p>
      )}
    </div>
  );
}

function Avaliacao({
  invite,
  busy,
  rpc,
}: {
  invite: string;
  busy: boolean;
  rpc: (n: string, a: Record<string, unknown>, ok: string) => Promise<boolean>;
}) {
  const [aconteceu, setAconteceu] = useState<"" | "sim" | "nao">("");
  const [nota, setNota] = useState<number | null>(null);
  const [resultado, setResultado] = useState<string>("");
  return (
    <section className="space-y-4 rounded-2xl bg-superficie p-4" aria-label="Avaliar a conversa">
      <EscolhaChips
        nome={`aconteceu-${invite}`}
        rotulo="A conversa aconteceu?"
        valor={aconteceu}
        aoMudar={setAconteceu}
        opcoes={[
          { valor: "sim", rotulo: "Sim" },
          { valor: "nao", rotulo: "Não" },
        ]}
      />
      {aconteceu === "sim" && (
        <>
          <Nota1a5 rotulo="Quanto ajudou no seu objetivo?" valor={nota} aoMudar={setNota} />
          <EscolhaChips
            nome={`resultado-${invite}`}
            rotulo="O que você levou da conversa?"
            valor={resultado}
            aoMudar={setResultado}
            opcoes={[
              { valor: "clareza", rotulo: "Mais clareza" },
              { valor: "preparo", rotulo: "Preparo" },
              { valor: "feedback", rotulo: "Feedback" },
              { valor: "contato", rotulo: "Novo contato" },
              { valor: "outro", rotulo: "Outro" },
            ]}
          />
        </>
      )}
      <Botao
        carregando={busy}
        disabled={!aconteceu || (aconteceu === "sim" && (!nota || !resultado))}
        onClick={() =>
          rpc(
            "mvp_feedback",
            {
              invite,
              happened: aconteceu === "sim",
              utility: aconteceu === "sim" ? nota : null,
              outcome: aconteceu === "sim" ? resultado : "nao_aconteceu",
            },
            "Avaliação salva. Obrigada!",
          )
        }
      >
        Salvar avaliação
      </Botao>
    </section>
  );
}

function Denuncia({
  alvo,
  busy,
  rpc,
  fechar,
}: {
  alvo: string;
  busy: boolean;
  rpc: (n: string, a: Record<string, unknown>, ok: string) => Promise<boolean>;
  fechar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="space-y-3 rounded-2xl border border-linha p-4">
      <CampoArea
        rotulo="O que aconteceu?"
        ajuda="Só a curadoria lê."
        minLength={5}
        maxLength={800}
        rows={3}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <div className="flex gap-3">
        <Botao
          variante="secundario"
          disabled={busy || motivo.trim().length < 5}
          onClick={async () => {
            if (await rpc("mvp_report", { target: alvo, reason: motivo }, "Denúncia enviada à curadoria.")) fechar();
          }}
        >
          Enviar denúncia
        </Botao>
        <Botao variante="discreto" onClick={fechar}>Cancelar</Botao>
      </div>
    </div>
  );
}
