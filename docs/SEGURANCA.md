# segurança e LGPD da aliadas

## as políticas de acesso (RLS), em português simples

O RLS é uma regra **dentro do banco**: mesmo que alguém pegue a anon key e chame a API direto, o banco só devolve o que a política permite. Além do RLS, cada tabela tem **permissão por coluna**: a pessoa só consegue escrever nas colunas que fazem sentido (por exemplo, ninguém consegue escrever o próprio `status`, o `codigo` ou o `resumo` da IA).

### funções auxiliares
| função | pergunta que responde |
|---|---|
| `is_curadora()` | "quem está logada é curadora?" (olha a tabela `roles`) |
| `eu_aprovada()` | "o meu perfil está aprovado?" |
| `pode_ver_perfil(alvo)` | "tenho um motivo concreto para ver esse perfil?" O perfil é meu, eu sou curadora, ela foi recomendada para mim (e está aprovada) ou existe um pedido de conexão entre nós |
| `conexao_aceita_com(alvo)` | "nós duas aceitamos a conexão?" |
| `pode_ver_foto(caminho)` | "posso ver essa foto?" A foto é minha, sou curadora, ou eu estou aprovada **e** ela está aprovada **e** (tenho motivo para ver o perfil dela **ou** ela escreveu no fórum) |
| `forum_feed()` / `forum_comentarios_de()` | devolvem posts e comentários com **só o apelido e a foto** de quem escreveu, nunca o contato |
| `denunciar_conteudo()` | denuncia um post ou comentário; a denúncia chega à curadoria com o texto, e ela pode ocultar |

### tabela por tabela
| tabela | quem lê | quem escreve |
|---|---|---|
| `roles` | cada uma vê o próprio papel; curadora vê todos | ninguém pelo site (só pelo SQL Editor) |
| `profiles` | só quem tem motivo (`pode_ver_perfil`) | cada uma cria e edita **o próprio**. A dona só pode pausar e despausar (nunca se autoaprovar). A curadora só muda o **status** de perfis alheios |
| `consents` | dona e curadoria | dona registra; depois só pode mudar "aceito ser recomendada" |
| `contacts` | dona, curadoria (para conferir o LinkedIn) e **a outra pessoa, só depois do aceite das duas** | só a dona |
| `programs` | qualquer pessoa vê os **ativos**; curadoria vê todos | só curadoria |
| `recommendations` / `program_recommendations` | só a pessoa para quem é a recomendação (e a curadoria) | só a Edge Function (service role) |
| `ai_runs` | só curadoria | só a Edge Function |
| `connections` | só as duas envolvidas (e curadoria) | criar e responder **só pelas funções** `pedir_conexao` (apenas com aliada recomendada para você) e `responder_conexao` (apenas quem recebeu). Quem foi recusada não consegue apagar o pedido para insistir |
| `feedback` | só curadoria | qualquer pessoa **insere**, e só nos campos do formulário (não escolhe status nem preenche campos `_ia`). Curadoria muda status, rascunho e resposta. A automação usa a service role |
| `reports` | só curadoria | usuária logada denuncia **em seu próprio nome** e só perfis que ela consegue ver |
| `forum_posts` / `forum_comentarios` | só perfis **aprovados** (e a curadoria); conteúdo oculto some para as outras, mas a autora ainda vê o dela | aprovada publica e comenta **em seu nome**; edita e apaga só o que é dela; só a curadoria oculta ou mostra (e não reescreve o texto de ninguém); limite de 10 posts e 60 comentários por dia |
| `forum_curtidas` | aprovadas | cada uma curte e descurte só em seu nome, e só posts visíveis |
| `storage.objects` (fotos) | `pode_ver_foto` | cada uma só envia, troca ou apaga na **própria pasta**, e só `.jpg/.jpeg/.png/.webp` |

### onde estão os testes
`supabase/tests/rls_test.sql` tem **106 verificações**, uma para cada regra acima, incluindo as tentativas que precisam ser bloqueadas. Rodam num Postgres local descartável:

```bash
PGHOST=... PGPORT=... PGUSER=postgres npm run test:rls
```

## o que mais protege os dados

