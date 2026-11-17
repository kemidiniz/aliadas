import { CHAVE_NOVA_SENHA, useAuth } from "../lib/auth";
import { SenhaPerfil } from "../components/SenhaPerfil";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CONTAINER, Formulario, Pagina, Titulo } from "../components/Pagina";
import { Caixinha, CampoSelect, CampoTexto, MultiEscolha } from "../components/Campo";
import { Botao } from "../components/Botao";
import { CartaoCarregando } from "../components/ui";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import { enviarFoto, useFotoUrl } from "../lib/fotos";
import { FotoPerfil } from "../components/FotoPerfil";
import { AREAS_PRO, CHANNELS_PRO, SITUACAO_PRO, type ProContacts, type ProProfile } from "../lib/professional";

import { EscolhaHabilidades } from "../components/EscolhaHabilidades";
import { chaveRascunhoPerfil, useAvisoPerfil } from "../lib/rascunhoPerfil";

const opcoes = (m: Record<string, string>) => Object.entries(m).map(([valor, rotulo]) => ({ valor, rotulo }));
type Dados = {
  nome: string;
  situacao: string;
  area: string;
  interesses: string[];
  can_help: string[];
  habilidades: string[];
  channels: string[];
  ai_consent: boolean;
  available: boolean;
};
const vazio: Dados = { nome: "", situacao: "", area: "", interesses: [], can_help: [], habilidades: [], channels: [], ai_consent: false, available: true };

