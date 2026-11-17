import { BotaoLink } from "../components/Botao";
import { Pagina } from "../components/Pagina";
import { Link } from "react-router-dom";
import { FONTE_LINKEDIN as LINKEDIN, FONTE_WEF as WEF } from "../lib/fontes";
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
const FAQ = [
  {
    q: "A IA vê meus dados?",
    a: "Só se você autorizar, e mesmo assim ela recebe apenas categorias: áreas, momento e objetivos. Nunca nome, contatos ou textos livres.",
  },
  {
    q: "Quando meus contatos aparecem?",
    a: "Só depois que as duas aceitam a conversa. Você escolhe quais canais mostrar.",
  },
  {
    q: "A aliadas é mentoria?",
    a: "Não é apenas mentoria. Na mentoria, alguém com mais experiência guia alguém com menos. Aqui, qualquer mulher pode apoiar outra, em qualquer momento da carreira: com escuta, uma dica ou um contato.",
  },
  {
    q: "E se não houver ninguém compatível?",
    a: "A gente avisa, sem inventar uma indicação. Você pode tentar outro objetivo ou voltar em alguns dias.",
  },
  {
    q: "A indicação garante a conversa?",
    a: "Não. Você revisa a mensagem e a conversa só acontece se as duas aceitarem.",
  },
];
export default function LandingInstitucional() {
  return (
    <Pagina titulo="aliadas">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Conexões entre mulheres</p>
          <h1 id="hero-title">Uma conversa pode abrir novos caminhos.</h1>
          <p className="conceito">Não é apenas mentoria, é aliança.</p>
          <p className="hero-description">
            Encontre uma mulher para conversar sobre o próximo passo da sua
            carreira e compartilhe o que você já sabe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <BotaoLink to="/entrar">Encontrar minha aliada</BotaoLink>
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
              27% <span>Brasil</span>
            </p>
            <p>
              Mulheres no Brasil tinham 27% menos chance de ter uma rede
              profissional forte que os homens.
            </p>
            <a className="source-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              LinkedIn, 2020 <Arrow />
            </a>
          </article>
          <article>
            <p className="stat-number">
              97% <span>Global</span>
            </p>
            <p>
              Em 97% das economias analisadas, os homens tinham redes maiores
              que as mulheres no LinkedIn.
            </p>
            <a className="source-link" href={WEF} target="_blank" rel="noopener noreferrer">
              Fórum Econômico Mundial, 2024 <Arrow />
            </a>
          </article>
        </div>
      </section>
      <section id="quem-somos" className="institutional-section scroll-mt-28" aria-labelledby="about-title">
        <p className="eyebrow">Quem somos</p>
        <h2 id="about-title">Uma iniciativa de impacto social.</h2>
        <div className="editorial-copy">
          <p>
            Criada na formação em IA Aplicada da {"{reprograma}"}, para tornar
            conexões profissionais mais simples e intencionais.
          </p>
        </div>
        <Link to="/quem-somos" className="text-link mt-5 inline-block">
          Conheça a aliadas →
        </Link>
      </section>
      <section className="institutional-section" aria-labelledby="audience-title">
        <p className="eyebrow">Para quem é</p>
        <h2 id="audience-title">Duas formas de participar.</h2>
        <div className="mt-8 grid gap-9 sm:grid-cols-2">
          <div className="border-l-2 border-coral pl-5">
            <h3>Quer uma conversa</h3>
            <p className="mt-3 text-suave">
              Para preparar uma entrevista, pedir feedback ou pensar no próximo
              passo.
            </p>
          </div>
          <div className="border-l-2 border-campo pl-5">
            <h3>Quer compartilhar</h3>
            <p className="mt-3 text-suave">
              Para ajudar outra mulher com o que você já viveu.
            </p>
          </div>
        </div>
        <p className="mt-7">
          Para mulheres cis e trans e pessoas não binárias, de todas as áreas.
        </p>
      </section>
      <section id="como-funciona" className="institutional-section scroll-mt-28" aria-labelledby="solution-title">
        <p className="eyebrow">Como funciona</p>
        <h2 id="solution-title">Três passos até a conversa.</h2>
        <ol className="steps-list">
          {["Escolha o objetivo.", "Receba uma indicação.", "Depois do aceite, conversem por onde preferirem."].map((passo, i) => (
            <li key={passo}>
              <span className="step-number" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{passo}</h3>
            </li>
          ))}
        </ol>
      </section>
      <section className="institutional-section" aria-labelledby="embaixadoras-title">
        <p className="eyebrow">Embaixadoras</p>
        <h2 id="embaixadoras-title">Quem cuida da comunidade.</h2>
        <div className="editorial-copy">
          <p>
            Mulheres que cuidam da comunidade: revisam perfis novos e acompanham
            denúncias. O papel é por convite.
          </p>
        </div>
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
              <p className="pb-5 text-suave">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="final-call" aria-labelledby="final-title">
        <h2 id="final-title">Sua próxima conversa começa aqui.</h2>
        <BotaoLink to="/entrar">Encontrar minha aliada</BotaoLink>
      </section>
    </Pagina>
  );
}
