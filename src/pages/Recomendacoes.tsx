import { useEffect, useMemo, useState } from 'react'
import { Carregando } from '../components/Aviso'
import { Pagina, Titulo } from '../components/Pagina'
import { Revelar } from '../components/Revelar'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Programa } from '../lib/tipos'

const TIPO: Record<Programa['tipo'], string> = { curso: 'curso', programa: 'programa', comunidade: 'comunidade' }

function CardPrograma({ p, motivo }: { p: Programa; motivo?: string }) {
  return (
    <li className={`list-none rounded-3xl p-6 ${motivo ? 'border-2 border-destaque' : 'border border-linha'}`}>
      <p className="text-sm text-suave">
        {TIPO[p.tipo]}
        {p.area ? ` · ${p.area}` : ''}
        {p.gratuito === true ? ' · gratuito' : ''}
      </p>
      <h3 className="mt-1 font-titulo text-xl font-bold text-texto">{p.nome}</h3>
      {p.organizacao && <p className="text-suave">{p.organizacao}</p>}
      {p.descricao_curta && <p className="mt-3">{p.descricao_curta}</p>}
      {motivo && (
        <p className="mt-4 border-l-2 border-coral pl-3">
          <span className="font-titulo text-sm font-semibold lowercase text-suave">por que pra você: </span>
          {motivo}
        </p>
      )}
      {p.url && (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center font-titulo font-semibold lowercase text-destaque underline underline-offset-4">
          conhecer<span className="sr-only"> {p.nome} (abre em outra aba)</span> →
        </a>
      )}
    </li>
  )
}

export default function Recomendacoes() {
  const { session, perfil } = useAuth()
  const [programas, setProgramas] = useState<Programa[] | null>(null)
  const [paraMim, setParaMim] = useState<Map<string, string>>(new Map())
  const [area, setArea] = useState('')

  useEffect(() => {
    supabase.from('programs').select('*').eq('ativo', true).order('nome').then(({ data }) => setProgramas((data as Programa[]) ?? []))
  }, [])

  useEffect(() => {
    if (!session || perfil?.status !== 'aprovado') return
    supabase.from('program_recommendations').select('program_id, motivo').then(({ data }) => {
      setParaMim(new Map((data ?? []).map((r) => [r.program_id, r.motivo])))
    })
  }, [session, perfil])

  const areas = useMemo(
    () => Array.from(new Set((programas ?? []).map((p) => p.area).filter((a): a is string => Boolean(a)))).sort(),
    [programas],
  )

  if (!programas) return <Carregando />
  const filtrados = programas.filter((p) => !area || p.area === area)
  const escolhidos = filtrados.filter((p) => paraMim.has(p.id))
  const outros = filtrados.filter((p) => !paraMim.has(p.id))

  return (
    <Pagina titulo="recomendações">
      <Titulo sub="cursos, programas e comunidades para mulheres em tecnologia, escolhidos pela curadoria e pela comunidade.">
        aliada, temos uma recomendação pra você!
      </Titulo>

      {areas.length > 0 && (
        <div className="mb-8 max-w-xs space-y-2">
          <label htmlFor="area" className="block font-titulo font-semibold">filtrar por área</label>
          <select id="area" value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-texto focus:border-destaque">
            <option value="">todas as áreas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      {filtrados.length === 0 && <p className="text-suave">a curadoria está preparando a lista. volte em breve.</p>}

      {escolhidos.length > 0 && (
        <section aria-labelledby="pra-voce" className="mb-12">
          <h2 id="pra-voce" className="mb-4 font-titulo text-2xl font-bold text-destaque">escolhidos para você</h2>
          <ul className="grid gap-5 sm:grid-cols-2">
            {escolhidos.map((p) => <CardPrograma key={p.id} p={p} motivo={paraMim.get(p.id)} />)}
          </ul>
        </section>
      )}

      {outros.length > 0 && (
        <section aria-labelledby="todos">
          {escolhidos.length > 0 && <h2 id="todos" className="mb-4 font-titulo text-2xl font-bold text-destaque">mais recomendações</h2>}
          <ul className="grid gap-5 sm:grid-cols-2">
            {outros.map((p, i) => (
              <Revelar key={p.id} atraso={Math.min(i, 6) * 0.05}>
                <CardPrograma p={p} />
              </Revelar>
            ))}
          </ul>
        </section>
      )}
    </Pagina>
  )
}
