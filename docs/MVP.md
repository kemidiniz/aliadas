# MVP profissional — entrega local

Revisão: 15/11/2026. Este documento substitui o escopo histórico do `PENDENCIAS.md`. A publicação foi autorizada posteriormente pela usuária nesta conversa.

## o que muda para quem usa

A participante confirma seu e-mail e cria ou atualiza um perfil profissional em uma página. Não precisa de vínculo institucional nem LinkedIn. Escolhe buscar uma troca, compartilhar ou ambas; áreas e temas são categorias de todas as áreas profissionais. Pode incluir foto opcional e disponibilidades de manhã/tarde/noite, com fuso de Brasília.

Na home escolhe um objetivo principal e pode registrar até 400 caracteres de contexto, que nunca vão para a IA. A curadoria aprova perfis; essa aprovação não chama mais a IA paga. Registrar uma solicitação escolhe deterministicamente uma candidata e, quando ambas consentem, cria um trabalho para a função Gemini. A interface oferece uma recomendação por vez. Somente a dona da solicitação pode revisar a mensagem e clicar em “aprovar e enviar convite”. Não há mensagens automáticas nem catálogo.

O convite fica pendente até a destinatária aceitar. O compartilhamento usa uma nova tabela de contatos, sem copiar nenhum dado do Auth ou dos contatos antigos. LinkedIn, WhatsApp, e-mail e Meet são opcionais, editáveis e liberados individualmente conforme os canais autorizados; não existe obrigação de reciprocidade. O banco impede contatos antes do aceite e para terceiros. Bloquear revoga acesso e impede novas sugestões/convites.

As participantes escolhem um aplicativo externo. Para chamada, veem os períodos comuns e confirmam manualmente o mesmo horário. Uma delas cria um link Meet manualmente e o salva no perfil. Não há Calendar/Meet API, mensagens internas ou gravação. Cada uma informa se a conversa ocorreu, nota 1–5 e resultado categórico. Ausência de resposta não é encontro realizado.

## arquivos novos principais

- `src/pages/InicioProfissional.tsx`, `PerfilProfissional.tsx`, `ConversasProfissionais.tsx`, `IndicadoresMvp.tsx`: jornada e indicadores.
- `src/lib/professional.ts`: categorias, tipos e rótulos.
- Migrations `20261116000012_mvp_conversas.sql`, `20261116000013_mvp_worker.sql` e `20261116000014_mvp_compatibilidade.sql`: tabelas, seleção, contatos, consentimentos, feedback, bloqueios, métricas e fila. Datas são identificadores de ordenação, não evidência de aplicação.
- `supabase/functions/conversa-ia/core.ts` e `index.ts`: minimização, chamada Gemini, validação e registro.
- `supabase/tests/mvp_test.sql`, `tests/conversa-ia.test.mjs`, `tests/mvp-browser.mjs`: autorização, contratos e interface.

Alterados: App/rotas, cabeçalho/rodapé, entrada, curadoria, textos legais, config de funções, runner de RLS via inclusão da suíte nova, README e documentação.

## funcionalidades retiradas da experiência principal

Fórum/publicações/curtidas/comentários, catálogo de programas, cadastro de oito etapas e navegação antiga. URLs antigas redirecionam. Código e dados antigos continuam no repositório/banco para histórico. Não havia pitch independente, busca complexa, pagamentos ou ranking público nesta implementação; não foram criados.

A função antiga `recomendar` foi substituída no código por uma resposta 410, sem chamadas pagas. Isso só vale no remoto após deploy autorizado dessa função. Não confundir código preparado com endpoint remoto atualizado. As novas migrations removem os gatilhos legados Anthropic/Make, sem apagar tabelas ou funções históricas.

## ativação — exige autorização posterior

