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

# MVP profissional: regras novas (prevalecem na jornada nova)

Migrations aditivas 012/013. O histórico acima descreve tabelas legadas, não deve orientar o compartilhamento no MVP novo.

| recurso | leitura | escrita/regra |
|---|---|---|
| professional_profiles | somente dona diretamente | RPC `mvp_save_profile` exige Auth, termos, campos limitados e categorias; não autoaprova nem altera papéis. Não sobrescreve a trajetória histórica ao editar perfil novo |
| professional_contacts | somente dona diretamente; nem curadoria recebe novos contatos | canais opcionais; nunca copia auth.users.email ou contacts antigo. RPC devolve somente campos preenchidos E autorizados, após aceite mútuo e sem bloqueio |
| conversation_requests | dona ou curadoria | RPC exige perfil aprovado, disponível e intenção autorizada; bloqueia quarta solicitação/24h com lock por usuária. Candidata escolhida no servidor, não pelo cliente |
| conversation_invites | participantes não bloqueadas ou curadoria | RPC de convite exige pedido da dona, candidata elegível e mensagem revisada; só destinatária aceita uma vez. Índice impede duas conexões ativas para o mesmo par |
| conversation_feedback | autora e curadoria | RPC exige participação e aceite. Não pode avaliar por outra pessoa. Respostas independentes. Nota 1–5 apenas quando ocorreu; resposta negativa não aceita nota nem resultado positivo |
| conversation_blocks | dona | dona insere somente em seu nome. Bloqueio simétrico para elegibilidade, aceite e contatos. Não remove contatos já copiados por outra pessoa |
| conversation_jobs | curadoria; service_role processa | participante não cria/finaliza/forja logs ou modo de IA. Claim com lock e estado, máximo 30 por 24h globalmente. Apenas códigos de erro, modelo e contagem de tokens; sem prompts/respostas brutas |

Todas as tabelas novas têm RLS. Grants de escrita direta são revogados; apenas campos do bloqueio podem ser inseridos pela dona. Funções SECURITY DEFINER têm search_path vazio, verificam auth.uid e são revogadas de PUBLIC/anon. RPCs do worker e segredo só service_role. A chave desse papel não chega ao navegador. Conhecer UUID de uma pessoa/pedido/convite não dá acesso aos contatos. A suite testa o acesso antes/depois do aceite, por terceiros e após bloqueio.

O cartão profissional é uma projeção mínima via RPC: nome de apresentação, ocupação, áreas e momento, somente para participantes de sugestão/convite. Não abre leitura de todos os perfis antigos. Textos livres de perfil/pedido e contatos nunca chegam à Gemini; o payload é reconstruído com allowlists de categorias. Instruções fora dessas categorias são rejeitadas antes da chamada. Saída JSON tem limites de comprimento, exatamente duas perguntas e filtros de links/contatos. Isso reduz, mas não elimina, conteúdo inadequado ou alucinação: revisão humana é obrigatória antes de convidar. O filtro não substitui consentimento nem avaliação jurídica.

O consentimento externo é opcional, desmarcado por padrão e informado sobre possível uso dos dados no plano gratuito para melhorar modelos. A versão `mvp-profissional-v1` e timestamp ficam no perfil. Ambas devem consentir; retirar consentimento entre claim e finalização impede publicar o resultado. Sem consentimento, nenhum job novo é criado. A revogação não recupera dados já enviados ao provedor. Antes da ativação, confirmar termos atuais, LGPD, país e condições de retenção.

Tabelas e endpoints legados não são apagados. Os gatilhos pagos/de Make são desativados pela nova migration, e o código de `recomendar` passa a retornar 410. Na entrega local isso ainda não estava implantado; posteriormente a usuária autorizou a ativação, registrada em MVP.md. O endpoint remoto retorna 410 e os gatilhos legados foram desativados. Considere bloquear o endpoint legado no procedimento de lançamento, sem alegar que já foi bloqueado.

A exclusão de conta existente apaga Auth/fotos e as novas tabelas em cascata. Jobs são apagados com solicitações, não preservam vínculo pessoal após exclusão. Relatórios do projeto final devem ser agregados e higienizados antes de guardar evidência. Contatos legados históricos permanecem sob suas políticas antigas, sem importação ou liberação automática na nova interface.

## riscos residuais e verificações de ativação

- Sem Gemini/key/termos verificáveis, não ativar IA; não declarar validação real. Cada chamada externa precisa de projeto sem cobrança, modelo gratuito confirmado e consentimentos.
- Sem CAPTCHA novo; limites por usuária não impedem criação de múltiplas contas. Manter aprovação pela curadoria e observar quotas.
- Falha de transporte pg_net pode deixar trabalho pendente ou executando; a curadoria acompanha status, fila HTTP e timestamps. Não há reprocessamento automático ilimitado.
- Não há armazenamento de conversa. Mensagem inicial de convite é armazenada no banco para revisão/auditoria e só participantes/curadoria leem. Nunca vai à Gemini.
- Texto de ocupação e nome é preenchido pela usuária, mostrado à participante autorizada e renderizado como texto React, sem HTML arbitrário. Orientar a não incluir dados confidenciais.
- Não são coletadas senhas de aplicativos externos. Links são validados pelo banco (HTTPS/host para LinkedIn e Meet, telefone E.164 e e-mail limitado). Consentir um canal sem preenchê-lo não o libera.

