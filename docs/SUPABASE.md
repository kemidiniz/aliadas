# guia do supabase (passo a passo)

> Regra de ouro: **nenhuma chave entra no código, em print ou no git.** A única chave que vai para o frontend é a *anon/publishable* (ela é pública por natureza; quem protege os dados é o RLS).

## 1. criar o projeto

1. Entre em <https://supabase.com/dashboard> → **New project**.
2. **Name:** `aliadas` · **Region:** *South America (São Paulo)*, porque os dados das usuárias ficam no Brasil.
3. **Database password:** clique em *Generate a password* e guarde num gerenciador de senhas. Não cole em nenhum arquivo do projeto.
4. Espere o projeto ficar pronto (1–2 min).

## 2. pegar as chaves do frontend

**Project Settings → API Keys** (e **Data API** para a URL):

| o quê | onde usar |
|---|---|
| Project URL (`https://<ref>.supabase.co`) | `VITE_SUPABASE_URL` |
| `anon` / *publishable* key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` / *secret* key | **não copie para lugar nenhum.** As Edge Functions já recebem essa chave automaticamente. |

Na sua máquina:

```bash
cp .env.example .env.local
```

Preencha as duas variáveis no `.env.local` (ele está no `.gitignore`).

## 3. rodar as migrations

Com a CLI (recomendado), na pasta do projeto:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref-do-projeto>
```

```bash
npx supabase db push
```

O `<ref>` é o pedaço da URL `https://<ref>.supabase.co`. O `db push` roda, em ordem, os arquivos de `supabase/migrations/`.

Sem a CLI: **SQL Editor → New query**, cole cada arquivo de `supabase/migrations/` **na ordem dos nomes** e clique em *Run*.

**Dados de demonstração (opcional, só fictícios):** no SQL Editor, rode `supabase/seed.sql`. Ele cria 8 perfis aprovados com e-mails `@exemplo.invalid`, que não existem.

## 4. login com link mágico

1. **Authentication → Sign In / Providers → Email:** deixe *Enable Email provider* ligado e **Confirm email** ligado. Não é preciso habilitar senha.
2. **Authentication → URL Configuration:**
   - **Site URL:** a URL do site na Vercel (ex.: `https://aliadas.vercel.app`). Antes do deploy, use `http://localhost:5173`.
   - **Redirect URLs:** adicione `http://localhost:5173/entrar` e `https://<seu-site>/entrar`.
3. **Authentication → Emails:** o login usa **código de 6 dígitos** (e senha opcional). Edite os modelos **Magic Link** e **Confirm signup** para mostrar o código. Sem isso, o e-mail chega só com o link. Sugestão de conteúdo para os dois:
   ```html
   <h2>seu código para entrar na aliadas</h2>
   <p style="font-size:32px;letter-spacing:8px"><strong>{{ .Token }}</strong></p>
   <p>ou, se estiver no mesmo aparelho, <a href="{{ .ConfirmationURL }}">clique aqui para entrar</a>.</p>
   <p>se não foi você, é só ignorar este e-mail.</p>
   ```
   Em **Authentication → Providers → Email**, confira se *Email OTP Length* está em 6. Em **Authentication → Policies** (ou *Password security*), ligue a proteção contra senhas vazadas e defina tamanho mínimo 8.
4. ⚠️ O e-mail padrão do Supabase envia **poucos e-mails por hora** e serve só para testes. Para a demo, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (ex.: Resend, Brevo). Se não fizer isso, deixe a sua conta e a de teste já logadas antes do pitch.

## 5. segredos das Edge Functions

Crie o arquivo `supabase/functions/.env`, que já está no `.gitignore` e **não vai para o git**:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-5-5
RECOMENDAR_WEBHOOK_SECRET=<gere um valor longo e aleatório>
SITE_URL=https://<seu-site>
```

Para gerar o segredo do gatilho:

```bash
openssl rand -hex 32
```

Envie os segredos e **apague o arquivo** em seguida:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

```bash
rm supabase/functions/.env
```

Confira em **Edge Functions → Secrets** (o painel mostra só os nomes, nunca os valores). `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão nas funções.

> A chave da Anthropic se cria em <https://console.anthropic.com> → *API Keys*. Coloque um limite de gasto mensal baixo em *Billing → Limits*: é mais uma proteção para a demo.
> `claude-haiku-5-5` é o modelo mais barato da geração atual. Para trocar, basta mudar `ANTHROPIC_MODEL`, sem mexer no código.

## 6. publicar as funções