function erros(d: Dados, c: ProContacts, termos: boolean, completar: boolean) {
  const e: Record<string, string> = {};
  if (d.nome.trim().length < 2) e.nome = "Escreva como quer ser chamada.";
  if (!d.situacao) e.situacao = "Escolha uma opção.";
  if (!d.area) e.area = "Escolha uma opção.";
  if (!termos) e.termos = "Confirme para continuar.";
  if (c.nome_completo && c.nome_completo.trim().length < 2) e.nome_completo = "Escreva o nome completo ou deixe em branco.";
  if (d.channels.includes("linkedin") && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//.test(c.linkedin ?? ""))
    e.linkedin = "Cole o link completo, começando com https://www.linkedin.com/";
  if (d.channels.includes("whatsapp") && !/^\+[1-9][0-9]{7,14}$/.test(c.whatsapp ?? ""))
    e.whatsapp = "Use o código do país, sem espaços. Ex.: +5511999999999";
  if (d.channels.includes("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email ?? "")) e.email = "Confira o e-mail.";
  if (completar) {
    if (!d.interesses.length) e.interesses = "Escolha pelo menos uma área.";
    if (!d.channels.length) e.channels = "Escolha pelo menos um contato.";
  }
  return e;
}

export default function PerfilProfissional({ completar = false }: { completar?: boolean }) {
  const { session, perfil, recarregar, sair } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const local = useLocation();
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState(false);
  const [recuperacao] = useState(() => Boolean(sessionStorage.getItem(CHAVE_NOVA_SENHA)));
  const [d, setD] = useState<Dados>(vazio);
  const [c, setC] = useState<ProContacts>({ linkedin: "", whatsapp: "", email: "", meet: null, nome_completo: "" });
  const [foto, setFoto] = useState<Blob | null>(null);
  const [semFoto, setSemFoto] = useState(false);
  const [termos, setTermos] = useState(false);
  const [mostrarErros, setMostrarErros] = useState(false);
  const [busy, setBusy] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const fotoAtual = useFotoUrl(semFoto ? null : (perfil?.foto_path ?? null));

  const uid = session?.user.id;
  const nomeInicial = useRef(perfil?.apelido ?? "");
  const [base, setBase] = useState("");
  const [recuperado, setRecuperado] = useState(false);
  const [original, setOriginal] = useState<{ d: Dados; c: ProContacts; termos: boolean } | null>(null);
  const conteudo = JSON.stringify({ d, c, termos });
  const sujo = Boolean(base && (conteudo !== base || foto || semFoto));
  const liberado = useRef(false);
  useAvisoPerfil(sujo, liberado);
  useEffect(() => {
    if (!uid) return;
    let ativo = true;
    setCarregando(true);
    Promise.all([
      supabase.from("professional_profiles").select("*").eq("profile_id", uid).maybeSingle(),
      supabase.from("professional_contacts").select("*").eq("profile_id", uid).maybeSingle(),
    ]).then(([pr, co]) => {
      if (!ativo) return;
      if (pr.error || co.error) { toast("Não foi possível carregar seu perfil. Atualize a página.", "erro"); return; }
      const p = pr.data as ProProfile | null;
      const salvo = {
        d: p ? { nome: nomeInicial.current, situacao: p.situacao ?? "", area: p.area_principal ?? "", interesses: p.interesses ?? [], can_help: p.can_help ?? [], habilidades: p.habilidades ?? [], channels: p.channels.filter(x => x !== "meet"), ai_consent: p.ai_consent, available: p.available } : { ...vazio, nome: nomeInicial.current },
        c: (co.data as ProContacts) ?? { linkedin: "", whatsapp: "", email: "", meet: null, nome_completo: "" },
        termos: Boolean(p),
      };
      setNovo(!p); setOriginal(salvo); setBase(JSON.stringify(salvo));
      let restaurado = salvo;
      try {
        const raw = sessionStorage.getItem(chaveRascunhoPerfil(uid));
        const r = raw ? JSON.parse(raw) : null;
        // Só os campos do formulário. Senhas e credenciais nunca entram no rascunho.
        if (r?.d && typeof r.d.nome === "string" && Array.isArray(r.d.interesses) && Array.isArray(r.d.can_help) && Array.isArray(r.d.channels) && r.c && typeof r.termos === "boolean") {
          restaurado = { d: { ...salvo.d, ...r.d }, c: { ...salvo.c, ...r.c }, termos: r.termos };
          setRecuperado(JSON.stringify(restaurado) !== JSON.stringify(salvo));
        }
      } catch { sessionStorage.removeItem(chaveRascunhoPerfil(uid)); }
      setD(restaurado.d); setC(restaurado.c); setTermos(restaurado.termos); setCarregando(false);
    });
    return () => { ativo = false; };
  }, [uid]);
  useEffect(() => { if (base && conteudo !== base) liberado.current = false; }, [conteudo, base, foto, semFoto]);
  useEffect(() => {
    if (!uid || carregando || liberado.current) return;
    try {
      if (sujo) sessionStorage.setItem(chaveRascunhoPerfil(uid), conteudo);
      else sessionStorage.removeItem(chaveRascunhoPerfil(uid));
    } catch { /* O formulário continua disponível se o navegador bloquear o armazenamento. */ }
  }, [uid, carregando, sujo, conteudo]);
  const descartar = () => {
    if (!original) return;
    setD(original.d); setC(original.c); setTermos(original.termos); setFoto(null); setSemFoto(false); setRecuperado(false);
    if (uid) sessionStorage.removeItem(chaveRascunhoPerfil(uid));
  };
  const avisoRascunho = recuperado ? <div role="status" className="mb-6 space-y-3 rounded-2xl border border-linha p-4">
    <p>Recuperamos o que você não tinha salvado.</p><div className="flex flex-wrap gap-3">
      <Botao type="button" onClick={() => salvar()} carregando={busy}>Salvar agora</Botao>
      <Botao type="button" variante="secundario" onClick={descartar}>Descartar</Botao>
    </div></div> : null;

  if (carregando)
    return (
      <Pagina titulo="Meu perfil">
        <CartaoCarregando />
      </Pagina>
    );
  if (completar && novo) {
    navegar("/meu-perfil", { replace: true });
    return null;
  }

  const e = erros(d, c, termos, completar);
  const err = (k: string) => (mostrarErros ? e[k] : undefined);
  const set = (x: Partial<Dados>) => { liberado.current = false; setD({ ...d, ...x }); };

  async function salvar(ev?: FormEvent) {
    ev?.preventDefault();
    if (Object.keys(e).length) {
      setMostrarErros(true);
      setTimeout(() => document.querySelector("[aria-invalid=true], [role=alert]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    setBusy(true);
    try {
      const path = foto ? await enviarFoto(session!.user.id, foto) : semFoto ? null : (perfil?.foto_path ?? null);
      const contato = (k: "linkedin" | "whatsapp" | "email") => (d.channels.includes(k) ? c[k] : "");
      const { error } = await supabase.rpc("mvp_save_profile", {
        p: {
          name: d.nome,
          photo: path,
          situacao: d.situacao,
          area_principal: d.area,
          interesses: d.interesses,
          can_help: d.can_help,
          habilidades: d.habilidades,
          channels: d.channels,
          ai_consent: d.ai_consent,
          available: d.available,
        },
        // sala e horários saíram da tela: não são enviados e o banco mantém o que já existia
        c: { linkedin: contato("linkedin"), whatsapp: contato("whatsapp"), email: contato("email"), nome_completo: c.nome_completo ?? "" },
        terms: termos,
      });
      if (error) throw error;
      liberado.current = true;
      setBase(conteudo); setOriginal({ d, c, termos }); setRecuperado(false); setFoto(null); setSemFoto(false);
      if (uid) sessionStorage.removeItem(chaveRascunhoPerfil(uid));
      await recarregar();
      if (novo) {
        toast("Boas-vindas! As embaixadoras vão revisar seu perfil em breve.");
        navegar("/");
      } else if (completar) {
        toast("Pronto! Vamos continuar.");
        navegar(`/${local.search}`);
      } else toast("Perfil salvo.");
    } catch (err) {
      toast(mensagemAmigavel(err), "erro");
    } finally {
      setBusy(false);
    }
  }
  async function excluirConta() {
    liberado.current = true;
    setBusy(true);
    const { error } = await supabase.functions.invoke("excluir-conta");
    setBusy(false);
    if (error) toast("Não foi possível excluir sua conta. Tente novamente.", "erro");
    else await sair();
  }

  const iniciais = (d.nome.trim() || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const campos = {
    nome: (
      <CampoTexto rotulo="Como quer ser chamada" ajuda="É o nome que aparece na indicação." value={d.nome} maxLength={40} erro={err("nome")} onChange={(x) => set({ nome: x.target.value })} />
    ),
    situacao: (
      <CampoSelect rotulo="Você hoje" value={d.situacao} erro={err("situacao")} opcoes={[{ valor: "", rotulo: "Escolha" }, ...opcoes(SITUACAO_PRO)]} onChange={(x) => set({ situacao: x.target.value })} />
    ),
    area: (
      <CampoSelect rotulo="Sua área de atuação ou estudo" value={d.area} erro={err("area")} opcoes={[{ valor: "", rotulo: "Escolha" }, ...opcoes(AREAS_PRO)]} onChange={(x) => set({ area: x.target.value })} />
    ),
    interesses: (
      <MultiEscolha rotulo="Áreas de interesse" ajuda="Até 5." erro={err("interesses")} opcoes={opcoes(AREAS_PRO)} valores={d.interesses} max={5} aoMudar={(interesses) => set({ interesses })} />
    ),
    ajudar: (
      <div className="space-y-6">
        <EscolhaHabilidades valores={d.habilidades} aoMudar={habilidades => set({ habilidades })} />
        <Caixinha marcado={d.available} aoMudar={(available) => set({ available })}>
          Disponível para receber convites
        </Caixinha>
      </div>
    ),
    contatos: (
      <div className="space-y-6">
        <MultiEscolha rotulo="Por onde podem falar com você" ajuda="Aparecem só depois do aceite mútuo." erro={err("channels")} opcoes={opcoes(CHANNELS_PRO)} valores={d.channels} aoMudar={(channels) => set({ channels })} />
        <div className="grid items-start gap-6 sm:grid-cols-2">
          {d.channels.includes("linkedin") && (
            <CampoTexto rotulo="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/..." value={c.linkedin ?? ""} maxLength={250} erro={err("linkedin")} onChange={(x) => setC({ ...c, linkedin: x.target.value })} />
          )}
          {d.channels.includes("whatsapp") && (
            <CampoTexto rotulo="WhatsApp" type="tel" placeholder="+5511999999999" value={c.whatsapp ?? ""} maxLength={16} erro={err("whatsapp")} onChange={(x) => setC({ ...c, whatsapp: x.target.value })} />
          )}
          {d.channels.includes("email") && (
            <CampoTexto rotulo="E-mail para contato" type="email" value={c.email ?? ""} maxLength={254} erro={err("email")} onChange={(x) => setC({ ...c, email: x.target.value })} />
          )}
        </div>
      </div>
    ),
    ia: (
      <Caixinha marcado={d.ai_consent} aoMudar={(ai_consent) => set({ ai_consent })}>
        Autorizo enviar só categorias (situação, áreas e objetivos) ao Gemini para sugerir perguntas e uma mensagem. Nunca nome, contatos ou textos livres.{" "}
        <Link to="/privacidade#ia" className="text-link">Saiba mais</Link>
      </Caixinha>
    ),
    termos: (
      <>
        <Caixinha marcado={termos} aoMudar={setTermos} obrigatoria>
          Sou mulher cis, trans ou pessoa não binária e aceito os <Link to="/termo-de-conduta" className="text-link">Termos de uso</Link> e a{" "}
          <Link to="/privacidade" className="text-link">Privacidade</Link>.
        </Caixinha>
        {err("termos") && <p className="text-sm text-erro" role="alert">{err("termos")}</p>}
      </>
    ),
  };

  // Primeiro acesso: uma tela só
  if (novo)
    return (
      <Pagina titulo="Criar perfil">
        <Formulario>
        {avisoRascunho}
        <Titulo sub="Leva menos de dois minutos. O resto você completa quando precisar.">Boas-vindas à aliadas</Titulo>
        <form onSubmit={salvar} className="space-y-6" noValidate>
          {campos.nome}
          <div className="grid items-start gap-6 sm:grid-cols-2">
            {campos.situacao}
            {campos.area}
          </div>
          <div className="space-y-3">
            {campos.ia}
            {campos.termos}
          </div>
          {sujo && <p role="status" className="text-sm text-suave">Mudanças não salvas</p>}
          <Botao type="submit" carregando={busy}>Entrar na aliadas</Botao>
        </form>
        </Formulario>
      </Pagina>
    );

  // Completar só quando precisar
  if (completar)
    return (
      <Pagina titulo="Falta pouco">
        <Formulario>
        {avisoRascunho}
        <Titulo sub="Só mais isto para encontrarmos alguém para você.">Falta pouco para sua primeira conversa</Titulo>
        <form onSubmit={salvar} className="space-y-8" noValidate>
          {campos.interesses}
          {campos.ajudar}
          {campos.contatos}
          {sujo && <p role="status" className="text-sm text-suave">Mudanças não salvas</p>}
          <Botao type="submit" carregando={busy}>Salvar e continuar</Botao>
        </form>
        </Formulario>
      </Pagina>
    );

  const secoes: { id: string; titulo: string; conteudo: ReactNode; completa?: boolean }[] = [
    {
      id: "sobre",
      titulo: "Sobre você",
      completa: !e.nome,
      conteudo: (
        <div className="grid items-start gap-6 sm:grid-cols-2">
          {campos.nome}
          <CampoTexto rotulo="Nome completo (opcional)" ajuda="Aparece só para quem aceitar conversar com você." value={c.nome_completo ?? ""} maxLength={120} erro={err("nome_completo")} onChange={(x) => setC({ ...c, nome_completo: x.target.value })} />
          <div className="sm:col-span-2">
            <FotoPerfil
              iniciais={iniciais}
              previaAtual={fotoAtual}
              aoMudar={(f) => {
                setFoto(f);
                setSemFoto(f === null);
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "hoje",
      titulo: "Você hoje",
      completa: !e.situacao && !e.area && d.interesses.length > 0,
      conteudo: (
        <div className="space-y-6">
          <div className="grid items-start gap-6 sm:grid-cols-2">
            {campos.situacao}
            {campos.area}
          </div>
          {campos.interesses}
        </div>
      ),
    },
    { id: "ajudar", titulo: "Como você pode ajudar", completa: true, conteudo: campos.ajudar },
    { id: "contatos", titulo: "Contatos", completa: d.channels.length > 0 && !e.linkedin && !e.whatsapp && !e.email, conteudo: campos.contatos },
    {
      id: "privacidade",
      titulo: "Privacidade",
      completa: true,
      conteudo: (
        <div className="space-y-3">
          {campos.ia}
        </div>
      ),
    },
  ];
  const feitas = secoes.filter((s) => s.completa).length;

  return (
    <Pagina titulo="Meu perfil">
      <Titulo sub="Um perfil, muitas conversas possíveis.">Meu perfil</Titulo>
      {avisoRascunho}
      {recuperacao && <SenhaPerfil />}
      {/* índice (200px) + formulário (até 760px), ocupando o container */}
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,760px)] lg:gap-8">
        <nav aria-label="Seções do perfil" className="hidden lg:block">
          <ul className="sticky top-24 -ml-3 space-y-1 text-sm">
            {[...secoes, { id: "conta", titulo: "Conta" }].map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-superficie">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${"completa" in s ? (s.completa ? "bg-destaque" : "border border-campo") : "bg-linha"}`} />
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <form onSubmit={salvar} className="space-y-6 pb-28" noValidate>
          {secoes.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`t-${s.id}`} className="scroll-mt-24 rounded-3xl border border-linha p-5 sm:p-6">
              <h2 id={`t-${s.id}`} className="mb-5 text-xl">{s.titulo}</h2>
              {s.conteudo}
            </section>
          ))}
          <section id="conta" aria-labelledby="t-conta" className="scroll-mt-24 space-y-5 rounded-3xl border border-linha p-5 sm:p-6">
            <h2 id="t-conta" className="text-xl">Conta</h2>
            {!recuperacao && <SenhaPerfil />}
            <p className="text-sm">
              Precisa de ajuda? <Link to="/ajuda" className="text-link">Ajuda e feedback</Link>
            </p>
            <div className="flex flex-wrap gap-3">
              <Botao type="button" variante="secundario" onClick={() => { if (!sujo || window.confirm("Você tem mudanças não salvas. Sair mesmo assim?")) { liberado.current = true; void sair(); } }}>Sair da conta</Botao>
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
          {/* barra de salvar no mesmo container "form" (960px) da página */}
          <div className="fixed inset-x-0 bottom-16 z-30 border-t border-linha bg-fundo/95 backdrop-blur sm:bottom-0">
            <div className={`${CONTAINER} py-3 lg:grid lg:grid-cols-[200px_minmax(0,760px)] lg:gap-8`}>
              <span className="hidden lg:block" aria-hidden />
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-suave" aria-live="polite">
                  {sujo ? "Mudanças não salvas · " : ""}{feitas} de {secoes.length} seções completas
                </p>
                <Botao type="submit" carregando={busy}>Salvar</Botao>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Pagina>
  );
}
