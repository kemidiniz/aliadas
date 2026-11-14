# aliadas

Comunidade online onde mulheres que estão começando em tecnologia contam a própria trajetória, e a IA apresenta **aliadas**: referências próximas, com caminho parecido, alguns passos à frente.

> o linkedin mostra mulheres famosas; a aliadas apresenta a mulher que estava onde você está há um ano.

Projeto final do curso de IA Aplicada da {reprograma}.

## stack
React + Vite + TypeScript · Tailwind CSS · Framer Motion · React Router · Zod · Supabase (Auth, Postgres com RLS, Storage, Edge Functions) · API da Anthropic (Claude), chamada **só** dentro de Edge Functions.

## rodar localmente

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha o `.env.local` com a URL e a anon key do Supabase e rode:

```bash
npm run dev
```

O site abre em `http://localhost:5173`.

## onde está cada coisa
| pasta | o que tem |
|---|---|
| `src/pages` | uma página por rota (`/`, `/entrar`, `/cadastro`, `/minhas-aliadas`, `/conexoes`, `/minha-conta`, `/curadoria`, `/feedback`, `/recomendacoes`, textos) |
| `src/components` | logo, botões, campos acessíveis, avatar, transições |
| `src/lib` | cliente Supabase, sessão, tema, validações Zod, fotos |
| `src/styles/index.css` | **tokens de cor** (troque as cores aqui) |
| `supabase/migrations` | tabelas, RLS, storage, gatilho de recomendação |
| `supabase/functions` | `recomendar` (IA) e `excluir-conta` |
| `supabase/tests` | 74 testes de RLS |
| `supabase/seed.sql` | dados **fictícios** para a demo |
| `docs/SUPABASE.md` | passo a passo do Supabase, segredos, webhooks e deploy |
| `docs/SEGURANCA.md` | cada política explicada, riscos pendentes |

## comandos
- `npm run dev`: servidor local
- `npm run build`: checa tipos e gera `dist/`
- `npm run test:rls`: testes de RLS num Postgres local (veja `docs/SEGURANCA.md`)