1. Revisar backup/exportação e o histórico real de migrations do projeto. Não rodar `db push` cegamente: algumas alterações anteriores foram aplicadas pelo SQL Editor e podem não estar registradas. Não reaplicar migrations 001–011 em banco existente.
2. Aplicar somente as migrations MVP de 16/11 (012, 013 e 014), em ordem, após revisão. Foram testadas em Postgres descartável e depois aplicadas em produção sob autorização, com registro no histórico de migrations. Novas tabelas não importam automaticamente contatos privados nem convertem perfis reais: as participantes completam o cadastro profissional e consentimentos.
3. Verificar Security Advisor e RLS. Testar com contas autorizadas em staging, sem publicar nem usar dados reais em provedor de IA.
4. Antes de ativar Gemini, confirmar no AI Studio projeto **sem faturamento**, disponibilidade no Brasil, modelo com cota gratuita efetiva, termos de dados, limites por minuto/dia e formatos estruturados. Sem essa confirmação, não definir `GEMINI_FREE_TIER_CONFIRMED=true`.
5. Guardar `GEMINI_API_KEY`, `GEMINI_MODEL` e a confirmação acima apenas em secrets das Edge Functions. Não usar a chave pública do Supabase nem a Anthropic. Não comprar créditos nem adicionar cartão. Se houver dúvida de faturamento, não fazer o teste.
6. Publicar `conversa-ia` e a aposentadoria de `recomendar` somente com autorização. A função nova autentica via cabeçalho `x-mvp-secret`, não pelo frontend. O navegador não recebe nem usa esse segredo.
7. Criar no Vault `mvp_worker_url` (URL HTTPS da função) e `mvp_worker_secret` (segredo hexadecimal de 64 caracteres, gerado com `openssl rand -hex 32`) pelo painel seguro. O worker lê o segredo via RPC exclusiva de service_role. Não gravar valores no Git ou neste documento.
8. Criar solicitação com duas participantes aprovadas, disponíveis e consentindo. Conferir job, entrega HTTP do pg_net, estado final, tokens e revisão humana. Só depois realizar os três testes reais previstos em `VALIDACAO.md`.
9. Aprovar publicação do frontend separadamente. A publicação do frontend e as mudanças de produção foram autorizadas após a entrega local.

Para testar localmente o worker com Supabase CLI, monte secrets em arquivo ignorado; não passe dados reais. `deno check --no-lock supabase/functions/conversa-ia/index.ts` verifica tipos, não comprova o provedor. A suíte SQL usa um stub de pg_net; confirma o gatilho e payload, mas não sua entrega HTTP real.

## limites e falhas

- 3 solicitações por participante a cada 24h; serialização por participante evita corrida.
- 30 trabalhos de IA globalmente a cada 24h; um claim por trabalho, com lock e idempotência. Contam falhas também. Estes são limites do produto, não cotas prometidas pelo Google.
- Até 700 tokens de saída, 20s de timeout, uma chamada sem retentativa automática. Categorias de no máximo oito itens. Resposta de até 400 caracteres de justificativa, duas perguntas de até 160 e mensagem de até 400.
- Sem consentimento de qualquer participante, nenhum trabalho é criado. Com configuração ausente/limite/falha, permanece o resultado básico com rótulo explícito; logs não alegam sucesso.
- Uma queda entre claim e finalização pode deixar `executando`. A curadoria deve investigar jobs sem finalização e entregas pg_net. Não reenviar cegamente: pode duplicar consumo. Não há recuperação automática nem Cron ativado nesta versão.
- Revogação após a geração impede novas chamadas; não apaga retroativamente dados já recebidos pelo provedor. Revogação durante a chamada impede publicar o resultado. O registro histórico pode ser excluído com a conta.
- Pedido sem candidata informa indisponibilidade, não inventa uma aliada. Requer outra participante aprovada e intenção complementar, tema, canal e disponibilidade compatíveis.

## testes e limitações

Build TypeScript/Vite; tipos das Edge Functions; testes SQL com RLS e contratos de job; testes Node de minimização/injeção/saída; navegador desktop e mobile com Auth/API simulados. Contagem e comandos finais em `VALIDACAO.md`.

Não verificados: Gemini real, limites/termos atuais do Google, entrega real de pg_net, login por e-mail/SMTP em staging, three real executions, consumo e billing reais, avaliadoras reais. Não há evidência de 20 casos reais ou duas rodadas humanas. Essa ausência impede chamar o projeto final de validado ou a IA de operacional.

## registro de ativação autorizada

- Projeto Supabase `mbiutzyteuvcoahhizmg`: migrations `20261116000012`, `20261116000013` e `20261116000014` aplicadas, registradas no histórico. Sete tabelas novas com RLS ativo; permissões anônimas verificadas.
- Contagens históricas preservadas na ativação: 3 contas Auth, 2 perfis, 2 consentimentos, 2 contatos e 1 conexão. Nenhum contato histórico foi importado para o perfil novo.
- `conversa-ia` publicada; URL e segredo interno no Vault. `GEMINI_FREE_TIER_CONFIRMED=false` explicitamente configurado. A compatibilidade básica funciona sem consumo de IA externa; não há chave Gemini nem teste real de geração.
- `recomendar` aposentada com HTTP 410; gatilhos antigos e aprovação automática por informar LinkedIn desativados. A função de exclusão de conta foi preservada.
- A branch remota tinha mudanças posteriores de recuperação de senha e e-mails. Elas foram integradas sem force-push; pitch, busca e mural continuam apenas no histórico, fora da navegação nova. Recuperação de senha foi testada na interface com API simulada.
- Endpoint de contatos e RPC de compartilhamento recusaram acesso anônimo em produção. Worker recusou chamada sem segredo.
- Link principal da publicação: https://aliadas-indol.vercel.app. Novas participantes e perfis antigos precisam completar o novo perfil profissional para usar a jornada. Não há conta fictícia inserida em produção pelos testes desta entrega.
