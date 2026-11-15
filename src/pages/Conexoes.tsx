import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao, BotaoLink } from '../components/Botao'
import { Denunciar } from '../components/Denunciar'
import { Pagina, Titulo } from '../components/Pagina'
import { Abas, Acao, Cartao, Chips, Selo, Vazio, tempoRelativo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { ROTULO_FORMA, ROTULO_ONDE_ESTA, type Conexao, type Contato, type Perfil } from '../lib/tipos'

type Item = Conexao & { outra: Perfil | null; contato: Contato | null }
type Aba = 'recebidos' | 'conectadas' | 'enviados'

function Cabeca({ p, selo }: { p: Perfil; selo: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <Avatar apelido={p.apelido} fotoPath={p.foto_path} tamanho={56} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-titulo text-xl font-bold text-texto">{p.apelido}</p>
          {selo}
        </div>
        <p className="mt-0.5 text-sm text-suave">{ROTULO_ONDE_ESTA[p.onde_esta]}</p>
      </div>
    </div>
  )
}

export default function Conexoes() {
  const { session } = useAuth()
  const eu = session!.user.id
  const [itens, setItens] = useState<Item[] | null>(null)
  const [erro, setErro] = useState('')
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba | null>(null)

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
    else if (aceitar) setAba('conectadas')
    carregar()
  }

  if (!itens) return <Carregando />

  const recebidos = itens.filter((c) => c.para_profile_id === eu && c.status === 'pendente')
  const conectadas = itens.filter((c) => c.status === 'aceita')
  const enviados = itens.filter((c) => c.de_profile_id === eu && c.status === 'pendente')
  // abre na aba que tem novidade
  const abaAtual: Aba = aba ?? (recebidos.length ? 'recebidos' : conectadas.length ? 'conectadas' : 'enviados')

  return (
    <Pagina titulo="conexões" largura="max-w-4xl">
      <Titulo sub="o contato só aparece quando as duas aceitam.">conexões</Titulo>
      {erro && <div className="mb-6"><Aviso tipo="erro">{erro}</Aviso></div>}

      <Abas
        rotulo="conexões"
        atual={abaAtual}
        aoMudar={setAba}
        abas={[
          { id: 'recebidos', rotulo: 'pedidos', contagem: recebidos.length },
          { id: 'conectadas', rotulo: 'conectadas', contagem: conectadas.length },
          { id: 'enviados', rotulo: 'enviados', contagem: enviados.length },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div key={abaAtual} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {abaAtual === 'recebidos' &&
            (recebidos.length === 0 ? (
              <Vazio titulo="nenhum pedido novo">quando alguém quiser se conectar com você, o pedido aparece aqui.</Vazio>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {recebidos.map((c) => c.outra && (
                  <li key={c.id}>
                    <Cartao className="flex h-full flex-col gap-4">
                      <Cabeca p={c.outra} selo={<Selo tom="destaque">quer se conectar</Selo>} />
                      <p className="line-clamp-4 text-texto">{c.outra.resumo ?? c.outra.de_onde_vem}</p>
                      <Chips itens={c.outra.areas} rotulo="áreas de interesse" />
                      <p className="text-xs text-suave">pedido {tempoRelativo(c.created_at)}</p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Botao onClick={() => responder(c.id, true)} carregando={respondendo === c.id}>aceitar</Botao>
                        <Botao variante="secundario" onClick={() => responder(c.id, false)} disabled={respondendo === c.id}>agora não</Botao>
                      </div>
                    </Cartao>
                  </li>
                ))}
              </ul>
            ))}

          {abaAtual === 'conectadas' &&
            (conectadas.length === 0 ? (
              <Vazio titulo="nenhuma conexão ainda">quando uma conexão for aceita pelas duas, o contato aparece aqui.</Vazio>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3 rounded-2xl bg-superficie px-4 py-3">
                  <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />
                  <p>
                    <strong className="font-titulo">dica de segurança:</strong> comece por uma chamada. encontro presencial? lugar público e avise alguém.
                  </p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {conectadas.map((c) => c.outra && (
                    <li key={c.id}>
                      <Cartao destaque className="flex h-full flex-col gap-4">
                        <Cabeca p={c.outra} selo={<Selo tom="suave">conectadas</Selo>} />
                        <div>
                          <p className="mb-2 font-titulo text-sm font-semibold lowercase text-suave">prefere</p>
                          <Chips itens={c.outra.formas_conexao.map((f) => ROTULO_FORMA[f])} rotulo="formas de conexão" />
                        </div>
                        {c.contato ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Acao href={`mailto:${c.contato.email}`}>enviar e-mail</Acao>
                              {c.contato.linkedin_url && (
                                <Acao href={c.contato.linkedin_url} externo>
                                  abrir linkedin<span className="sr-only"> (abre em outra aba)</span>
                                </Acao>
                              )}
                            </div>
                            <p className="break-all text-sm text-suave">{c.contato.email}</p>
                          </div>
                        ) : (
                          <p className="text-suave">o contato dela não está disponível agora.</p>
                        )}
                        <div className="mt-auto border-t border-linha pt-3">
                          <Denunciar perfilId={c.outra.id} apelido={c.outra.apelido} />
                        </div>
                      </Cartao>
                    </li>
                  ))}
                </ul>
              </>
            ))}

          {abaAtual === 'enviados' &&
            (enviados.length === 0 ? (
              <Vazio titulo="nenhum pedido aguardando">
                <p>encontre suas aliadas e peça para se conectar.</p>
                <div className="mt-4"><BotaoLink to="/minhas-aliadas" variante="secundario">minhas aliadas</BotaoLink></div>
              </Vazio>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {enviados.map((c) => c.outra && (
                  <li key={c.id}>
                    <Cartao className="flex items-center gap-4">
                      <Avatar apelido={c.outra.apelido} fotoPath={c.outra.foto_path} tamanho={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-titulo font-semibold">{c.outra.apelido}</p>
                        <p className="text-xs text-suave">enviado {tempoRelativo(c.created_at)}</p>
                      </div>
                      <Selo tom="suave">aguardando</Selo>
                    </Cartao>
                  </li>
                ))}
              </ul>
            ))}
        </motion.div>
      </AnimatePresence>
    </Pagina>
  )
}