- **Chaves:** o frontend só tem a anon key. `ANTHROPIC_API_KEY` e a service role ficam como segredos das Edge Functions. O `.gitignore` ignora `.env*` desde o primeiro commit.
- **IA sem dados pessoais:** a Edge Function envia só código + trajetória. Antes de enviar, apaga e-mails, links e telefones que alguém tenha escrito no texto livre e troca `<` `>` para ninguém "fechar" as tags do prompt.
- **Prompt injection:** o texto das usuárias vai entre `<nova>`, `<base>` e `<programas>`, e o prompt manda ignorar instruções ali dentro. A saída é validada com Zod (formato e tamanho), e cada código ou id devolvido é conferido contra o que foi enviado.
- **Limite de uso:** 3 gerações por usuária a cada 24 h, contadas em `ai_runs` (falhas também contam, para proteger o custo). A tela mostra quantas restam.
- **Falhas:** se a API cair, a pessoa vê uma mensagem amigável e o erro fica em `ai_runs.erro`.
- **Fotos:** bucket privado, 2 MB e só JPG/PNG/WebP (o bucket barra no servidor). O navegador redesenha a foto antes de enviar, o que **remove os metadados EXIF** (que podem conter localização). A foto abre por URL assinada de 1 hora.
- **Excluir conta:** a Edge Function `excluir-conta` apaga as fotos e o usuário. O banco apaga em cascata perfil, consentimentos, contatos, conexões, recomendações e denúncias recebidas. Os registros de IA dela ficam só como contagem, com o conteúdo apagado.
- **Fontes servidas pelo próprio site** (sem Google Fonts): o IP de quem visita não vai para terceiros.
- **Cabeçalhos HTTP** (`vercel.json`): `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.

## riscos que ainda existem (e o que fazer)

| risco | gravidade | o que fazer |
|---|---|---|
| Formulário de feedback é público e não tem captcha: alguém pode enviar spam | média | se acontecer, ligar o Cloudflare Turnstile ou o hCaptcha (o Supabase tem suporte) |
| E-mail padrão do Supabase tem limite baixo por hora | média (para a demo) | configurar SMTP próprio (`docs/SUPABASE.md`, passo 4) |
| Texto livre pode citar nome, empresa ou cidade, e isso vai para a IA | baixa | o cadastro orienta, e o filtro tira e-mail, link e telefone; a curadoria pode reprovar perfis com dados demais |
| Depois de aprovada, a pessoa pode trocar o LinkedIn sem nova revisão | baixa | numa próxima versão, voltar o perfil para `pendente` quando o contato mudar |
| CORS das funções aceita qualquer origem se `SITE_URL` não estiver configurado | baixa (as funções exigem JWT ou segredo) | configurar `SITE_URL` (passo 5) |
| Links das fontes da home apontam para a página inicial das organizações | conteúdo | trocar pelos links exatos dos estudos em `src/lib/fontes.ts` |

## avaliação sem a pergunta de dificuldade

A migration `20261115000010_feedback_sem_mais_dificil.sql` retira a exigência de `mais_dificil` nas avaliações. Nota e resposta sobre encontrar aliadas continuam obrigatórias. Respostas antigas são preservadas. As políticas de RLS e permissões por coluna permanecem iguais: visitantes enviam feedback, apenas curadoras leem e respondem, e campos de IA continuam reservados à automação.

A migration `20261115000011_remover_coluna_mais_dificil.sql` remove a coluna e suas respostas antigas a pedido da responsável pelo projeto. Não altera RLS nem as permissões dos campos restantes.

## novidades (busca, entrada com LinkedIn, mensagens, pitch)

| regra | como funciona |
|---|---|
| **busca de mulheres** (`buscar_aliadas`) | só para perfis aprovados; mostra apenas quem está aprovada **e** marcou "aceito aparecer na busca e ser recomendada". Devolve apelido, foto, trajetória, áreas e preferências, **nunca contato** |
| **pedido de conexão** (`pedir_conexao`) | para quem foi recomendada **ou** aparece na busca; até **10 pedidos por dia**; pode levar uma mensagem de até 600 caracteres, que só as duas veem |
| **entrada com LinkedIn** | perfil pendente que informa o LinkedIn é aprovado na hora (gatilho em `contacts`). Risco aceito no MVP: o link não é verificado automaticamente; a curadoria pode reprovar ou pausar e as denúncias continuam valendo |
| **meu pitch** | os textos são montados no próprio navegador e o rascunho fica só no aparelho (localStorage). Nada é enviado para servidor ou IA |
| **mural de conquistas** | campo `conquista` nos posts; mesmas regras do fórum (só aprovadas, denúncia, curadoria oculta) |
