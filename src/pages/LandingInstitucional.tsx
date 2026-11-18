import { useAuth } from "../lib/auth";
import { Link } from "react-router-dom";
import { BotaoLink } from "../components/Botao";
import { Pagina } from "../components/Pagina";
import { FONTE_LINKEDIN as LINKEDIN, FONTE_WEF as WEF } from "../lib/fontes";
import { FAQ } from "../lib/faq";
function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="ml-1 inline-block align-middle"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
// O conceito abre o "Como funciona"; no hero ele é opcional (para não repetir)
const CONCEITO_NO_HERO = false;

export default function LandingInstitucional() {
  const { session }=useAuth();
  return (
    <Pagina titulo="aliadas">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Conexões entre mulheres</p>
          <h1 id="hero-title">Uma conversa pode abrir novos caminhos.</h1>
          {/* duas versões para a titular escolher: com ou sem o conceito no hero */}
          {CONCEITO_NO_HERO && <p className="conceito">Não é apenas mentoria, é aliança.</p>}
          <p className="hero-description">
            Encontre uma mulher para conversar sobre o próximo passo da sua
            carreira e compartilhe o que você já sabe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <BotaoLink to={session ? "/" : "/entrar"}>Encontrar minha aliada</BotaoLink>
            <a className="text-link" href="#como-funciona">
              Como funciona
            </a>
          </div>
        </div>
        <div className="connection-art" aria-hidden="true">
          <svg viewBox="0 0 340 340" fill="none">
            <path
              d="M75 100C165 100 150 235 260 235M260 75C245 160 110 180 90 270M75 100C155 210 240 60 260 75"
              stroke="var(--linha)"
              strokeWidth="2"
            />
            <circle cx="75" cy="100" r="38" fill="var(--fundo)" stroke="var(--destaque)" strokeWidth="2" />
            <circle cx="260" cy="75" r="26" fill="var(--superficie)" stroke="var(--destaque)" strokeWidth="2" />
            <circle cx="260" cy="235" r="52" fill="var(--destaque)" />
            <circle cx="90" cy="270" r="20" fill="var(--fundo)" stroke="var(--destaque)" strokeWidth="2" />
            <circle cx="260" cy="235" r="12" fill="var(--sobre-destaque)" />
            <circle cx="175" cy="160" r="9" fill="var(--coral)" />
          </svg>
        </div>
      </section>
      <section className="institutional-section" aria-labelledby="why-title">
        <p className="eyebrow">Por que existimos</p>
        <h2 id="why-title">Conexões também fazem parte de uma carreira.</h2>
        <div className="editorial-copy">
          <p>
            Mas o acesso a redes profissionais ainda é desigual entre mulheres e
            homens.
          </p>
        </div>
        <div className="stats-grid">
          <article>
            <p className="stat-number">
              27% <span>menos chance, para elas</span>
            </p>
            <p>
              Em análise de dados do LinkedIn, mulheres no Brasil têm 27% menos probabilidade de possuir uma rede de contatos forte em comparação aos homens.
            </p>
            <a className="source-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              LinkedIn, 11/03/2020 <Arrow />
            </a>
          </article>
          <article>
            <p className="stat-number">
              97% <span>dos países: eles com mais conexões</span>
            </p>
            <p>
              Em 97% dos países analisados, os homens têm redes de conexões maiores que as mulheres.
            </p>
            <a className="source-link" href={WEF} target="_blank" rel="noopener noreferrer">
              Fórum Econômico Mundial, 2024 <Arrow />
            </a>
          </article>
        </div>
        <p className="mt-5 text-xs text-suave">Estudos históricos do LinkedIn (2020 e 2024). A força da rede considera tamanho e diversidade. Na fonte, 97% se refere a economias, incluindo países e territórios. Os dados contextualizam a desigualdade; a eficácia da aliadas depende de validação.</p>
      </section>
      <section id="como-funciona" className="institutional-section scroll-mt-28" aria-labelledby="solution-title">
        <p className="eyebrow">Como funciona</p>
        <h2 id="solution-title">Não é apenas mentoria, é aliança.</h2>
        <div className="editorial-copy">
          <p>
            Na mentoria, alguém com mais experiência guia alguém com menos.
            Aqui, qualquer mulher pode apoiar outra, em qualquer momento da
            carreira, lado a lado.
          </p>
        </div>
        <ol className="steps-list">
          {["Escolha o objetivo.", "Escreva seu objetivo, revise as habilidades sugeridas pela IA e encontre quem pode ajudar.", "Depois do aceite, conversem por onde preferirem."].map((passo, i) => (
            <li key={passo}>
              <span className="step-number" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{passo}</h3>
            </li>
          ))}
        </ol>
      </section>
      <section className="institutional-section" aria-labelledby="audience-title">
        <p className="eyebrow">Para quem é</p>
        <h2 id="audience-title">Duas formas de participar.</h2>
        <div className="mt-8 grid gap-9 sm:grid-cols-2">
          <div className="border-l-2 border-coral pl-5">
            <h3>Quer uma conversa</h3>
            <p className="mt-3 text-suave">
              Para se preparar para uma entrevista, pedir feedback ou pensar no
              próximo passo.
            </p>
          </div>
          <div className="border-l-2 border-campo pl-5">
            <h3>Pode ajudar</h3>
            <p className="mt-3 text-suave">
              Para ajudar outra mulher com o que você já viveu.
            </p>
          </div>
        </div>
        <p className="mt-7">
          Dá para estar dos dois lados. Para nós mulheres.
        </p>
      </section>
      <section id="perguntas" className="institutional-section scroll-mt-28" aria-labelledby="faq-title">
        <p className="eyebrow">Perguntas rápidas</p>
        <h2 id="faq-title">Antes de começar.</h2>
        <div className="mt-8 divide-y divide-linha border-y border-linha">
          {FAQ.map((f) => (
            <details key={f.q} className="faq group">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-xl text-destaque transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-suave">{f.a}{f.q === "A IA vê meus dados?" && <> <Link to="/termos-e-privacidade#ia" className="text-link">Saiba mais</Link></>}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="final-call" aria-labelledby="final-title">
        <h2 id="final-title">Sua próxima conversa começa aqui.</h2>
        <BotaoLink to={session ? "/" : "/entrar"}>Encontrar minha aliada</BotaoLink>
        <p className="mt-4 text-sm text-suave">Todas nós temos algo a ensinar e muito a aprender.</p>
      </section>
    </Pagina>
  );
}
