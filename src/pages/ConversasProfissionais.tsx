import { useEffect, useState } from "react";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao, BotaoLink } from "../components/Botao";
import { CampoTexto } from "../components/Campo";
import { Aviso, Carregando } from "../components/Aviso";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import {
  slotsLabel,
  type ProInvite,
  type ProCard,
  type ProContacts,
} from "../lib/professional";
export default function ConversasProfissionais() {
  const { session } = useAuth();
  const [invites, setInvites] = useState<ProInvite[] | null>(null);
  const [cards, setCards] = useState<ProCard[]>([]);
  const [error, setError] = useState("");
  async function load() {
    const [i, c] = await Promise.all([
      supabase
        .from("conversation_invites")
        .select("*")
        .or(
          `sender_id.eq.${session!.user.id},recipient_id.eq.${session!.user.id}`,
        )
        .order("created_at", { ascending: false }),
      supabase.rpc("mvp_cards"),
    ]);
    if (i.error || c.error) {
      setError("não foi possível carregar as conversas. tente novamente.");
      setInvites([]);
    } else {
      setInvites(i.data);
      setCards(c.data);
    }
  }
  useEffect(() => {
    load();
  }, [session]);
  return (
    <Pagina titulo="minhas conversas">
      <Titulo sub="seus convites, encontros e resultados em um só lugar.">
        minhas conversas
      </Titulo>
      {error && <Aviso tipo="erro">{error}</Aviso>}
      {!invites ? (
        <Carregando />
      ) : !invites.length ? (
        <div>
          <p className="mb-5">nenhuma conversa por aqui ainda.</p>
          <BotaoLink to="/">encontrar uma aliada</BotaoLink>
        </div>
      ) : (
        <div className="space-y-6">
          {invites.map((i) => (
            <Conversa
              key={i.id}
              invite={i}
              card={cards.find(
                (c) =>
                  c.id ===
                  (i.sender_id === session!.user.id
                    ? i.recipient_id
                    : i.sender_id),
              )}
              reload={load}
            />
          ))}
        </div>
      )}
    </Pagina>
  );
}
function Conversa({
  invite: i,
  card,
  reload,
}: {
  invite: ProInvite;
  card?: ProCard;
  reload: () => Promise<void>;
}) {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<ProContacts | null>(null);
  const [proposal, setProposal] = useState("");
  const [happened, setHappened] = useState("");
  const [utility, setUtility] = useState("");
  const [outcome, setOutcome] = useState("clareza");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const other = i.sender_id === session!.user.id ? i.recipient_id : i.sender_id;
  useEffect(() => {
    if (i.state !== "aceita") return;
    supabase
      .rpc("mvp_shared_contacts", { invite: i.id })
      .then(({ data, error }) => {
        if (!error) setContacts(data);
      });
    supabase
      .from("conversation_feedback")
      .select("*")
      .eq("invite_id", i.id)
      .eq("author_id", session!.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHappened(data.happened ? "sim" : "nao");
          setUtility(String(data.utility ?? ""));
          setOutcome(data.outcome);
        }
      });
  }, [i.id, i.state, session]);
  async function rpc(name: string, args: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc(name, args);
    setBusy(false);
    setMsg(error ? mensagemAmigavel(error) : "salvo.");
    if (!error) await reload();
  }
  async function block() {
    setBusy(true);
    const { error } = await supabase
      .from("conversation_blocks")
      .insert({ owner_id: session!.user.id, blocked_id: other });
    setBusy(false);
    if (error) setMsg(mensagemAmigavel(error));
    else await reload();
  }
  return (
    <article className="space-y-4 rounded-3xl border border-linha p-6">
      <h2 className="font-titulo text-2xl font-bold">
        {card?.name ?? "conversa profissional"}
      </h2>
      <p>{card?.occupation}</p>
      <p className="text-sm text-suave">
        {i.state === "pendente"
          ? "aguardando aceite"
          : i.state === "aceita"
            ? "conexão aceita pelas duas"
            : "convite recusado"}
      </p>
      <p className="break-words">{i.message}</p>
      {msg && <Aviso>{msg}</Aviso>}
      {i.state === "pendente" && i.recipient_id === session!.user.id && (
        <div className="flex gap-3">
          <Botao
            carregando={busy}
            onClick={() => rpc("mvp_respond", { invite: i.id, accept: true })}
          >
            aceitar convite
          </Botao>
          <Botao
            variante="secundario"
            carregando={busy}
            onClick={() => rpc("mvp_respond", { invite: i.id, accept: false })}
          >
            agora não
          </Botao>
        </div>
      )}
      {i.state === "aceita" && (
        <>
          <div>
            <h3 className="font-semibold">escolham como conversar</h3>
            <p className="text-sm text-suave">
              somente os canais autorizados pela outra participante aparecem
              aqui. não há envio automático nem chat interno.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {contacts?.linkedin && (
                <a
                  className="text-destaque underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={contacts.linkedin}
                >
                  LinkedIn
                </a>
              )}
              {contacts?.whatsapp && (
                <a
                  className="text-destaque underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${contacts.whatsapp.replace(/\D/g, "")}`}
                >
                  WhatsApp
                </a>
              )}
              {contacts?.email && (
                <a
                  className="text-destaque underline"
                  href={`mailto:${contacts.email}`}
                >
                  e-mail
                </a>
              )}
              {contacts?.meet && (
                <a
                  className="text-destaque underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={contacts.meet}
                >
                  Google Meet
                </a>
              )}
            </div>
            {contacts &&
              !contacts.linkedin &&
              !contacts.whatsapp &&
              !contacts.email &&
              !contacts.meet && (
                <p className="mt-3">
                  a outra participante ainda não disponibilizou um contato. você
                  pode atualizar os seus em meu perfil.
                </p>
              )}
          </div>
          <details className="rounded-xl bg-superficie p-4">
            <summary className="cursor-pointer font-semibold">
              combinar uma chamada
            </summary>
            <p className="my-3">
              períodos em comum (horário de Brasília):{" "}
              {contacts?.common_slots?.map(slotsLabel).join(", ") ||
                "nenhum período em comum informado"}
              . combinem o horário exato pelos contatos autorizados e confirmem
              a mesma proposta aqui. uma das participantes pode criar um Meet e
              salvar o link em meu perfil.
            </p>
            <CampoTexto
              rotulo="horário combinado"
              ajuda="informe data, hora e fuso, por exemplo 20/11 às 15h, Brasília. não cria evento automaticamente."
              maxLength={120}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
            />
            <Botao
              variante="secundario"
              disabled={busy || !proposal.trim()}
              onClick={() => rpc("mvp_schedule", { invite: i.id, proposal })}
            >
              confirmar minha proposta
            </Botao>
            <p className="mt-3">
              proposta de quem convidou: {i.sender_time || "aguardando"}
            </p>
            <p>proposta de quem aceitou: {i.recipient_time || "aguardando"}</p>
            {i.sender_time && i.sender_time === i.recipient_time && (
              <p className="font-semibold">
                as duas confirmaram o mesmo horário.
              </p>
            )}
          </details>
          <fieldset className="space-y-4 rounded-xl bg-superficie p-5">
            <legend className="font-semibold">como foi a conversa?</legend>
            <p className="text-sm text-suave">
              cada participante responde por si. não gravamos mensagens nem
              chamadas.
            </p>
            <label className="block">
              a conversa aconteceu?
              <select
                className="ml-3 rounded-lg border border-campo bg-fundo p-2"
                value={happened}
                onChange={(e) => setHappened(e.target.value)}
              >
                <option value="">escolha</option>
                <option value="sim">sim</option>
                <option value="nao">não</option>
              </select>
            </label>
            {happened === "sim" && (
              <>
                <label className="block">
                  de 1 a 5, quanto contribuiu para o objetivo profissional?
                  <select
                    className="ml-3 rounded-lg border border-campo bg-fundo p-2"
                    value={utility}
                    onChange={(e) => setUtility(e.target.value)}
                  >
                    <option value="">escolha</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  principal resultado da troca
                  <select
                    className="ml-3 rounded-lg border border-campo bg-fundo p-2"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    {Object.entries({
                      clareza: "mais clareza",
                      preparo: "preparo para uma oportunidade",
                      feedback: "feedback recebido",
                      contato: "novo contato profissional",
                      outro: "outro resultado",
                    }).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <Botao
              carregando={busy}
              disabled={!happened || (happened === "sim" && !utility)}
              onClick={() =>
                rpc("mvp_feedback", {
                  invite: i.id,
                  happened: happened === "sim",
                  utility: happened === "sim" ? Number(utility) : null,
                  outcome: happened === "sim" ? outcome : "nao_aconteceu",
                })
              }
            >
              salvar minha avaliação
            </Botao>
          </fieldset>
        </>
      )}
      <div className="flex gap-5">
        <Botao
          variante="discreto"
          onClick={() => setConfirmBlock(!confirmBlock)}
        >
          bloquear participante
        </Botao>
        <Botao variante="discreto" onClick={() => setReport(!report)}>
          denunciar
        </Botao>
      </div>
      {confirmBlock && (
        <div>
          <p>
            o bloqueio interrompe novos convites e o acesso aos contatos.
            contatos já vistos não podem ser recuperados.
          </p>
          <Botao variante="perigo" carregando={busy} onClick={block}>
            confirmar bloqueio
          </Botao>
        </div>
      )}
      {report && (
        <div>
          <CampoTexto
            rotulo="motivo da denúncia (somente a curadoria lê)"
            minLength={5}
            maxLength={800}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Botao
            variante="secundario"
            disabled={busy || reason.trim().length < 5}
            onClick={() => rpc("mvp_report", { target: other, reason })}
          >
            enviar denúncia
          </Botao>
        </div>
      )}
    </article>
  );
}
