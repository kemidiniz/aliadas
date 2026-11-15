# custos e sustentabilidade — 15/11/2026

Objetivo: **nenhum novo gasto**. Não foram ativados billing, pagamentos, planos, cartões, créditos ou serviços novos. Não temos faturas nem consumo do painel nesta entrega: “não medido” não significa zero de custo anterior. Valores em USD somente quando há fonte verificada.

## ferramentas e fontes

| ferramenta | plano/limite/custo atual | fonte oficial e consulta |
|---|---|---|
| Vercel, frontend estático | docs confirmam Hobby gratuito: 100 GB Fast Data Transfer e 10 GB Fast Origin Transfer/mês, 100 deploys/dia. Plano e consumo reais da conta não inspecionados | https://vercel.com/docs/plans/hobby — acessível em 15/11/2026 |
| Supabase, DB/Auth/Storage/Edge Functions | plano, cotas e consumo reais não verificados nesta tarefa. Continuar plano existente, sem upgrade | https://supabase.com/pricing e https://supabase.com/docs/guides/platform/billing-on-supabase — acesso bloqueado no ambiente em 15/11/2026; confirmar antes de ativar |
| Gemini API | secrets presentes; modelo gemini-2.5-flash-lite identificado; titular confirmou projeto sem faturamento. Cota/termos atuais e resposta real ainda NÃO comprovados. Não há jobs nem tokens registrados nesta jornada | https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/rate-limits, https://ai.google.dev/gemini-api/terms — acesso bloqueado em 15/11/2026 |
| automação | gatilho Postgres + pg_net + Edge Function nas mesmas cotas Supabase; não há Make no fluxo novo nem Cron ativado. Sem serviço adicional contratado | https://supabase.com/docs/guides/database/extensions/pg_net e https://supabase.com/docs/guides/cron — disponibilidade e cotas no projeto devem ser verificadas |
| domínio | usa subdomínio existente `vercel.app`; não foi registrado domínio novo. Custo eventual de domínio próprio não medido | https://vercel.com/docs/domains — confirmar condições futuras |
| dependências | não foram adicionadas dependências pagas. Bibliotecas e ferramentas locais não comprovam ausência de custos de hospedagem | package.json e lockfile do projeto |

As páginas oficiais do Gemini e Supabase foram tentadas e bloqueadas pela rede. Não usamos números antigos da memória para alegar cota gratuita ou preço atual. Revalidar as fontes e salvar evidências antes do teste remoto. A chave deve pertencer a projeto sem billing; não contar apenas com a presença de “free tier” no nome do modelo.

## medições reais disponíveis

Consulta de produção somente de leitura nesta finalização: 0 perfis profissionais, 0 solicitações, 0 jobs, soma de tokens de entrada e saída igual a 0. É consumo registrado pelo Aliadas, não auditoria de toda a conta Google ou faturas. A tentativa de ler o plano da equipe Vercel foi recusada com HTTP 403; não solicitamos permissões extras nem inferimos o plano.

Os testes locais registram tokens **sintéticos** apenas para validar persistência. Não representam consumo real de IA. O build local gera `dist/`; seu tamanho não é tráfego mensal. Ainda faltam exportações do consumo real de banco, storage, funções e tráfego. Instrumentação preparada: `conversation_jobs.input_tokens`, `output_tokens`, `state`, `error_code`, `model`, timestamps.

## projeções com hipóteses explícitas (não são resultados)

Hipótese ilustrativa: 2 solicitações por pessoa ativa/mês; até uma chamada de IA por solicitação; 100% das duplas consentem. Tokens médios de entrada `T_in` e saída `T_out` serão medidos nas três execuções reais. Fotos: `S_foto` médio medido, até 2 MB por upload; tráfego: `B_visita` medido em navegador.

| cenário hipotético | pessoas ativas | solicitações/mês | chamadas máximas antes do limite global | tokens projetados |
|---|---:|---:|---:|---|
| piloto | 10 | 20 | 20 | 20 × (`T_in` + `T_out`) |
| 10× | 100 | 200 | 200 | 200 × (`T_in` + `T_out`) |
| expansão | 1.000 | 2.000 | até 900 em 30 dias, com limite de 30/24h | até 900 × (`T_in` + `T_out`) |

Distribuição temporal importa: mesmo 20 pedidos no mesmo minuto podem exceder a cota por minuto do provedor. O limite global de 30 por dia pode ser alcançado primeiro na expansão; não é possível afirmar se ele precederá as cotas reais do Gemini/Supabase enquanto elas não forem verificadas. Ao atingi-lo, continua a compatibilidade básica, sem habilitar cobrança. O limite de 700 tokens de saída é técnico, não uma estimativa de consumo médio.

Armazenamento estimado = perfis × `S_foto` + tamanho real das tabelas. Tráfego = visitas × `B_visita` + downloads de fotos. Funções = trabalhos acionados + exclusões de conta. Comparar essas fórmulas com cotas oficiais confirmadas; não extrapolar valores de fatura sem medições.

## sustentabilidade futura

A experiência essencial permanece gratuita. Contribuições voluntárias e apoio institucional podem financiar manutenção, desde que não influenciem recomendação, avaliações, prioridade ou acesso. Nenhum pagamento será implementado no MVP.

Antes de receber contribuições ou monetizar, revisar https://vercel.com/docs/limits/fair-use-guidelines e os termos comerciais vigentes. A página Hobby foi consultada, mas não basta para concluir que doações ou exploração comercial são permitidas. Sem confirmação, não aceitar contribuições nesse plano.

A plataforma precisará avaliar receita quando medições mostrarem ultrapassagem persistente de cotas gratuitas ou necessidade operacional de plano pago. A decisão exige faturas/cotas atuais e orçamento autorizado, não apenas crescimento hipotético. Alternativas: reduzir chamadas, limitar piloto ou manter fallback antes de contratar planos.

## Atualização de consumo e interface

A titular confirmou que o projeto Google da chave não tem faturamento habilitado; esse é um relato da titular, não uma leitura independente do Google Cloud Billing. Nenhum meio de pagamento foi adicionado. O modelo confirmado por metadados é `gemini-2.5-flash-lite`; a chave não foi lida ou exibida. Falta uma chamada real para confirmar validade/cota/modelo.

O frontend consulta o estado de um job no máximo oito vezes por ciclo, durante aproximadamente 30 segundos. Pausa se a página estiver oculta e exige atualização explícita depois do limite. No cenário hipotético de 200 solicitações/mês, são até 1.600 consultas de estado por ciclo automático, além de leituras normais; isso não é consumo medido. São operações de banco, não 1.600 gerações de IA.

A função preparada passa a registrar tokens de raciocínio junto aos tokens de saída quando o provedor os informar. A função foi atualizada após autorização, mas esse consumo ainda não foi medido em uma geração real. A fonte Inter é servida pelo próprio site, sem API de fontes, serviço ou cobrança adicional.
