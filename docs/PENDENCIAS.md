> **Histórico de configuração anterior.** Para o MVP profissional, siga `MVP.md`, `CUSTOS.md` e `VALIDACAO.md`. Não ative Anthropic paga, Make, fórum ou catálogo por instruções antigas deste arquivo. Nada aqui autoriza deploy ou alteração remota.

# aliadas · o que falta configurar

> Documento para mim (Kemily) e para qualquer assistente de código (Codex, Claude, Cursor) que for continuar o projeto.
> **Nenhuma chave ou senha vai neste arquivo.** Chaves são coladas direto nos painéis indicados.

## 1. contexto do projeto (para o assistente ler primeiro)

**aliadas** é uma comunidade online em que mulheres (cis e trans) e pessoas não binárias que estão começando em tecnologia contam a própria trajetória, e uma IA apresenta **aliadas**: referências próximas, com caminho ou interesses parecidos, que podem estar no mesmo momento ou já ter vivido o que ela está vivendo. Também tem um **fórum** só para perfis aprovados e uma página de **recomendações** de cursos e programas.

Fluxo principal: entrar (código por e-mail ou senha) → cadastro em 8 telas → curadoria aprova → a IA (Claude, via Edge Function `recomendar`) sugere até 2 aliadas e 2 programas → "quero me conectar" → as duas aceitam → o contato aparece.

| peça | onde | link |
|---|---|---|
| site no ar | Vercel | https://aliadas-indol.vercel.app |
| código | GitHub, branch `claude/new-session-39k0a4` | https://github.com/kemidiniz/aliadas |
| banco, login, fotos, funções | Supabase (projeto `aliadas`, região São Paulo, id `mbiutzyteuvcoahhizmg`) | https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg |
| deploy | Vercel (projeto `aliadas`) | https://vercel.com/kemidinizs-projects/aliadas |
| automação de feedback e e-mails | Make (cenário "aliadas · automações") | https://us2.make.com/2735987/scenarios/7042820/edit |
| chave da IA | Anthropic Console | https://console.anthropic.com/settings/keys |

**Stack:** React + Vite + TypeScript + Tailwind + Framer Motion + React Router + Zod · Supabase (Auth, Postgres com RLS, Storage, Edge Functions em Deno) · API da Anthropic só dentro da Edge Function · Make para e-mails e IA do feedback.

**Leia antes de mexer:** `README.md`, `docs/SUPABASE.md` (passo a passo) e `docs/SEGURANCA.md` (cada regra de acesso explicada).

---

## 2. pendências que SÓ EU posso fazer (painéis, nada no código)

Marque conforme for fazendo.

### 2.1 Make: feedback sem IA
> **Desatualizado (17/11).** O cenário passou a ter um caminho só (feedback novo). Veja `docs/AUTOMACAO-FEEDBACK.md`.
O cenário **aliadas · automações** está ligado e testado: feedback novo → e-mail HTML para a curadora + resposta automática para quem deixou e-mail. Resposta pessoal da curadora e aviso de perfil novo também passam por ele.
- [ ] Em `/curadoria` → aba feedback, **descartar** os feedbacks de teste.

### 2.2 IA das recomendações: funciona de graça ✅
A busca de aliadas usa um **algoritmo gratuito** (áreas em comum, origem parecida, momento parecido ou próximo). Não precisa de chave.
- [ ] (opcional, no futuro) Para usar o Claude, que escreve motivos mais ricos e um resumo da trajetória, cadastrar `ANTHROPIC_API_KEY` em https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/functions/secrets. O algoritmo continua de reserva se a API falhar.
- [ ] `SITE_URL` = `https://aliadas-indol.vercel.app` no mesmo lugar (restringe quem chama as funções pelo navegador).

### 2.3 Supabase: endereços do login (sem isso o link do e-mail leva para o lugar errado)
Link: https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/auth/url-configuration
- [ ] **Site URL:** `https://aliadas-indol.vercel.app`
- [ ] **Redirect URLs:** adicionar `https://aliadas-indol.vercel.app/entrar` e `http://localhost:5173/entrar`

### 2.4 Supabase: e-mail bonito com o código (depende do 2.6 — SMTP próprio)
No plano gratuito, o Supabase só deixa trocar o modelo depois de configurar SMTP próprio (item 2.6).
Link: https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/auth/templates
- [ ] **Confirm signup** → assunto `bem-vinda à aliadas · seu código` → colar todo o conteúdo de `supabase/templates/confirmar-cadastro.html`
- [ ] **Magic Link** → assunto `seu código para entrar na aliadas` → colar todo o conteúdo de `supabase/templates/entrar.html`
- [ ] **Reset Password** → assunto `crie uma senha nova na aliadas` → colar todo o conteúdo de `supabase/templates/recuperar-senha.html`
- [ ] Salvar e testar entrando no site com um e-mail seu.

### 2.5 Supabase: segurança de senha
Link: https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/auth/providers (seção de senhas / *Password security*)
- [ ] Ligar **proteção contra senhas vazadas** (Leaked password protection).
- [ ] Tamanho mínimo da senha: **8**.

