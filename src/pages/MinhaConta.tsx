import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao, BotaoLink } from '../components/Botao'
import { Caixinha, CampoArea, CampoTexto, Escolha } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { emailSchema, errosPorCampo, LIMITES, linkedinSchema, perfilSchema } from '../lib/esquemas'
import { mensagemAmigavel } from '../lib/erros'
import { apagarFoto, enviarFoto, validarFoto } from '../lib/fotos'
import { supabase } from '../lib/supabase'
import { ROTULO_FORMA, ROTULO_ONDE_ESTA, type FormaConexao, type OndeEsta, type Perfil } from '../lib/tipos'

const STATUS: Record<Perfil['status'], string> = {
  pendente: 'em análise pela curadoria',
  aprovado: 'aprovado',
  reprovado: 'não aprovado',
  pausado: 'pausado (você não aparece para ninguém)',
}

export default function MinhaConta() {
  const { perfil, session, recarregar, sair } = useAuth()
  const navegar = useNavigate()
  const [form, setForm] = useState<Perfil | null>(perfil)
  const [email, setEmail] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [recomendavel, setRecomendavel] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    setForm(perfil)
    if (!perfil) return
    supabase.from('contacts').select('*').eq('profile_id', perfil.id).maybeSingle().then(({ data }) => {
      setEmail(data?.email ?? '')
      setLinkedin(data?.linkedin_url ?? '')
    })
    supabase.from('consents').select('aceita_ser_recomendada').eq('profile_id', perfil.id).maybeSingle().then(({ data }) => {
      setRecomendavel(Boolean(data?.aceita_ser_recomendada))
    })
  }, [perfil])

  async function excluirConta() {
    setExcluindo(true)
    const { error } = await supabase.functions.invoke('excluir-conta', { body: {} })
    if (error) {
      setExcluindo(false)
      setMsg({ tipo: 'erro', texto: 'não conseguimos excluir agora. tente de novo em alguns minutos.' })
      return
    }
    await sair()
    navegar('/', { replace: true })
  }

  const blocoExcluir = (
    <section aria-labelledby="excluir" className="mt-14 rounded-3xl border-2 border-erro p-6">
      <h2 id="excluir" className="font-titulo text-2xl font-bold text-erro">excluir conta</h2>
      <p className="mt-2">apaga de vez seu perfil, foto, contatos, consentimentos e conexões. não dá para desfazer.</p>
      <div className="mt-4 max-w-sm">
        <CampoTexto rotulo='para confirmar, escreva "excluir"' value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
      </div>
      <div className="mt-4">
        <Botao variante="perigo" disabled={confirmacao.trim().toLowerCase() !== 'excluir'} carregando={excluindo} onClick={excluirConta}>
          excluir minha conta e meus dados
        </Botao>
      </div>
    </section>
  )

  if (!perfil) {
    return (
      <Pagina titulo="minha conta">
        <Titulo>minha conta</Titulo>
        <p>você entrou como {session?.user.email}, mas ainda não terminou o cadastro.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <BotaoLink to="/cadastro">terminar cadastro</BotaoLink>
          <Botao variante="secundario" onClick={sair}>sair</Botao>
        </div>
        {msg && <div className="mt-6"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}
        {blocoExcluir}
      </Pagina>
    )
  }
  if (!form) return <Carregando />

  const muda = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const v = perfilSchema.safeParse({ ...form, conquista: form!.conquista ?? '' })
    const errs = v.success ? {} : errosPorCampo(v.error)
    if (!emailSchema.safeParse(email).success) errs.email = 'confira o e-mail'
    const l = linkedinSchema.safeParse(linkedin)
    if (!l.success) errs.linkedin = l.error.issues[0].message
    setErros(errs)
    if (Object.keys(errs).length) return

    setSalvando(true)
    const p = v.data!
    const [r1, r2, r3] = await Promise.all([
      supabase.from('profiles').update({
        apelido: p.apelido,
        de_onde_vem: p.de_onde_vem,
        onde_esta: p.onde_esta,
        area_interesse: p.area_interesse,
        objetivo_12_meses: p.objetivo_12_meses,
        conquista: p.conquista || null,
        forma_conexao: p.forma_conexao,
      }).eq('id', perfil!.id),
      supabase.from('contacts').update({ email: email.trim(), linkedin_url: linkedin.trim() }).eq('profile_id', perfil!.id),
      supabase.from('consents').update({ aceita_ser_recomendada: recomendavel }).eq('profile_id', perfil!.id),
    ])
    setSalvando(false)
    const erro = r1.error || r2.error || r3.error
    setMsg(erro ? { tipo: 'erro', texto: mensagemAmigavel(erro) } : { tipo: 'ok', texto: 'tudo salvo.' })
    recarregar()
  }

  async function trocarFoto(f: File | undefined) {
    if (!f) return
    const problema = validarFoto(f)
    if (problema) return setMsg({ tipo: 'erro', texto: problema })
    try {
      const novo = await enviarFoto(session!.user.id, f)
      const antigo = perfil!.foto_path
      const { error } = await supabase.from('profiles').update({ foto_path: novo }).eq('id', perfil!.id)
      if (error) throw error
      if (antigo) await apagarFoto(antigo)
      setMsg({ tipo: 'ok', texto: 'foto atualizada.' })
      recarregar()
    } catch (err) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(err, 'não conseguimos enviar a foto agora.') })
    }
  }

  async function removerFoto() {
    if (!perfil!.foto_path) return
    const antigo = perfil!.foto_path
    const { error } = await supabase.from('profiles').update({ foto_path: null }).eq('id', perfil!.id)
    if (!error) await apagarFoto(antigo)
    recarregar()
  }

  async function alternarPausa() {
    const novo = perfil!.status === 'pausado' ? 'aprovado' : 'pausado'
    const { error } = await supabase.from('profiles').update({ status: novo }).eq('id', perfil!.id)
    setMsg(error ? { tipo: 'erro', texto: mensagemAmigavel(error) } : { tipo: 'ok', texto: novo === 'pausado' ? 'perfil pausado.' : 'bem-vinda de volta!' })
    recarregar()
  }

  return (
    <Pagina titulo="minha conta">
      <Titulo sub={<>código {perfil.codigo} · perfil {STATUS[perfil.status]}</>}>minha conta</Titulo>
      {msg && <div className="mb-6"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}

      <section aria-labelledby="foto" className="mb-12">
        <h2 id="foto" className="sr-only">foto</h2>
        <div className="flex items-center gap-5">
          <Avatar apelido={perfil.apelido} fotoPath={perfil.foto_path} tamanho={88} />
          <div className="flex flex-col gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-destaque px-5 font-titulo font-semibold lowercase text-destaque focus-within:outline focus-within:outline-3 focus-within:outline-offset-3">
              {perfil.foto_path ? 'trocar foto' : 'adicionar foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => trocarFoto(e.target.files?.[0])} />
            </label>
            {perfil.foto_path && (
              <button type="button" onClick={removerFoto} className="text-sm text-suave underline underline-offset-4">remover foto</button>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={salvar} noValidate className="space-y-8">
        <CampoTexto rotulo="como você quer aparecer" value={form.apelido} maxLength={LIMITES.apelido} onChange={(e) => muda('apelido', e.target.value)} erro={erros.apelido} />
        <CampoArea rotulo="de onde você vem" value={form.de_onde_vem} maxLength={LIMITES.de_onde_vem} onChange={(e) => muda('de_onde_vem', e.target.value)} erro={erros.de_onde_vem} />
        <Escolha
          nome="onde_esta"
          rotulo="onde você está agora"
          valor={form.onde_esta}
          aoMudar={(v) => muda('onde_esta', v)}
          erro={erros.onde_esta}
          opcoes={(Object.keys(ROTULO_ONDE_ESTA) as OndeEsta[]).map((v) => ({ valor: v, rotulo: ROTULO_ONDE_ESTA[v] }))}
        />
        <CampoTexto rotulo="área que te interessa" value={form.area_interesse} maxLength={LIMITES.area_interesse} onChange={(e) => muda('area_interesse', e.target.value)} erro={erros.area_interesse} />
        <CampoArea rotulo="aonde quer chegar em 12 meses" value={form.objetivo_12_meses} maxLength={LIMITES.objetivo_12_meses} onChange={(e) => muda('objetivo_12_meses', e.target.value)} erro={erros.objetivo_12_meses} />
        <CampoArea rotulo="uma conquista (opcional)" value={form.conquista ?? ''} maxLength={LIMITES.conquista} onChange={(e) => muda('conquista', e.target.value)} erro={erros.conquista} />
        <Escolha
          nome="forma_conexao"
          rotulo="como prefere se conectar"
          valor={form.forma_conexao}
          aoMudar={(v) => muda('forma_conexao', v)}
          opcoes={(Object.keys(ROTULO_FORMA) as FormaConexao[]).map((v) => ({ valor: v, rotulo: ROTULO_FORMA[v] }))}
        />
        <CampoTexto rotulo="e-mail para contato" type="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
        <CampoTexto rotulo="linkedin" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} erro={erros.linkedin} />
        <Caixinha marcado={recomendavel} aoMudar={setRecomendavel}>
          aceito ser recomendada como aliada para outras mulheres.
        </Caixinha>
        <Botao type="submit" carregando={salvando}>salvar</Botao>
      </form>

      <section aria-labelledby="pausar" className="mt-14 border-t border-linha pt-8">
        <h2 id="pausar" className="font-titulo text-2xl font-bold text-destaque">dar um tempo</h2>
        {perfil.status === 'aprovado' || perfil.status === 'pausado' ? (
          <>
            <p className="mt-2 text-suave">pausado, seu perfil some das recomendações. suas conexões aceitas continuam.</p>
            <div className="mt-4">
              <Botao variante="secundario" onClick={alternarPausa}>{perfil.status === 'pausado' ? 'voltar a aparecer' : 'pausar meu perfil'}</Botao>
            </div>
          </>
        ) : (
          <p className="mt-2 text-suave">você pode pausar depois que seu perfil for aprovado.</p>
        )}
        <div className="mt-6">
          <Botao variante="discreto" onClick={sair}>sair da conta</Botao>
        </div>
      </section>

      {blocoExcluir}
    </Pagina>
  )
}
