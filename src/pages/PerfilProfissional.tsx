import { CHAVE_NOVA_SENHA, useAuth } from "../lib/auth";
import { SenhaPerfil } from "../components/SenhaPerfil";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pagina, Titulo } from "../components/Pagina";
import {
  Caixinha,
  CampoArquivo,
  CampoSelect,
  CampoTexto,
  GradeDisponibilidade,
  MultiEscolha,
} from "../components/Campo";
import { Botao } from "../components/Botao";
import { CartaoCarregando } from "../components/ui";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import { enviarFoto, useFotoUrl, validarFoto } from "../lib/fotos";
import { SALA_VALIDA } from "../lib/agenda";
import {
  AREAS_PRO,
  CHANNELS_PRO,
  GOALS_PRO,
  MOMENTS_PRO,
  type ProContacts,
  type ProProfile,
} from "../lib/professional";

const inicial = {
  occupation: "",
  moment: "estudante",
  areas: [] as string[],
  can_help: [] as string[],
  want_talk: [] as string[],
  channels: [] as string[],
  slots: [] as string[],
  ai_consent: false,
  available: true,
};
type Dados = typeof inicial;
const opcoes = (m: Record<string, string>) =>
  Object.entries(m).map(([valor, rotulo]) => ({ valor, rotulo }));

const SECOES = [
  { id: "quem", titulo: "Quem é você" },
  { id: "assuntos", titulo: "Assuntos" },
  { id: "contatos", titulo: "Contatos e sala" },
  { id: "disponibilidade", titulo: "Disponibilidade" },
  { id: "privacidade", titulo: "Privacidade" },
] as const;

