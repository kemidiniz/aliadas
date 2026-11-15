# validação do projeto final

## situação honesta da entrega

Desenvolvimento e testes locais concluídos; posteriormente, a usuária autorizou migrations, funções e publicação em produção. O registro da ativação está em MVP.md. Os testes completos descritos abaixo continuam sendo locais; as verificações remotas foram de esquema, permissões e endpoints sem criar dados fictícios. A compatibilidade básica funciona nos testes. A integração Gemini está implementada, mas não há chave, acesso gratuito confirmado, geração real ou dados de consumo real. A entrega **não comprova ainda** os requisitos humanos/IA do projeto final.

### evidências locais

- `npm run build`: TypeScript e build Vite.
- `npm run test:rls`: recria Postgres LOCAL descartável; suíte antiga preservada e ajustada para não exigir disparo pago, mais suíte nova `mvp_test.sql`. Inclui RLS, terceiros, contatos antes/depois do aceite, canal não autorizado, fraude de aceite/avaliação/claim, bloqueio, limites, consentimento revogado e trigger com pg_net stub.
- `node --test tests/conversa-ia.test.mjs`: três testes com várias asserções de minimização, injeção, tamanho, estrutura e exclusão de contatos. Não chama provedor.
- `deno check --no-lock supabase/functions/conversa-ia/index.ts supabase/functions/recomendar/index.ts`: tipos das funções. Não valida disponibilidade do Gemini.
- `node tests/mvp-browser.mjs`: Auth/API simulados localmente; três itens de menu, fórum redirecionado, solicitação, não envio automático, mensagem revisada, contatos por canal, feedback e cadastro sem copiar e-mail/consentimento, 390 e 1440px sem overflow ou erros JS. Não é teste real de SMTP/Supabase/IA.

Resultado local: **173 verificações SQL passaram** (121 históricas e 52 novas), três testes Node passaram, build e typecheck das funções passaram. `node tests/worker-local.mjs` também passou: executa a função Deno real com banco HTTP local simulado, autenticação interna, replay e configuração ausente; runtime sem permissão de rede externa, zero tokens. Não usar registros sintéticos dessas suítes como “execuções reais”.

## problema, público e linha de base

Hipótese de problema: mulheres universitárias e profissionais podem ter dificuldade para encontrar uma pessoa relevante para uma conversa profissional objetiva. Isso precisa ser confirmado por entrevistas/questionário autorizados; não há porcentagem ou pesquisa inventada nesta entrega. A inclusão de mulheres cis/trans e pessoas não binárias foi mantida.

Linha de base técnica verificável: versão anterior tinha cadastro de oito etapas, fórum e múltiplas áreas na navegação; código histórico Git preserva essa evidência. Nova jornada tem três itens no menu e cadastro em uma página. Tempo para completar perfil, satisfação e taxa de encontros ainda não foram medidos com pessoas reais. Não apresentar redução de tempo ou melhoria percentual sem coleta.

## quatro peças obrigatórias

1. **Banco:** registra perfil, objetivo, convite, consentimentos e feedback; RLS controla acesso.
2. **Automação:** INSERT de solicitação → filtro determinístico → candidata → job e pg_net.
3. **IA generativa:** Gemini em Edge Function para justificar a dupla e produzir duas perguntas/rascunho, apenas com consentimento; pendente validação real gratuita.
4. **Validação humana:** usuária revisa/edita o rascunho e decide se convida; destinatária decide aceitar; ambas avaliam separadamente. Avaliadoras externas testam qualidade.

Prompt completo e versão no arquivo `supabase/functions/conversa-ia/core.ts` (`SYSTEM`). Inputs externos: apenas objetivo, intenção, áreas, temas e momento categóricos. Não são enviados nomes, códigos de perfil, ids, contatos, ocupação livre, descrição da solicitação ou conversa.

## critérios definidos ANTES dos testes humanos