### 2.6 Supabase: SMTP gratuito pelo Gmail (necessário para o código aparecer no e-mail)
Sem SMTP próprio, o Supabase manda poucos e-mails por hora e não deixa personalizar o modelo; o e-mail padrão traz só o link, sem o código.
1. [ ] Ligar a **verificação em duas etapas** na conta Google: https://myaccount.google.com/security
2. [ ] Criar uma **senha de app** (nome: "aliadas supabase"): https://myaccount.google.com/apppasswords. Copie os 16 caracteres; não cole em lugar nenhum além do passo 3.
3. [ ] Em https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/auth/smtp ligar *Custom SMTP*:
   - Sender email: `kemilydiniz@gmail.com` · Sender name: `aliadas`
   - Host: `smtp.gmail.com` · Port: `587` · Username: `kemilydiniz@gmail.com` · Password: a senha de app
4. [ ] Em *Rate Limits* do Auth, ajustar o limite de e-mails por hora (ex.: 30).
5. [ ] Depois, fazer o item 2.4 (colar os modelos bonitos).
Limite do Gmail gratuito: cerca de 500 e-mails por dia, mais que suficiente para o MVP.

### 2.7 Vercel: deploy automático e acesso público
- [ ] **Publicar sozinho a cada push:** https://vercel.com/kemidinizs-projects/aliadas/settings/git → *Connect Git Repository* → `kemidiniz/aliadas`. Em *Production Branch*, use `claude/new-session-39k0a4` ou renomeie a branch para `main` no GitHub antes (Settings → Branches).
- [ ] **Teste de visitante:** abrir https://aliadas-indol.vercel.app numa **janela anônima**. Se pedir login da Vercel, desligar em https://vercel.com/kemidinizs-projects/aliadas/settings/deployment-protection.

### 2.8 Conteúdo
- [ ] Cadastrar **programas reais** em `/curadoria` → aba programas. Há 3 exemplos "PREENCHER" inativos: edite ou crie novos, confira o link e **ative**.
- [ ] Mandar ao assistente os **links exatos** dos dois estudos citados na home (Brasscom 2025 e Girls Who Code + Accenture). Hoje apontam para a página inicial das organizações.
- [ ] Antes de lançar para pessoas reais: apagar os perfis fictícios. No SQL Editor (https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/sql/new):
  ```sql
  delete from auth.users where email like '%@exemplo.invalid';
  ```
  Isso apaga em cascata os perfis, contatos, posts e curtidas fictícios.

### 2.9 Teste de ponta a ponta (depois de 2.1 a 2.4)
- [ ] Criar uma conta de teste com outro e-mail → fazer o cadastro → chega o e-mail "novo perfil aguardando curadoria".
- [ ] Na minha conta (curadora): aprovar o perfil → em ~30 s, "minhas aliadas" da conta de teste mostra até 2 aliadas.
- [ ] Pedir conexão → aceitar na outra conta → o contato aparece nas duas.
- [ ] Enviar um feedback com e-mail → a análise da IA aparece na curadoria → "aprovar e enviar" → o e-mail chega.
- [ ] Postar, curtir e comentar no fórum; denunciar um post com a outra conta e ocultá-lo pela curadoria.

---

## 3. o que um assistente de código PODE fazer (no repositório)

- Trocar os links dos estudos em `src/lib/fontes.ts` (quando eu enviar os links).
- Ajustes de texto, layout e novas telas em `src/`.
- Futuro: papel de **embaixadora** (modera o fórum, sem acesso a contatos), com nova migration e testes.
- Futuro: sugestões de programas pela IA, **só como rascunho para a curadoria aprovar**, nunca publicando direto.

### regras para o assistente (não negociáveis)
1. **Nunca** colocar chave, token ou senha no código, em `.env` versionado ou em print. O frontend usa só `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Mudança no banco = **arquivo novo** em `supabase/migrations/` (nunca editar os antigos), com RLS em toda tabela nova e permissões por coluna. Explicar cada política em `docs/SEGURANCA.md`.
3. Toda regra de acesso nova ganha teste em `supabase/tests/rls_test.sql`. Rodar `npm run test:rls`, que precisa de um Postgres local (veja o script).
4. A IA nunca recebe nome, apelido, e-mail, LinkedIn ou foto. Só o código interno e a trajetória.
5. Contato só aparece depois do aceite das duas. O fórum é só para aprovadas.
6. Rodar `npm run build` antes de subir.
7. Identidade visual: cores em `src/styles/index.css` (vinho `#6B1E3A`, coral `#E0654A`, off-white `#FBF8F3`), textos em minúsculas, contraste AA, `prefers-reduced-motion`, sem degradês nem ícones de brilho.
8. Migrations novas eu aplico no SQL Editor do Supabase (ou o assistente aplica, se tiver acesso). Depois de aplicar, rodar o Security Advisor: https://supabase.com/dashboard/project/mbiutzyteuvcoahhizmg/advisors/security

### prompt sugerido para colar no Codex
```
Você vai continuar o projeto aliadas (repositório kemidiniz/aliadas, branch claude/new-session-39k0a4).
Antes de qualquer mudança, leia README.md, docs/PENDENCIAS.md, docs/SUPABASE.md e docs/SEGURANCA.md
e siga as "regras para o assistente" do docs/PENDENCIAS.md.
Tarefa: <descreva aqui o ajuste>.
Ao terminar: rode npm run build, diga o que mudou, como testar e se ficou algum risco de segurança.
```