function validar(nome: string, p: Dados, c: ProContacts, termos: boolean) {
  const e: Record<string, string> = {};
  if (nome.trim().length < 2) e.nome = "Escreva como quer ser chamada.";
  if (p.occupation.trim().length < 2) e.occupation = "Conte o que você faz ou estuda.";
  if (!p.areas.length) e.areas = "Escolha ao menos uma área.";
  if (!p.can_help.length && !p.want_talk.length) e.assuntos = "Escolha ao menos um assunto em uma das listas.";
  if (!p.channels.length) e.channels = "Escolha ao menos um canal.";
  if (p.channels.includes("linkedin") && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//.test(c.linkedin ?? ""))
    e.linkedin = "Cole o link completo, começando com https://www.linkedin.com/";
  if (p.channels.includes("whatsapp") && !/^\+[1-9][0-9]{7,14}$/.test(c.whatsapp ?? ""))
    e.whatsapp = "Use o código do país, sem espaços. Ex.: +5511999999999";
  if (p.channels.includes("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email ?? ""))
    e.email = "Confira o e-mail.";
  if (c.meet && !SALA_VALIDA.test(c.meet))
    e.meet = "Use um link https do Google Meet, Zoom, Teams, Whereby ou Jitsi.";
  if (!termos) e.termos = "Confirme para continuar.";
  return e;
}
const secaoDoErro: Record<string, string> = {
  nome: "quem", occupation: "quem", areas: "quem", assuntos: "assuntos",
  channels: "contatos", linkedin: "contatos", whatsapp: "contatos", email: "contatos", meet: "contatos",
  termos: "privacidade",
};

export default function PerfilProfissional() {
  const { session, perfil, recarregar, sair } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState(false);
  const [passo, setPasso] = useState(0);
  const [recuperacao] = useState(() => Boolean(sessionStorage.getItem(CHAVE_NOVA_SENHA)));
  const [p, setP] = useState<Dados>(inicial);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [semFoto, setSemFoto] = useState(false);
  const [c, setC] = useState<ProContacts>({ linkedin: "", whatsapp: "", email: "", meet: "" });
  const [termos, setTermos] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const fotoAtual = useFotoUrl(semFoto ? null : (perfil?.foto_path ?? null));

  useEffect(() => {
    if (!session) return;
    let ativo = true;
    Promise.all([
      supabase.from("professional_profiles").select("*").eq("profile_id", session.user.id).maybeSingle(),
      supabase.from("professional_contacts").select("*").eq("profile_id", session.user.id).maybeSingle(),
    ]).then(([pr, co]) => {
      if (!ativo) return;
      if (pr.error || co.error) toast("Não foi possível carregar seu perfil. Atualize a página.", "erro");
      const d = pr.data as ProProfile | null;
      if (d)
        setP({
          occupation: d.occupation,
          moment: d.moment,
          areas: d.areas,
          can_help: d.can_help ?? [],
          want_talk: d.want_talk ?? [],
          channels: d.channels.filter((x) => x !== "meet"),
          slots: d.slots,
          ai_consent: d.ai_consent,
          available: d.available,
        });
      else setNovo(true);
      if (co.data) setC(co.data as ProContacts);
      setNome(perfil?.apelido ?? "");
      setTermos(Boolean(d));
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [session, perfil?.apelido]);

  const e = validar(nome, p, c, termos);
  const completa: Record<string, boolean> = {
    quem: !e.nome && !e.occupation && !e.areas,
    assuntos: !e.assuntos,
    contatos: !e.channels && !e.linkedin && !e.whatsapp && !e.email && !e.meet,
    disponibilidade: p.slots.length > 0,
    privacidade: !e.termos,
  };
  const feitas = Object.values(completa).filter(Boolean).length;

  async function salvar(ev?: FormEvent) {
    ev?.preventDefault();
    if (Object.keys(e).length) {
      setErros(e);
      const alvo = secaoDoErro[Object.keys(e)[0]];
      if (novo) setPasso(alvo === "quem" ? 0 : alvo === "assuntos" ? 1 : 2);
      else document.getElementById(alvo)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (foto) {
      const erroFoto = validarFoto(foto);
      if (erroFoto) return setErros({ foto: erroFoto });
    }
    setErros({});
    setBusy(true);
    try {
      const path = foto ? await enviarFoto(session!.user.id, foto) : semFoto ? null : (perfil?.foto_path ?? null);
      const limpar = (k: keyof ProContacts) => (k === "meet" || p.channels.includes(k) ? c[k] : "");
      const { error } = await supabase.rpc("mvp_save_profile", {
        p: { ...p, name: nome, photo: path },
        c: { linkedin: limpar("linkedin"), whatsapp: limpar("whatsapp"), email: limpar("email"), meet: c.meet },
        terms: termos,
      });
      if (error) throw error;
      await recarregar();
      toast(novo ? "Perfil criado. A curadoria vai revisar em breve." : "Perfil salvo.");
      if (novo) navegar("/");
    } catch (err) {
      toast(mensagemAmigavel(err), "erro");
    } finally {
      setBusy(false);
    }
  }
  async function excluirConta() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("excluir-conta");
    setBusy(false);
    if (error) toast("Não foi possível excluir sua conta. Tente novamente.", "erro");
    else await sair();
  }

  if (carregando)
    return (
      <Pagina titulo="Meu perfil" largura="form">
        <CartaoCarregando />
      </Pagina>
    );

  const err = (k: string) => erros[k];
  const iniciais = (nome.trim() || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  const blocos: Record<string, ReactNode> = {
    quem: (
      <div className="space-y-6">
        <div className="grid items-start gap-6 sm:grid-cols-2">
          <CampoTexto rotulo="Nome de apresentação" value={nome} minLength={2} maxLength={40} erro={err("nome")} onChange={(x) => setNome(x.target.value)} />
          <CampoTexto
            rotulo="O que você faz ou estuda"
            ajuda="Ex.: analista de dados, estudante de direito."
            value={p.occupation}
            maxLength={120}
            erro={err("occupation")}
            onChange={(x) => setP({ ...p, occupation: x.target.value })}
          />
          <CampoSelect rotulo="Momento de carreira" value={p.moment} opcoes={opcoes(MOMENTS_PRO)} onChange={(x) => setP({ ...p, moment: x.target.value })} />
          <CampoArquivo
            rotulo="Foto (opcional)"
            ajuda="JPG, PNG ou WebP até 2 MB."
            erro={err("foto")}
            iniciais={iniciais}
            previaAtual={fotoAtual}
            arquivo={foto}
            aoEscolher={(f) => {
              setFoto(f);
              setSemFoto(false);
            }}
            aoRemover={() => {
              setFoto(null);
              setSemFoto(true);
            }}
          />
        </div>
        <MultiEscolha rotulo="Áreas em que você atua ou estuda" erro={err("areas")} opcoes={opcoes(AREAS_PRO)} valores={p.areas} max={8} aoMudar={(areas) => setP({ ...p, areas })} />
      </div>
    ),
    assuntos: (
      <div className="space-y-6">
        <MultiEscolha rotulo="Posso ajudar com" ajuda="Você será indicada para quem busca esses assuntos." opcoes={opcoes(GOALS_PRO)} valores={p.can_help} aoMudar={(can_help) => setP({ ...p, can_help })} />
        <MultiEscolha rotulo="Quero conversar sobre" ajuda="Só deixa o objetivo pré-escolhido no início." erro={err("assuntos")} opcoes={opcoes(GOALS_PRO)} valores={p.want_talk} aoMudar={(want_talk) => setP({ ...p, want_talk })} />
      </div>
    ),
    contatos: (
      <div className="space-y-6">
        <MultiEscolha rotulo="Por onde podem falar com você" ajuda="Aparecem só depois do aceite mútuo." erro={err("channels")} opcoes={opcoes(CHANNELS_PRO)} valores={p.channels} aoMudar={(channels) => setP({ ...p, channels })} />
        <div className="grid items-start gap-6 sm:grid-cols-2">
          {p.channels.includes("linkedin") && (
            <CampoTexto rotulo="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/..." value={c.linkedin ?? ""} maxLength={250} erro={err("linkedin")} onChange={(x) => setC({ ...c, linkedin: x.target.value })} />
          )}
          {p.channels.includes("whatsapp") && (
            <CampoTexto rotulo="WhatsApp" type="tel" placeholder="+5511999999999" value={c.whatsapp ?? ""} maxLength={16} erro={err("whatsapp")} onChange={(x) => setC({ ...c, whatsapp: x.target.value })} />
          )}
          {p.channels.includes("email") && (
            <CampoTexto rotulo="E-mail para contato" type="email" value={c.email ?? ""} maxLength={254} erro={err("email")} onChange={(x) => setC({ ...c, email: x.target.value })} />
          )}
          <CampoTexto
            rotulo="Link da minha sala de chamada (opcional)"
            ajuda="Crie uma vez e use em todas as conversas."
            type="url"
            placeholder="https://meet.google.com/..."
            value={c.meet ?? ""}
            maxLength={250}
            erro={err("meet")}
            onChange={(x) => setC({ ...c, meet: x.target.value })}
          />
        </div>
      </div>
    ),
    disponibilidade: (
      <GradeDisponibilidade
        rotulo="Quando você costuma ter tempo"
        ajuda="Horário de Brasília. Usamos para sugerir horários."
        valores={p.slots}
        aoMudar={(slots) => setP({ ...p, slots })}
      />
    ),
    privacidade: (
      <div className="space-y-3">
        {!novo && (
          <Caixinha marcado={p.available} aoMudar={(available) => setP({ ...p, available })}>
            Estou disponível para novas conversas
          </Caixinha>
        )}
        <Caixinha marcado={p.ai_consent} aoMudar={(ai_consent) => setP({ ...p, ai_consent })}>
          Autorizo enviar só categorias (áreas, momento e objetivos) ao Gemini para sugerir perguntas e uma mensagem. Nunca nome, contatos ou textos livres.{" "}
          <Link to="/privacidade#ia" className="text-link">Saiba mais</Link>
        </Caixinha>
        <Caixinha marcado={termos} aoMudar={setTermos} obrigatoria>
          Sou mulher cis, trans ou pessoa não binária e aceito os{" "}
          <Link to="/termo-de-conduta" className="text-link">Termos de uso</Link> e a{" "}
          <Link to="/privacidade" className="text-link">Privacidade</Link>.
        </Caixinha>
        {err("termos") && <p className="text-sm text-erro" role="alert">{err("termos")}</p>}
      </div>
    ),
  };

  // Primeiro acesso: 3 passos
  if (novo) {
    const PASSOS = [
      { titulo: "Quem é você", conteudo: blocos.quem },
      { titulo: "Posso ajudar e quero conversar", conteudo: blocos.assuntos },
      {
        titulo: "Disponibilidade e consentimentos",
        conteudo: (
          <div className="space-y-8">
            {blocos.contatos}
            {blocos.disponibilidade}
            {blocos.privacidade}
          </div>
        ),
      },
    ];
    const okPasso = [completa.quem, completa.assuntos, true][passo];
    return (
      <Pagina titulo="Criar perfil" largura="form">
        <div>
          <p className="mb-2 text-sm font-semibold text-suave">Passo {passo + 1} de 3</p>
          <div className="mb-8 h-2 rounded-full bg-superficie" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={passo + 1} aria-label="Progresso do cadastro">
            <div className="h-2 rounded-full bg-destaque transition-[width] duration-300" style={{ width: `${((passo + 1) / 3) * 100}%` }} />
          </div>
          <Titulo>{PASSOS[passo].titulo}</Titulo>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              if (passo < 2) {
                if (!okPasso) return setErros(e);
                setErros({});
                setPasso(passo + 1);
                window.scrollTo(0, 0);
              } else salvar();
            }}
            className="space-y-8"
          >
            {PASSOS[passo].conteudo}
            <div className="flex items-center justify-between gap-3 border-t border-linha pt-6">
              {passo > 0 ? (
                <Botao type="button" variante="discreto" onClick={() => setPasso(passo - 1)}>Voltar</Botao>
              ) : (
                <span />
              )}
              <Botao type="submit" carregando={busy}>{passo < 2 ? "Continuar" : "Criar meu perfil"}</Botao>
            </div>
          </form>
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Meu perfil" largura="form">
      <Titulo sub="Um perfil, muitas conversas possíveis.">Meu perfil</Titulo>
      {recuperacao && <SenhaPerfil />}
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,700px)] lg:gap-10">
        <nav aria-label="Seções do perfil" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {[...SECOES, { id: "conta", titulo: "Conta" }].map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-superficie">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${s.id === "conta" ? "bg-linha" : completa[s.id] ? "bg-destaque" : "border border-campo"}`} />
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <form onSubmit={salvar} className="space-y-6 pb-28" noValidate>
          {SECOES.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`t-${s.id}`} className="scroll-mt-24 rounded-3xl border border-linha p-5 sm:p-6">
              <h2 id={`t-${s.id}`} className="mb-5 text-xl">{s.titulo}</h2>
              {blocos[s.id]}
            </section>
          ))}
          <section id="conta" aria-labelledby="t-conta" className="scroll-mt-24 space-y-5 rounded-3xl border border-linha p-5 sm:p-6">
            <h2 id="t-conta" className="text-xl">Conta</h2>
            {!recuperacao && <SenhaPerfil />}
            <div className="flex flex-wrap gap-3">
              <Botao type="button" variante="secundario" onClick={() => sair()}>Sair da conta</Botao>
              <Botao type="button" variante="perigo" onClick={() => setExcluir(true)}>Excluir minha conta</Botao>
            </div>
            {excluir && (
              <div className="space-y-3 rounded-2xl border border-erro p-4">
                <p>Isso apaga seu perfil, contatos e conversas. Não dá para desfazer.</p>
                <div className="flex gap-3">
                  <Botao type="button" variante="perigo" carregando={busy} onClick={excluirConta}>Confirmar exclusão</Botao>
                  <Botao type="button" variante="discreto" onClick={() => setExcluir(false)}>Cancelar</Botao>
                </div>
              </div>
            )}
          </section>
          <div className="fixed inset-x-0 bottom-16 z-30 border-t border-linha bg-fundo/95 backdrop-blur sm:bottom-0">
            <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-3">
              <p className="text-sm text-suave" aria-live="polite">
                {feitas} de {SECOES.length} seções completas
              </p>
              <Botao type="submit" carregando={busy}>Salvar</Botao>
            </div>
          </div>
        </form>
      </div>
    </Pagina>
  );
}