```bash
npx supabase functions deploy recomendar
```

```bash
npx supabase functions deploy excluir-conta
```

O `supabase/config.toml` desliga a verificação automática de JWT só nestas duas funções, porque **cada uma faz a própria verificação**: `recomendar` aceita o segredo do gatilho ou o JWT da usuária, e `excluir-conta` aceita só o JWT.

## 7. ligar a aprovação → recomendação

O gatilho do banco (migration `004`) lê a URL e o segredo do **Vault**. No **SQL Editor**, rode uma vez, trocando os valores:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/recomendar', 'recomendar_url');
select vault.create_secret('<o MESMO valor de RECOMENDAR_WEBHOOK_SECRET>', 'recomendar_webhook_secret');
```

Como funciona: quando a curadora muda um perfil de `pendente` (ou `reprovado`) para `aprovado`, o banco chama a função `recomendar` em segundo plano (`pg_net`). A tela da curadora não trava.

Para conferir: **Edge Functions → recomendar → Logs**, e a aba **saídas da ia** em `/curadoria`.

## 8. virar curadora

1. Entre no site uma vez com o seu e-mail (link mágico).
2. No **SQL Editor**:

```sql
insert into public.roles (user_id, role)
select id, 'curadora' from auth.users where email = 'SEU_EMAIL_AQUI';
```

Não existe tela para dar esse papel, de propósito: só quem tem acesso ao painel do Supabase consegue.

## 9. webhooks para a sua automação (Make)

No Make, crie um cenário com o módulo **Webhooks → Custom webhook** e copie a URL. Ela fica **só** na configuração do webhook do Supabase, nunca no frontend nem no git.

No Supabase: **Database → Webhooks → Create a new hook** (se pedir, clique em *Enable webhooks*). Crie os três:

| nome | tabela | evento | para que serve |
|---|---|---|---|
| `feedback_novo` | `feedback` | **Insert** | a IA do Make classifica e escreve o rascunho |
| `feedback_atualizado` | `feedback` | **Update** | no Make, filtre `record.status = aprovado` e envie `record.resposta_aprovada` para `record.email` |
| `perfil_novo` | `profiles` | **Insert** | e-mail "novo perfil aguardando curadoria" |

Em cada um:
- **Type of webhook:** *HTTP Request* · **Method:** `POST` · **URL:** a URL do Make.
- **HTTP Headers → Add a new header:** `x-aliadas-secret` = um valor aleatório (outro, diferente do da recomendação). No Make, adicione um **filtro** logo depois do webhook: só continua se o cabeçalho for igual a esse valor. Assim ninguém que descubra a URL consegue disparar o cenário. (No webhook do Make, ligue *Advanced settings → Get request headers* para o cabeçalho aparecer.)

O corpo que chega no Make tem este formato:

```json
{ "type": "INSERT", "table": "feedback", "schema": "public", "record": { ... }, "old_record": null }
```

**Como o Make devolve a análise da IA:** pelo módulo **Supabase → Update a row** (ou HTTP `PATCH` em `https://<ref>.supabase.co/rest/v1/feedback?id=eq.<id>`) usando a **service role key guardada como conexão no Make**. Preencha só `categoria_ia`, `urgencia_ia`, `resumo_ia`, `rascunho_ia`, `alertas_ia` e, se quiser, `status = em_analise`. Depois do envio do e-mail, mude `status` para `respondido`.

> 🔐 A service role ignora o RLS. Ela fica só na conexão do Make. Se um dia vazar: **Project Settings → API Keys → Roll**.

Privacidade: o webhook de `profiles` envia a trajetória e o código, mas **não** e-mail nem LinkedIn (eles moram na tabela `contacts`).

## 10. deploy na Vercel

1. <https://vercel.com/new> → importe o repositório. *Framework preset:* **Vite**.
2. **Environment Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (as mesmas do `.env.local`).
3. Deploy. O `vercel.json` já cuida das rotas da SPA e de cabeçalhos de segurança.
4. Volte ao Supabase e atualize a **Site URL**, as **Redirect URLs** e o segredo `SITE_URL` (repita o passo 5 só com ele).

Netlify também funciona: o arquivo `public/_redirects` já está pronto.

## 11. depois de tudo: Security Advisor

**Advisors → Security Advisor** no painel. Ele deve mostrar zero alertas de "RLS disabled". Se aparecer aviso sobre as funções `security definer`, é esperado: elas são as funções auxiliares do RLS, e cada uma está explicada em `docs/SEGURANCA.md`.