- Segurança: 100% dos testes de acesso proibido precisam passar. Uma exposição de contato reprova a rodada.
- Uma sugestão só é elegível se não há bloqueio, ambas aprovadas/disponíveis, intenção complementar, objetivo comum, canais e disponibilidade compatíveis.
- Justificativa: escala 1–5 para relevância ao objetivo e fidelidade às categorias. Não pode inventar fatos.
- Perguntas: duas, claras e úteis para o objetivo (1–5).
- Rascunho: editável, respeitoso e sem envio automático; clareza/utilidade 1–5.
- Caso aprovado: todas as dimensões acima com nota >=4 e nenhum problema de segurança/dado inventado. Meta de aprovação da rodada: >=80%; meta proposta para o teste, não resultado obtido.
- Usabilidade: a participante identifica a ação principal e conclui o fluxo sem ajuda. Registrar tempo e obstáculos; não definir baseline retrospectivamente para favorecer resultado.

## três execuções REAIS da automação — pendentes

Depois de autorização para staging e validação de key/termos gratuitos:

1. Preparar duas participantes autorizadas e consentindo, categorias de teste e contas aprovadas. Não usar dados pessoais em Gemini.
2. Criar uma solicitação pelo site. Guardar id de solicitação/job, timestamps, entrega HTTP pg_net e versão do modelo/prompt. Não registrar tokens secretos ou payloads pessoais.
3. Confirmar `conversation_jobs.state=concluida`, contagens reais de tokens, modo generativa, justificativa/duas perguntas e rascunho validados. Aguardar revisão humana antes de convidar.
4. Repetir para mais dois objetivos com consentimento. Conferir que há três execuções distintas reais; não duplicar registro ou reutilizar saída estática.
5. Capturar evidência higienizada das três, com revisão das participantes. Se falhar ou cota acabar, registrar falha e o resultado básico, nunca simular IA.

| execução | data | solicitação/job higienizados | modelo | tokens entrada/saída | resultado real | evidência |
|---|---|---|---|---|---|---|
| 1 | pendente | | | | não executada | |
| 2 | pendente | | | | não executada | |
| 3 | pendente | | | | não executada | |

## vinte casos reais, três avaliadoras e duas rodadas — pendentes

`docs/casos-validacao.csv` contém vinte **linhas vazias para coleta**, não vinte casos realizados. Coletar casos reais higienizados ou autorizados, com finalidade e consentimento separados. Não registrar nomes/contatos/empresas, relatos sensíveis nem conteúdos de conversa. Manter somente categorias, ids locais e evidências minimizadas. A autorização da desenvolvedora não substitui a das participantes.

Convidar três avaliadoras além da desenvolvedora; registrar A1/A2/A3, sem divulgar identidades. Na primeira rodada, cada caso é avaliado usando a mesma rubrica. Calcular aprovação = casos aprovados / casos avaliados; registrar denominador, notas, falhas e comentários higienizados. Alterar prompt/interface após os resultados; versionar mudanças. Na segunda rodada repetir os mesmos critérios e conjunto comparável, identificar o que mudou e calcular diferença em pontos percentuais. Relatar também regressões, não apenas médias melhores.

| rodada | avaliadoras | casos executados | aprovados | taxa | incidentes de segurança | versão |
|---|---|---|---|---|---|---|
| 1 | pendente | não executada | — | — | não avaliado | — |
| 2 | pendente | não executada | — | — | não avaliado | — |

## roteiro da demonstração (até dois minutos)

- 0:00–0:20: problema, participante já autorizada e perfil curto.
- 0:20–0:45: escolher objetivo, registrar pedido e mostrar log do gatilho.
- 0:45–1:10: uma sugestão, justificativa, perguntas e rascunho gerados REALMENTE; revisar e aprovar convite.
- 1:10–1:35: segunda participante aceita; canais autorizados e combinação manual.
- 1:35–2:00: confirmar encontro/avaliar utilidade e mostrar indicadores agregados.

Se a IA ainda estiver bloqueada, declarar isso e demonstrar o fallback sem chamá-lo de IA. Não acelerar artificialmente status nem usar mocks como prova real.

## pitch (até cinco minutos)

Até 1 min: problema e público com evidências coletadas. Até 2 min: demonstração acima. Até 1 min: resultados reais das duas rodadas e critérios. Até 1 min: custos medidos, projeção 10×, riscos LGPD e próximos passos. Enquanto evidências não existem, deixar campos pendentes; não afirmar que o projeto foi validado.
