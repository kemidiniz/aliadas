import { useCallback, useEffect, useState } from 'react'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao } from '../components/Botao'
import { Denunciar } from '../components/Denunciar'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { formasTexto, type Conexao, type Contato, type Perfil } from '../lib/tipos'
import { trajetoriaCurta } from './MinhasAliadas'

type Item = Conexao & { outra: Perfil | null; contato: Contato | null }

export default function Conexoes() {
  const { session } = useAuth()
  const eu = session!.user.id
  const [itens, setItens] = useState<Item[] | null>(null)
  const [erro, setErro] = useState('')
  const [respondendo, setRespondendo] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data: cs } = await supabase.from('connections').select('*').order('created_at', { ascending: false })
    const lista = (cs as Conexao[]) ?? []
    const ids = lista.map((c) => (c.de_profile_id === eu ? c.para_profile_id : c.de_profile_id))
    const [{ data: ps }, { data: cts }] = ids.length
      ? await Promise.all([
          supabase.from('profiles').select('*').in('id', ids),
          // o RLS só devolve contatos de conexões ACEITAS
          supabase.from('contacts').select('*').in('profile_id', ids),
        ])
      : [{ data: [] }, { data: [] }]
    const perfis = new Map((ps as Perfil[]).map((p) => [p.id, p]))
    const contatos = new Map((cts as Contato[]).map((c) => [c.profile_id, c]))
    setItens(
      lista.map((c) => {
        const outraId = c.de_profile_id === eu ? c.para_profile_id : c.de_profile_id
        return { ...c, outra: perfis.get(outraId) ?? null, contato: contatos.get(outraId) ?? null }
      }),
    )
  }, [eu])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function responder(id: string, aceitar: boolean) {
    setRespondendo(id)
    setErro('')
    const { error } = await supabase.rpc('responder_conexao', { p_conexao: id, p_aceitar: aceitar })
    setRespondendo(null)
    if (error) setErro(mensagemAmigavel(error))
    carregar()
  }

  if (!itens) return <Carregando />

  const recebidas = itens.filter((c) => c.para_profile_id === eu && c.status === 'pendente')
  const conectadas = itens.filter((c) => c.status === 'aceita')
  const enviadas = itens.filter((c) => c.de_profile_id === eu && c.status === 'pendente')

  return (
    <Pagina titulo="conexões">
      <Titulo sub="o contato só aparece quando as duas aceitam.">conexões</Titulo>
      {erro && <div className="mb-6"><Aviso tipo="erro">{erro}</Aviso></div>}

      <section aria-labelledby="recebidas" className="mb-12">
        <h2 id="recebidas" className="font-titulo text-2xl font-bold text-destaque">pedidos para você</h2>
        {recebidas.length === 0 ? (
          <p className="mt-3 text-suave">nenhum pedido novo por aqui.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {recebidas.map((c) => (
              <li key={c.id} className="rounded-3xl border border-linha p-6">
                {c.outra && (
                  <div className="flex items-start gap-4">
                    <Avatar apelido={c.outra.apelido} fotoPath={c.outra.foto_path} />
                    <div>
                      <p className="font-titulo text-xl font-semibold">{c.outra.apelido} quer se conectar com você</p>
                      <p className="mt-1 text-suave">{trajetoriaCurta(c.outra)}</p>
                    </div>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Botao onClick={() => responder(c.id, true)} carregando={respondendo === c.id}>aceitar</Botao>
                  <Botao variante="secundario" onClick={() => responder(c.id, false)} disabled={respondendo === c.id}>agora não</Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="conectadas" className="mb-12">
        <h2 id="conectadas" className="font-titulo text-2xl font-bold text-destaque">conectadas</h2>
        {conectadas.length === 0 ? (
          <p className="mt-3 text-suave">quando uma conexão for aceita, o contato aparece aqui.</p>
        ) : (
          <>
            <div className="mt-4">
              <Aviso>sugerimos começar por uma chamada. encontro presencial? lugar público e avise alguém.</Aviso>
            </div>
            <ul className="mt-4 space-y-4">
              {conectadas.map((c) => (
                <li key={c.id} className="rounded-3xl border-2 border-destaque p-6">
                  {c.outra && (
                    <div className="flex items-start gap-4">
                      <Avatar apelido={c.outra.apelido} fotoPath={c.outra.foto_path} />
                      <div className="min-w-0">
                        <p className="font-titulo text-xl font-semibold">{c.outra.apelido}</p>
                        <p className="text-sm text-suave">prefere: {formasTexto(c.outra.formas_conexao)}</p>
                      </div>
                    </div>
                  )}
                  {c.contato ? (
                    <dl className="mt-4 space-y-2 break-words">
                      <div>
                        <dt className="text-sm text-suave">e-mail</dt>
                        <dd><a className="text-destaque underline underline-offset-4" href={`mailto:${c.contato.email}`}>{c.contato.email}</a></dd>
                      </div>
                      {c.contato.linkedin_url && (
                        <div>
                          <dt className="text-sm text-suave">linkedin</dt>
                          <dd><a className="text-destaque underline underline-offset-4" href={c.contato.linkedin_url} target="_blank" rel="noopener noreferrer">{c.contato.linkedin_url}</a></dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-4 text-suave">o contato dela não está disponível agora.</p>
                  )}
                  {c.outra && <div className="mt-4"><Denunciar perfilId={c.outra.id} apelido={c.outra.apelido} /></div>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="enviadas">
        <h2 id="enviadas" className="font-titulo text-2xl font-bold text-destaque">pedidos que você enviou</h2>
        {enviadas.length === 0 ? (
          <p className="mt-3 text-suave">nenhum pedido aguardando resposta.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {enviadas.map((c) => (
              <li key={c.id} className="flex items-center gap-4 rounded-2xl border border-linha p-4">
                {c.outra && <Avatar apelido={c.outra.apelido} fotoPath={c.outra.foto_path} tamanho={44} />}
                <p>{c.outra?.apelido ?? 'aliada'}: aguardando resposta</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Pagina>
  )
}
