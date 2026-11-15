import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao, BotaoLink } from '../components/Botao'
import { Caixinha, CampoArea, CampoTexto, Escolha, MultiEscolha } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { emailSchema, errosPorCampo, LIMITES, linkedinSchema, perfilSchema, senhaSchema } from '../lib/esquemas'
import { mensagemAmigavel } from '../lib/erros'
import { CHAVE_NOVA_SENHA } from '../lib/auth'
import { apagarFoto, enviarFoto, validarFoto } from '../lib/fotos'
import { supabase } from '../lib/supabase'
import { AREAS, ROTULO_FORMA, ROTULO_ONDE_ESTA, type FormaConexao, type OndeEsta, type Perfil } from '../lib/tipos'

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
  // chegou pelo "esqueci a senha": mostra o campo de senha nova
  const [criandoSenhaNova] = useState(() => Boolean(sessionStorage.getItem(CHAVE_NOVA_SENHA)))
  useEffect(() => {
    if (!criandoSenhaNova) return
    const t = setTimeout(() => document.getElementById('senha')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400)
    return () => clearTimeout(t)
  }, [criandoSenhaNova])
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [novaArea, setNovaArea] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  async function salvarSenha(e: FormEvent) {
    e.preventDefault()
    const v = senhaSchema.safeParse(senha)
    if (!v.success) return setErroSenha(v.error.issues[0].message)
    if (senha !== senha2) return setErroSenha('as duas senhas não são iguais')
    setErroSenha('')
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvandoSenha(false)
    if (error) {
      setErroSenha(
        error.code === 'weak_password'
          ? 'essa senha é fraca ou já apareceu em vazamentos. tente outra.'
          : error.code === 'same_password'
            ? 'essa já é a sua senha atual.'
            : 'não conseguimos salvar a senha agora. tente de novo.',
      )
      return
    }
    setSenha('')
    setSenha2('')
    sessionStorage.removeItem(CHAVE_NOVA_SENHA)
    setMsg({ tipo: 'ok', texto: 'senha salva. agora você pode entrar com e-mail e senha, ou com código.' })
  }

  const blocoSenha = (
    <section aria-labelledby="senha" className="mt-14 border-t border-linha pt-8">
      <h2 id="senha" className="font-titulo text-2xl font-bold text-destaque">senha</h2>
      {criandoSenhaNova
        ? <div className="mt-3"><Aviso tipo="ok">pronto, você entrou. agora é só criar sua senha nova aqui embaixo.</Aviso></div>
        : <p className="mt-2 text-suave">opcional. com senha você entra direto; sem senha, entra com um código enviado ao seu e-mail.</p>}
      <form onSubmit={salvarSenha} noValidate className="mt-4 w-full space-y-4">
        <CampoTexto rotulo="nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} ajuda="pelo menos 8 caracteres." />
        <CampoTexto rotulo="repita a senha" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} erro={erroSenha} />
        <Botao type="submit" variante="secundario" carregando={salvandoSenha}>salvar senha</Botao>
      </form>
    </section>
  )

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
      <div className="mt-4 w-full">
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
        {blocoSenha}
        {blocoExcluir}
      </Pagina>
    )
  }
  if (!form) return <Carregando />

  const muda = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const v = perfilSchema.safeParse(form)
    const errs = v.success ? {} : errosPorCampo(v.error)
    if (!emailSchema.safeParse(email).success) errs.email = 'confira o e-mail'
    if (linkedin.trim()) {
      const l = linkedinSchema.safeParse(linkedin)
      if (!l.success) errs.linkedin = l.error.issues[0].message
    }
    setErros(errs)
    if (Object.keys(errs).length) return

    setSalvando(true)
    const p = v.data!
    const [r1, r2, r3] = await Promise.all([
      supabase.from('profiles').update({
        apelido: p.apelido,
        de_onde_vem: p.de_onde_vem,
        onde_esta: p.onde_esta,
        areas: p.areas,
        formas_conexao: p.formas_conexao,
      }).eq('id', perfil!.id),
      supabase.from('contacts').update({ email: email.trim(), linkedin_url: linkedin.trim() || null }).eq('profile_id', perfil!.id),
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
      <Titulo sub={<>seu perfil está {STATUS[perfil.status]}.</>}>minha conta</Titulo>
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
        <div className="space-y-3">
          <MultiEscolha
            rotulo="áreas que te interessam"
            valores={form.areas}
            aoMudar={(v) => muda('areas', v)}
            erro={erros.areas}
            opcoes={[...new Set([...AREAS, ...form.areas])].map((a) => ({ valor: a, rotulo: a }))}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <CampoTexto rotulo="adicionar outra área" value={novaArea} maxLength={LIMITES.area} onChange={(e) => setNovaArea(e.target.value)} />
            </div>
            <Botao
              type="button"
              variante="secundario"
              className="mb-7"
              onClick={() => {
                const a = novaArea.trim()
                if (a.length >= 2 && !form.areas.includes(a)) muda('areas', [...form.areas, a])
                setNovaArea('')
              }}
            >
              adicionar
            </Botao>
          </div>
        </div>
        <MultiEscolha
          rotulo="como prefere se conectar"
          valores={form.formas_conexao}
          aoMudar={(v) => muda('formas_conexao', v)}
          erro={erros.formas_conexao}
          opcoes={(Object.keys(ROTULO_FORMA) as FormaConexao[]).map((v) => ({ valor: v, rotulo: ROTULO_FORMA[v] }))}
        />
        <CampoTexto rotulo="e-mail para contato" type="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
        <CampoTexto rotulo="linkedin (opcional)" ajuda={perfil.status === 'pendente' ? 'adicionando seu linkedin, seu perfil entra na hora.' : undefined} type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} erro={erros.linkedin} />
        <Caixinha marcado={recomendavel} aoMudar={setRecomendavel}>
          aceito aparecer na busca e ser recomendada como aliada para outras mulheres da comunidade.
        </Caixinha>
        <Botao type="submit" carregando={salvando}>salvar</Botao>
      </form>

      <section aria-labelledby="pausar" className="mt-14 border-t border-linha pt-8">
        <h2 id="pausar" className="font-titulo text-2xl font-bold text-destaque">dar um tempo</h2>
        {perfil.status === 'aprovado' || perfil.status === 'pausado' ? (
          <>
            <p className="mt-2 text-suave">pausado, seu perfil deixa de aparecer como aliada para outras pessoas. suas conexões aceitas continuam.</p>
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

      {blocoSenha}
      {blocoExcluir}
    </Pagina>
  )
}
