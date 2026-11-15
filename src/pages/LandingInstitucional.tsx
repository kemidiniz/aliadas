import { BotaoLink } from "../components/Botao";
import { Pagina } from "../components/Pagina";
const LINKEDIN =
  "https://www.linkedin.com/business/talent/blog/talent-acquisition/women-less-likely-to-have-strong-networks";
const WEF =
  "https://www.weforum.org/publications/global-gender-gap-report-2024/economic-and-leadership-gaps-constraining-growth-and-skewing-transitions-7b05a512cb";
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
export default function LandingInstitucional() {
  return (
    <Pagina titulo="aliadas">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Conexões profissionais com propósito</p>
          <h1 id="hero-title">Uma conversa pode abrir novos caminhos.</h1>
          <p className="hero-description">
            Conectamos mulheres de diferentes áreas e momentos de carreira para
            compartilhar experiências, trocar ideias e avançar em seus objetivos
            profissionais.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <BotaoLink to="/entrar">Encontrar minha aliada</BotaoLink>
            <a className="text-link" href="#quem-somos">
              Conheça o Aliadas <Arrow />
            </a>
          </div>
          <p className="mt-5 text-sm text-suave">
            Diferentes trajetórias. Uma troca com intenção.
          </p>
        </div>
        <div className="connection-art" aria-hidden="true">
          <div className="art-label">Trajetórias que se encontram</div>
          <svg viewBox="0 0 340 340" fill="none">
            <path
              d="M75 100C165 100 150 235 260 235M260 75C245 160 110 180 90 270M75 100C155 210 240 60 260 75"
              stroke="var(--linha)"
              strokeWidth="2"
            />
            <circle
              cx="75"
              cy="100"
              r="38"
              fill="var(--fundo)"
              stroke="var(--destaque)"
              strokeWidth="2"
            />
            <circle
              cx="260"
              cy="75"
              r="26"
              fill="var(--superficie)"
              stroke="var(--destaque)"
              strokeWidth="2"
            />
            <circle cx="260" cy="235" r="52" fill="var(--destaque)" />
            <circle
              cx="90"
              cy="270"
              r="20"
              fill="var(--fundo)"
              stroke="var(--destaque)"
              strokeWidth="2"
            />
            <circle cx="260" cy="235" r="12" fill="var(--sobre-destaque)" />
            <circle cx="175" cy="160" r="9" fill="var(--coral)" />
          </svg>
          <span className="art-caption">
            Experiências + perspectivas + possibilidades
          </span>
        </div>
      </section>
      <section className="institutional-section" aria-labelledby="why-title">
        <p className="eyebrow">Por que existimos?</p>
        <h2 id="why-title">Conexões também fazem parte de uma carreira.</h2>
        <div className="editorial-copy">
          <p>
            Construir uma trajetória profissional não depende apenas dos
            conhecimentos que adquirimos. As pessoas que conhecemos e as
            experiências que compartilhamos também podem abrir novos caminhos.
          </p>
          <p>
            Mas o acesso às redes profissionais ainda é desigual entre mulheres
            e homens.
          </p>
        </div>
        <div className="stats-grid">
          <article>
            <p className="stat-number">
              27% <span>Brasil</span>
            </p>
            <p>
              Em análise de dados do LinkedIn, mulheres no Brasil tinham 27%
              menos probabilidade de possuir uma rede profissional forte em
              comparação aos homens.
            </p>
            <a
              className="source-link"
              href={LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn · 11/03/2020 <Arrow />
            </a>
            <p className="source-context">
              Análise histórica de membros do LinkedIn. A força da rede
              considera o tamanho e a diversidade das conexões; não é uma
              medição de 2026.
            </p>
          </article>
          <article>
            <p className="stat-number">
              97% <span>Global</span>
            </p>
            <p>
              Em 97% das economias analisadas, os homens tinham redes de
              conexões maiores que as mulheres no LinkedIn.
            </p>
            <a
              className="source-link"
              href={WEF}
              target="_blank"
              rel="noopener noreferrer"
            >
              Fórum Econômico Mundial · Global Gender Gap Report 2024 <Arrow />
            </a>
            <p className="source-context">
              Proporção de economias analisadas, não porcentagem de mulheres.
            </p>
          </article>
        </div>
        <p className="mt-8 text-xl font-semibold text-destaque">
          É para aproximar trajetórias que o Aliadas existe.
        </p>
        <p className="mt-3 text-suave">
          Uma plataforma que facilita conexões entre mulheres para conversas
          profissionais com objetivos definidos.
        </p>
        <p className="mt-4 text-sm text-suave">
          Esses estudos contextualizam a desigualdade nas redes profissionais.
          Não comprovam a eficácia do Aliadas; a necessidade específica da
          plataforma é uma hipótese a validar com usuárias.
        </p>
      </section>
      <section
        id="quem-somos"
        className="institutional-section scroll-mt-28"
        aria-labelledby="about-title"
      >
        <p className="eyebrow">Nossa iniciativa</p>
        <h2 id="about-title">Quem somos?</h2>
        <div className="editorial-copy">
          <p>
            O Aliadas é uma iniciativa de impacto social criada durante a
            formação em Inteligência Artificial Aplicada da {"{reprograma}"}.
          </p>
          <p>
            Acreditamos que diferentes trajetórias podem gerar aprendizados
            valiosos quando existe espaço para compartilhar experiências.
          </p>
          <p>
            Nossa proposta é tornar as conexões profissionais mais simples,
            acessíveis e intencionais.
          </p>
        </div>
        <p className="mt-5 text-sm text-suave">
          Projeto independente de formação. A {"{reprograma}"} não administra
          nem patrocina a plataforma.
        </p>
      </section>
      <section
        className="institutional-section"
        aria-labelledby="audience-title"
      >
        <p className="eyebrow">Duas formas de participar</p>
        <h2 id="audience-title">O Aliadas é para você que...</h2>
        <div className="mt-8 grid gap-9 sm:grid-cols-2">
          <div className="border-l-2 border-coral pl-5">
            <h3>Busca uma troca</h3>
            <p className="mt-3 text-suave">
              Quer preparar uma entrevista, conversar sobre carreira, receber
              feedback sobre um portfólio ou projeto e conhecer outras
              perspectivas.
            </p>
          </div>
          <div className="border-l-2 border-campo pl-5">
            <h3>Quer compartilhar</h3>
            <p className="mt-3 text-suave">
              Está aberta a dividir experiências, conhecimentos e aprendizados
              profissionais.
            </p>
          </div>
        </div>
        <p className="mt-7">
          A mesma participante pode atuar das duas formas. Para mulheres cis e
          trans e pessoas não binárias, de todas as áreas e momentos de
          carreira.
        </p>
      </section>
      <section
        id="como-funciona"
        className="institutional-section scroll-mt-28"
        aria-labelledby="solution-title"
      >
        <p className="eyebrow">Nossa solução</p>
        <h2 id="solution-title">Conexões profissionais com propósito.</h2>
        <ol className="steps-list">
          {[
            {
              title: "Escolha um objetivo",
              text: "Defina o assunto da conversa.",
            },
            {
              title: "Encontre uma aliada",
              text: "Receba uma indicação relevante e sugestões preparadas com IA, quando disponível e autorizada.",
            },
            {
              title: "Compartilhe experiências",
              text: "Após o aceite mútuo, escolha o canal e realize a conversa.",
            },
          ].map((step, i) => (
            <li key={step.title}>
              <span className="step-number" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p className="mt-3 text-suave">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-7 text-sm text-suave">
          A indicação não garante um encontro. A mensagem é revisada por você e
          o convite depende da decisão das duas. Sem IA disponível ou
          consentimento, a compatibilidade básica é identificada claramente.
        </p>
        <p className="mt-4 text-sm text-suave">
          O Aliadas facilita conversas profissionais. Não oferece terapia nem
          mentoria formal.
        </p>
      </section>
      <section className="privacy-strip" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Suas escolhas vêm primeiro.</h2>
        <p>
          Você escolhe quais contatos deseja compartilhar. Eles só ficam
          disponíveis após o aceite mútuo da conexão, respeitando suas
          permissões.
        </p>
      </section>
      <section className="final-call" aria-labelledby="final-title">
        <p className="eyebrow">Vamos conversar?</p>
        <h2 id="final-title">Sua próxima conexão começa aqui.</h2>
        <BotaoLink to="/entrar">Quero encontrar uma aliada</BotaoLink>
      </section>
    </Pagina>
  );
}
