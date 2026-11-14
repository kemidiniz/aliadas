import { BotaoLink } from '../components/Botao'
import { Pagina } from '../components/Pagina'
import { Revelar } from '../components/Revelar'
import { FONTES } from '../lib/fontes'
import { useAuth } from '../lib/auth'

const PASSOS = [
  { n: '1', titulo: 'você conta sua trajetória', texto: 'de onde vem, onde está e aonde quer chegar. leva uns 5 minutos.' },
  { n: '2', titulo: 'a gente apresenta suas aliadas', texto: 'mulheres com um caminho parecido, alguns passos à frente.' },
  { n: '3', titulo: 'vocês decidem se conectar', texto: 'o contato só aparece quando as duas aceitam.' },
]

export default function Home() {
  const { session, perfil } = useAuth()
  const destino = !session ? '/entrar' : perfil ? '/minhas-aliadas' : '/cadastro'

  return (
    <Pagina titulo="aliadas" largura="max-w-5xl">
      {/* hero */}
      <section className="grid items-center gap-10 py-6 sm:py-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-titulo text-4xl font-bold leading-tight text-destaque sm:text-6xl">
            você não precisa de uma ceo.
          </h1>
          <p className="mt-5 max-w-xl text-xl text-texto sm:text-2xl">
            precisa de alguém que estava onde você está há um ano.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BotaoLink to={destino}>encontrar minhas aliadas</BotaoLink>
            <BotaoLink to="/recomendacoes" variante="secundario">ver recomendações</BotaoLink>
          </div>
        </div>
        {/* formas simples: dois círculos que se tocam */}
        <div aria-hidden className="relative mx-auto hidden h-64 w-64 md:block">
          <span className="absolute left-0 top-6 h-44 w-44 rounded-full border-2 border-destaque" />
          <span className="absolute bottom-4 right-0 h-36 w-36 rounded-full border-2 border-coral" />
          <span className="absolute left-[46%] top-[48%] h-4 w-4 rounded-full bg-coral" />
        </div>
      </section>

      {/* como funciona */}
      <section aria-labelledby="como" className="border-t border-linha py-14">
        <Revelar>
          <h2 id="como" className="font-titulo text-3xl font-bold text-destaque">como funciona</h2>
        </Revelar>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {PASSOS.map((p, i) => (
            <Revelar key={p.n} atraso={i * 0.08}>
              <li className="list-none">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-coral font-titulo font-bold text-destaque">
                  {p.n}
                </span>
                <h3 className="mt-4 font-titulo text-xl font-semibold text-texto">{p.titulo}</h3>
                <p className="mt-2 text-suave">{p.texto}</p>
              </li>
            </Revelar>
          ))}
        </ol>
      </section>

      {/* quem somos */}
      <section aria-labelledby="quem" className="border-t border-linha py-14">
        <Revelar>
          <h2 id="quem" className="font-titulo text-3xl font-bold text-destaque">quem somos</h2>
        </Revelar>
        <div className="mt-8 grid gap-10 sm:grid-cols-3">
          <Revelar>
            <h3 className="font-titulo text-xl font-semibold">o problema</h3>
            <p className="mt-2 text-suave">quem começa em tecnologia vê poucas mulheres por perto. as referências que aparecem estão longe demais.</p>
          </Revelar>
          <Revelar atraso={0.08}>
            <h3 className="font-titulo text-xl font-semibold">pra quem é</h3>
            <p className="mt-2 text-suave">mulheres cis e trans e pessoas não binárias estudando, buscando a primeira vaga ou mudando de área.</p>
          </Revelar>
          <Revelar atraso={0.16}>
            <h3 className="font-titulo text-xl font-semibold">o que a gente faz</h3>
            <p className="mt-2 text-suave">o linkedin mostra mulheres famosas. a aliadas apresenta a mulher que estava onde você está há um ano.</p>
          </Revelar>
        </div>

        <dl className="mt-12 grid gap-8 sm:grid-cols-2">
          <Revelar>
            <div className="border-l-2 border-coral pl-5">
              <dt className="font-titulo text-5xl font-bold text-destaque">19,2%</dt>
              <dd className="mt-2 text-texto">
                dos cargos de tecnologia no brasil são ocupados por mulheres.{' '}
                <a className="text-sm text-suave underline underline-offset-4" href={FONTES.brasscom.url} target="_blank" rel="noopener noreferrer">
                  fonte: {FONTES.brasscom.texto}
                </a>
              </dd>
            </div>
          </Revelar>
          <Revelar atraso={0.08}>
            <div className="border-l-2 border-coral pl-5">
              <dt className="font-titulo text-5xl font-bold text-destaque">1 em 2</dt>
              <dd className="mt-2 text-texto">
                mulheres diz que faltam referências femininas na tecnologia.{' '}
                <a className="text-sm text-suave underline underline-offset-4" href={FONTES.girlsWhoCode.url} target="_blank" rel="noopener noreferrer">
                  fonte: {FONTES.girlsWhoCode.texto}
                </a>
              </dd>
            </div>
          </Revelar>
        </dl>
      </section>

      {/* dois chamados */}
      <section className="grid gap-6 border-t border-linha py-14 sm:grid-cols-2">
        <Revelar>
          <div className="h-full rounded-3xl bg-superficie p-8">
            <p className="font-titulo text-2xl font-semibold text-texto">você não precisa de uma ceo. precisa de alguém que estava onde você está há um ano.</p>
            <div className="mt-6"><BotaoLink to={destino}>encontrar minhas aliadas</BotaoLink></div>
          </div>
        </Revelar>
        <Revelar atraso={0.08}>
          <div className="h-full rounded-3xl border-2 border-destaque p-8">
            <p className="font-titulo text-2xl font-semibold text-texto">você já é referência para alguém. e talvez nem saiba.</p>
            <div className="mt-6"><BotaoLink to={destino} variante="secundario">quero ser aliada</BotaoLink></div>
          </div>
        </Revelar>
      </section>
    </Pagina>
  )
}
