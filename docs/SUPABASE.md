> **Guia histórico.** A jornada profissional nova usa migrations 012/013 e `conversa-ia`, descritas em `MVP.md`. Não executar `db push`, publicar funções ou ativar o fluxo Anthropic/Make sem revisão e autorização.

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
3. **Authentication → Emails:** o login usa código por e-mail e link alternativo. O modelo HTML com a identidade visual da comunidade está em `supabase/templates/codigo.html`. Use o mesmo conteúdo em **Magic Link** e **Confirm signup**, com o assunto `seu código para entrar na aliadas`. Preserve `{{ .Token }}` e `{{ .ConfirmationURL }}`.
4. **Limitação verificada:** a API recusou a personalização com `entitlement_required`: projetos gratuitos com o provedor padrão precisam configurar SMTP próprio ou mudar de plano para alterar os modelos. O HTML está preparado no repositório, mas ainda não foi aplicado no Supabase.
5. Em **Authentication → Emails → SMTP Settings**, configure um provedor com domínio verificado (por exemplo, Resend ou Brevo) usando os campos seguros do painel. Depois aplique os dois modelos e teste o recebimento em uma conta autorizada. Não coloque credenciais SMTP no repositório.
6. Não altere o tamanho ou a validade do código só para mudar a aparência. O ambiente atual usa código de 8 dígitos; o formulário aceita esse formato.

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

A migration `20261114000007_avisos_para_o_make.sql` já cria os gatilhos. Não crie webhooks duplicados pelo painel: isso pode enviar e-mails duas vezes.

No Make, use **Webhooks → Custom webhook**. As URLs ficam no Vault do Supabase, nunca no frontend nem no Git:

| segredo no Vault | evento | ação no Make |
|---|---|---|
| `make_feedback_novo_url` | feedback inserido | buscar feedback por `id`, classificar e gravar rascunho |
| `make_feedback_atualizado_url` | feedback mudou para aprovado | buscar feedback por `id`, conferir `status = aprovado` e enviar a resposta |
| `make_perfil_novo_url` | perfil inserido | avisar a curadoria de um novo perfil |

Configure os segredos pelo painel seguro do Supabase. O gatilho não envia o cabeçalho `x-aliadas-secret`; esse cabeçalho pertence ao fluxo de recomendação, separado deste.

O corpo atual contém apenas:

```json
{ "tabela": "feedback", "evento": "insert", "id": "uuid-do-feedback" }
```

No cenário, encaminhe apenas as tabelas e eventos esperados e busque a linha no Supabase usando o `id`. Não espere `record`, `old_record` ou `type`: esses campos pertencem ao formato antigo. Para enviar uma resposta, confira no registro buscado o status `aprovado`, o e-mail e a resposta aprovada. Uma chamada recebida não deve fornecer diretamente o conteúdo do e-mail.

### diagnosticar falhas

1. Abra **History** no Make e identifique a execução e o primeiro módulo com erro.
2. Se o erro for no **Extract information from text** antigo, use **Upgrade module**, selecione a conexão e um modelo disponível, revise os campos de saída usados nos próximos módulos e salve. Confirme que o cenário está ligado.
3. Se nenhuma execução chegar, confira a existência dos três segredos no Vault e dos gatilhos da migration 007. Não compartilhe os valores dos segredos.
4. Se o webhook chegar, mas os campos estiverem vazios, confira o mapeamento de `tabela`, `evento` e `id` e a busca da linha no Supabase.
5. Teste um feedback identificado como teste, sem dados pessoais. Confirme que a análise aparece na curadoria. O teste de envio de e-mail precisa de um destinatário de teste autorizado; não reprocesse em massa execuções antigas.

**Como o Make devolve a análise da IA:** pelo módulo **Supabase → Update a row** (ou HTTP `PATCH` em `https://<ref>.supabase.co/rest/v1/feedback?id=eq.<id>`) usando a **service role key guardada como conexão no Make**. Preencha só `categoria_ia`, `urgencia_ia`, `resumo_ia`, `rascunho_ia`, `alertas_ia` e, se quiser, `status = em_analise`. Depois do envio do e-mail, mude `status` para `respondido`.

> 🔐 A service role ignora o RLS. Ela fica só na conexão do Make. Se um dia vazar: **Project Settings → API Keys → Roll**.

Privacidade: os avisos enviam só tabela, evento e id. Se a IA analisar feedback, mapeie apenas os campos de texto necessários; não envie nome, e-mail, LinkedIn ou foto.

## 10. deploy na Vercel

1. <https://vercel.com/new> → importe o repositório. *Framework preset:* **Vite**.
2. **Environment Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (as mesmas do `.env.local`).
3. Deploy. O `vercel.json` já cuida das rotas da SPA e de cabeçalhos de segurança.
4. Volte ao Supabase e atualize a **Site URL**, as **Redirect URLs** e o segredo `SITE_URL` (repita o passo 5 só com ele).

Netlify também funciona: o arquivo `public/_redirects` já está pronto.

## 11. depois de tudo: Security Advisor

**Advisors → Security Advisor** no painel. Ele deve mostrar zero alertas de "RLS disabled". Se aparecer aviso sobre as funções `security definer`, é esperado: elas são as funções auxiliares do RLS, e cada uma está explicada em `docs/SEGURANCA.md`.

## diagnóstico da IA de aliadas

A função `recomendar` está ativa, mas a verificação de 15/11/2026 encontrou `ANTHROPIC_API_KEY` ausente nas Edge Functions e uma execução com falha por esse motivo. Cadastre a chave apenas em **Edge Functions → Secrets**. O modelo configurado no código também precisa ser conferido na conta Anthropic antes do teste. Não é possível validar a chamada real sem a credencial.

As sugestões aparecem em `/minhas-aliadas`, com o motivo da escolha em cada cartão. A curadoria acompanha as execuções em **saídas da ia**. É necessário haver ao menos outra pessoa aprovada, com consentimento para ser sugerida e perfil adequado; um único perfil aprovado não basta.