Compartilhamento prematuro por texto: nomes/ocupações novos e mensagens de convite rejeitam padrões de e-mail, links e telefone. Cartões higienizam nomes legados que contenham esses padrões. O filtro não detecta toda forma deliberadamente ofuscada de contato; os termos proíbem essa tentativa e a curadoria trata denúncias.

## histórico incorporado da branch remota

A seção abaixo descreve a versão anterior. Busca/pitch/mural não fazem parte da interface nova; a aprovação automática por LinkedIn será desativada pela migration 014 do MVP. Os registros históricos permanecem.

## novidades (busca, entrada com LinkedIn, mensagens, pitch)

| regra | como funciona |
|---|---|
| **busca de mulheres** (`buscar_aliadas`) | só para perfis aprovados; mostra apenas quem está aprovada **e** marcou "aceito aparecer na busca e ser recomendada". Devolve apelido, foto, trajetória, áreas e preferências, **nunca contato** |
| **pedido de conexão** (`pedir_conexao`) | para quem foi recomendada **ou** aparece na busca; até **10 pedidos por dia**; pode levar uma mensagem de até 600 caracteres, que só as duas veem |
| **entrada com LinkedIn** | perfil pendente que informa o LinkedIn é aprovado na hora (gatilho em `contacts`). Risco aceito no MVP: o link não é verificado automaticamente; a curadoria pode reprovar ou pausar e as denúncias continuam valendo |
| **meu pitch** | os textos são montados no próprio navegador e o rascunho fica só no aparelho (localStorage). Nada é enviado para servidor ou IA |
| **mural de conquistas** | campo `conquista` nos posts; mesmas regras do fórum (só aprovadas, denúncia, curadoria oculta) |

## Finalização: embaixadoras, estado assíncrono e auditoria

Ver `AUDITORIA-SEGURANCA.md` para a revisão individual das funções observadas em produção. Foram consultadas somente definições e privilégios; não foram aplicadas revogações ou permissões remotas.

A migration 015 preparada adiciona `principal_administrator`, `ambassador_permissions` e `admin_access_audit`, com RLS e sem escrita direta de participantes. Preserva public.roles e o papel curadora. O bootstrap separado usa o UUID conferido pela titular; não usa e-mail ou metadados. Só service_role pode iniciar a principal, uma vez. Depois disso, somente essa principal gerencia embaixadoras por RPC autenticada.

Embaixadoras não recebem is_curadora=true: esse helper está ligado a capacidades antigas amplas. A revisão de perfis e o tratamento de denúncias são projeções/RPCs separadas, sem contatos privados. Indicadores, auditoria e delegação permanecem reservados à principal (ou acesso legado durante a transição antes do bootstrap). Revogação é imediata no banco; a interface atualiza permissões ao retomar o foco e ao executar ações administrativas. O acesso de uma sessão existente não permite continuar usando RPCs revogadas.

A identidade principal é protegida contra exclusão acidental por FK RESTRICT. A eventual exclusão/transferência da conta principal exige procedimento administrativo verificado, não o botão comum de embaixadoras; participantes comuns continuam com exclusão de conta preservada.

`mvp_job_status` retorna apenas estado, modo e código seguro da solicitação da própria pessoa. Não libera logs ou ids de terceiros. O helper mvp_blocked também foi limitado para não informar bloqueios entre outras pessoas. Após a revisão local, a titular autorizou expressamente a migration e o bootstrap; ambos foram aplicados e auditados, sem promover outras contas.

## Revisão 031 — 17/11/2026

A nova finalidade da IA é recomendar por habilidades; exige consentimento `habilidades-v1`, registrado ao salvar o perfil com o novo texto. Consentimentos e habilidades não são atribuídos a outras pessoas durante a migração. Perfis legados continuam no plano B.

O apoio original só fica no pedido. Leitura direta limitada à dona; a destinatária lê por `mvp_invite_context`, que exige participação no convite e ausência de bloqueio. Administradoras recebem agregados e logs sem apoio livre. O mapa C1…C15 → pessoa e a ordem completa ficam em tabela privada com RLS, sem grants a participantes. Antes de chamar Gemini, o worker remove contatos/documentos e transmite apenas expressões profissionais presentes no catálogo: nomes e instruções arbitrárias não atravessam a lista permitida.

A resposta é validada no worker e no banco: códigos do pool, habilidades existentes e realmente oferecidas, até três recomendações sem repetição. Consentimento, aprovação, disponibilidade, bloqueios e elegibilidade são rechecados no claim/finalização/convite. A revisão humana impede publicar uma resposta atrasada sobre uma indicação que já foi trocada ou convidada. O plano B não se apresenta como IA.

Testes locais incluem acesso por UUID conhecido, terceiros, pool privado, contatos antes/depois do aceite, manipulação de saída, revogação, limites, não repetição e 15 candidatas. Stubs não são evidência de geração remota.

Consulta de configuração Auth em 17/11 encontrou `password_hibp_enabled=false`. Conferir Authentication › Settings › Password security e ativar proteção contra senhas vazadas **se disponível no plano atual sem custo**. Nenhum upgrade ou faturamento será ativado. A situação do Security Advisor será registrada no relatório de publicação; não revogar funções em massa para silenciar alertas.
