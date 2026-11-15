import { CHAVE_NOVA_SENHA } from "../lib/auth";
import { SenhaPerfil } from "../components/SenhaPerfil";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pagina, Titulo } from "../components/Pagina";
import { Avatar } from "../components/Avatar";
import { CampoTexto } from "../components/Campo";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import { enviarFoto, validarFoto } from "../lib/fotos";
import {
  AREAS_PRO,
  GOALS_PRO,
  MOMENTS_PRO,
  CHANNELS_PRO,
  INTENTIONS_PRO,
  DAYS_PRO,
  type ProProfile,
  type ProContacts,
} from "../lib/professional";
const initial = {
  occupation: "",
  moment: "estudante",
  areas: [] as string[],
  themes: [] as string[],
  intentions: [] as string[],
  channels: [] as string[],
  slots: [] as string[],
  ai_consent: false,
  available: true,
};
export function Multi({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  values: string[];
  onChange: (a: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-titulo text-lg font-semibold">
        {label}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(options).map(([k, v]) => (
          <label
            key={k}
            className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-superficie"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={values.includes(k)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...values, k]
                    : values.filter((x) => x !== k),
                )
              }
            />
            {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export default function PerfilProfissional() {
  const { session, perfil, recarregar, sair } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recoveryAtOpen] = useState(() =>
    Boolean(sessionStorage.getItem(CHAVE_NOVA_SENHA)),
  );
  const [p, setP] = useState(initial);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [c, setC] = useState<ProContacts>({
    linkedin: "",
    whatsapp: "",
    email: "",
    meet: "",
  });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [remove, setRemove] = useState(false);
  useEffect(() => {
    let active = true;
    if (!session) return;
    Promise.all([
      supabase
        .from("professional_profiles")
        .select("*")
        .eq("profile_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("professional_contacts")
        .select("*")
        .eq("profile_id", session.user.id)
        .maybeSingle(),
    ]).then(([pr, co]) => {
      if (!active) return;
      if (pr.error || co.error)
        setMsg(
          "Não foi possível carregar seu perfil. Atualize a página ou tente novamente em instantes.",
        );
      else {
        if (pr.data) setP(pr.data as ProProfile);
        if (co.data) setC(co.data as ProContacts);
        setName(perfil?.apelido ?? "");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [session, perfil?.apelido]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (
      !terms ||
      !p.areas.length ||
      !p.themes.length ||
      !p.intentions.length ||
      !p.channels.length
    ) {
      document.getElementById("experiencias")?.setAttribute("open", "");
      document.getElementById("preferencias")?.setAttribute("open", "");
      return setMsg(
        "Selecione as áreas, temas, preferências e confirme os termos.",
      );
    }
    if (p.areas.length > 8 || p.themes.length > 8)
      return setMsg("selecione até oito opções em cada grupo.");
    if (photo) {
      const error = validarFoto(photo);
      if (error) return setMsg(error);
    }
    setBusy(true);
    try {
      const path = photo
        ? await enviarFoto(session!.user.id, photo)
        : (perfil?.foto_path ?? null);
      const { error } = await supabase.rpc("mvp_save_profile", {
        p: { ...p, name, photo: path },
        c,
        terms,
      });
      if (error) throw error;
      await recarregar();
      setMsg("perfil salvo. novos perfis aguardam aprovação da curadoria.");
    } catch (e) {
      setMsg(mensagemAmigavel(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("excluir-conta");
    setBusy(false);
    if (error) setMsg("não foi possível excluir sua conta. tente novamente.");
    else await sair();
  }
  if (loading)
    return (
      <Pagina titulo="Meu perfil">
        <Carregando />
      </Pagina>
    );
  return (
    <Pagina titulo="Meu perfil">
      <Titulo sub="Um perfil, muitas possibilidades de troca. não é necessário ter empresa, universidade ou LinkedIn.">
        Meu perfil
      </Titulo>
      {msg && (
        <div className="mb-6">
          <Aviso>{msg}</Aviso>
        </div>
      )}
      {recoveryAtOpen && <SenhaPerfil />}
      <form onSubmit={save} className="space-y-8">
        <section className="space-y-5">
          <h2>Informações profissionais</h2>
          <p className="text-sm text-suave">
            O essencial para apresentar sua trajetória. Não é necessário
            informar vínculo institucional.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <CampoTexto
              rotulo="Nome de apresentação profissional"
              value={name}
              minLength={2}
              maxLength={40}
              required
              onChange={(e) => setName(e.target.value)}
            />
            <CampoTexto
              rotulo="Ocupação, curso ou formação"
              ajuda="Não inclua contatos, links ou informações confidenciais."
              value={p.occupation}
              minLength={2}
              maxLength={120}
              required
              onChange={(e) => setP({ ...p, occupation: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <Avatar apelido={name} fotoPath={perfil?.foto_path ?? null} />
          </div>
          <label className="block space-y-2">
            <span>foto (opcional, até 2 MB)</span>
            <input
              className="block w-full"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block space-y-2">
            <span>momento de carreira</span>
            <select
              className="block w-full rounded-xl border-2 border-campo bg-fundo p-3"
              value={p.moment}
              onChange={(e) => setP({ ...p, moment: e.target.value })}
            >
              {Object.entries(MOMENTS_PRO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </section>
        <details id="experiencias" className="profile-section">
          <summary>
            Experiências e temas{" "}
            <span className="section-count">
              {p.areas.length} áreas · {p.themes.length} temas
            </span>
          </summary>
          <div className="mt-6 space-y-7">
            <Multi
              label="Áreas de conhecimento ou experiência (até oito)"
              options={AREAS_PRO}
              values={p.areas}
              onChange={(areas) => setP({ ...p, areas })}
            />
            <Multi
              label="Temas sobre os quais gostaria de conversar"
              options={GOALS_PRO}
              values={p.themes}
              onChange={(themes) => setP({ ...p, themes })}
            />
          </div>
        </details>
        <details id="preferencias" className="profile-section">
          <summary>
            Preferências de conversa{" "}
            <span className="section-count">
              {p.intentions.length} modalidades · {p.channels.length} canais
            </span>
          </summary>
          <div className="mt-6 space-y-7">
            <Multi
              label="Como quer participar? pode escolher as duas"
              options={INTENTIONS_PRO}
              values={p.intentions}
              onChange={(intentions) => setP({ ...p, intentions })}
            />
            <Multi
              label="Canais que aceita compartilhar após o aceite mútuo"
              options={CHANNELS_PRO}
              values={p.channels}
              onChange={(channels) => setP({ ...p, channels })}
            />
          </div>
        </details>
        <details className="profile-section">
          <summary className="cursor-pointer font-titulo text-lg font-semibold">
            Contatos privados
          </summary>
          <p className="my-4 text-sm text-suave">
            Todos os campos são opcionais. preencher um canal e autorizá-lo
            acima permite compartilhá-lo somente após o aceite mútuo. seu e-mail
            de login nunca é copiado para cá.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(CHANNELS_PRO).map(([k, v]) => (
              <CampoTexto
                key={k}
                rotulo={v}
                ajuda={
                  k === "whatsapp"
                    ? "com código do país, por exemplo +5511999999999"
                    : k === "meet"
                      ? "crie o link manualmente após o aceite e volte aqui para salvar."
                      : undefined
                }
                type={
                  k === "email" ? "email" : k === "whatsapp" ? "tel" : "url"
                }
                value={(c[k as keyof ProContacts] as string) ?? ""}
                maxLength={250}
                onChange={(e) => setC({ ...c, [k]: e.target.value })}
              />
            ))}
          </div>
        </details>
        <details className="profile-section">
          <summary>
            Disponibilidade{" "}
            <span className="section-count">{p.slots.length} períodos</span>
          </summary>
          <div className="mt-5">
            <fieldset>
              <legend className="mb-3 font-semibold">
                Dias e períodos disponíveis para chamadas (horário de Brasília)
              </legend>
              {DAYS_PRO.map((day, i) => (
                <div key={day} className="mb-3 flex flex-wrap gap-4">
                  <span className="w-20">{day}</span>
                  {["manha", "tarde", "noite"].map((period) => {
                    const slot = `${i + 1}_${period}`;
                    return (
                      <label key={slot} className="flex gap-2">
                        <input
                          type="checkbox"
                          checked={p.slots.includes(slot)}
                          onChange={(e) =>
                            setP({
                              ...p,
                              slots: e.target.checked
                                ? [...p.slots, slot]
                                : p.slots.filter((x) => x !== slot),
                            })
                          }
                        />
                        {period === "manha" ? "manhã" : period}
                      </label>
                    );
                  })}
                </div>
              ))}
            </fieldset>
          </div>
        </details>
        <section className="space-y-6">
          <h2>Privacidade e consentimentos</h2>
          <label className="flex gap-3">
            <input
              type="checkbox"
              checked={p.available}
              onChange={(e) => setP({ ...p, available: e.target.checked })}
            />
            Estou disponível para novas conversas
          </label>
          <label className="flex items-start gap-3">
            <input
              className="mt-1"
              type="checkbox"
              checked={p.ai_consent}
              onChange={(e) => setP({ ...p, ai_consent: e.target.checked })}
            />
            <span>
              Autorizo enviar apenas categorias de áreas, momento de carreira e
              objetivos ao Gemini para preparar justificativa, perguntas e um
              rascunho. no plano gratuito, o provedor pode usar os dados para
              melhorar seus modelos, conforme seus termos. não serão enviados
              nomes, contatos, links, ocupação em texto livre ou descrições.
              posso retirar esta autorização aqui. sem ela, uso a
              compatibilidade básica, sem IA externa.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              className="mt-1"
              required
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>
              Sou mulher cis, trans ou pessoa não binária e aceito os{" "}
              <Link to="/termo-de-conduta" className="underline">
                Termos de uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" className="underline">
                Privacidade
              </Link>
              . entendo que os contatos só serão compartilhados após aceite
              mútuo e que posso editar ou excluir meus dados.
            </span>
          </label>
        </section>
        <Botao type="submit" carregando={busy}>
          Salvar meu perfil
        </Botao>
      </form>
      {!recoveryAtOpen && <SenhaPerfil />}
      <div className="mt-10 flex flex-wrap gap-4">
        <Botao variante="discreto" onClick={() => sair()}>
          Sair da conta
        </Botao>
        <Botao variante="perigo" onClick={() => setRemove(true)}>
          Excluir minha conta
        </Botao>
      </div>
      {remove && (
        <div className="mt-5 rounded-xl border border-erro p-5">
          <p>
            Esta ação apaga seu perfil, contatos e conversas. deseja continuar?
          </p>
          <Botao variante="perigo" carregando={busy} onClick={deleteAccount}>
            Confirmar exclusão
          </Botao>
          <Botao variante="discreto" onClick={() => setRemove(false)}>
            Cancelar
          </Botao>
        </div>
      )}
    </Pagina>
  );
}
