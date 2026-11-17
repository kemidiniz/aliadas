# Custos e sustentabilidade

Atualização: 17/11/2026. Objetivo do MVP: **não acrescentar gastos**. Não foram habilitados planos, cobrança, créditos, pagamentos ou cartões. Faturas da titular não foram auditadas; “não medido” não significa ausência de custo anterior.

| Ferramenta | Plano e limite gratuito | Custo observado | Fonte oficial / consulta |
|---|---|---|---|
| Vercel | Manter plano atual; plano/consumo da conta não confirmados | Nenhuma compra nesta tarefa | https://vercel.com/docs/plans/hobby — consulta anterior em 15/11; revalidar cotas da conta |
| Supabase | Plano existente; sem upgrade. Banco/Auth/Storage/Edge e pg_net usam cotas do projeto | Sem mudança de plano; fatura não consultada | https://supabase.com/pricing e https://supabase.com/docs/guides/platform/billing-on-supabase — confirmar no painel |
| Gemini | Modelo configurado gemini-2.5-flash-lite; titular confirmou projeto sem faturamento | Zero tokens registrados nas consultas anteriores à publicação desta rodada; não é auditoria Google Billing | https://ai.google.dev/gemini-api/docs/pricing / https://ai.google.dev/gemini-api/docs/rate-limits / https://ai.google.dev/gemini-api/terms — tentativa em 17/11 bloqueada pelo proxy (HTTP 403) |
| Automação | Postgres + pg_net + Edge; rotina diária pg_cron existente, sem nova integração externa | Nenhum serviço contratado | https://supabase.com/docs/guides/database/extensions/pg_net e https://supabase.com/docs/guides/cron |
| Domínio | Subdomínio existente vercel.app | Sem domínio novo | https://vercel.com/docs/domains |
| E-mails/Make legado | Manter configuração existente de ajuda e Auth | Fatura/cotas não consultadas; sem contratação | Painéis da titular; Make não participa da recomendação nova |
| Bibliotecas | React/Vite/TypeScript/Supabase existentes; sem API paga adicionada | Nenhuma dependência paga contratada | package.json e lockfile |

No plano gratuito Gemini, os dados enviados podem ser usados pelo Google para melhorar seus produtos. O consentimento e a página legal informam isso e apontam as fontes oficiais. O acesso a essas páginas foi bloqueado neste ambiente; não afirmar que os termos atuais ou a cota gratuita efetiva foram verificados independentemente. A função só chama a API com `GEMINI_FREE_TIER_CONFIRMED=true`. Não se deve habilitar faturamento para resolver erro de cota.

## Medições reais disponíveis

Consulta de produção, somente leitura, em 17/11 antes desta publicação: banco com **13.702.835 bytes**, zero objetos no bucket de fotos e zero bytes de fotos; zero jobs e zero tokens enviados/recebidos registrados. Seis perfis foram vistos na primeira consulta e sete disponíveis em consulta seguinte: o banco está em uso e essas fotografias não são número de usuárias ativas mensais. Tráfego, invocações gerais e faturas ainda não foram medidos.

O novo worker registra modelo, tokens enviados/recebidos (incluindo raciocínio informado), erros e datas. Não registra apoio livre ou dados pessoais. Limites do produto: três pedidos/pessoa/24h, trinta chamadas iniciadas/24h globalmente, 700 tokens máximos de saída e timeout de 14s; plano B depois de 15s. A interface faz até cinco consultas automáticas de estado por ciclo. Trocar indicação não chama IA nem cria novo pedido.

Em 17/11, uma consulta autenticada de metadados ao Gemini retornou HTTP 200 para `gemini-2.5-flash-lite`, incluindo suporte a `generateContent`. Isso confirma reconhecimento da chave/modelo, não a cota gratuita nem uma geração. Nenhum prompt ou dado de participante foi enviado. A função temporária de diagnóstico foi removida; os jobs continuam em zero.

## Projeções — hipóteses, não resultados

Hipótese de planejamento: duas solicitações por pessoa ativa/mês, uma geração por pedido, consentimento/compatibilidade em todos. Os números de pessoas abaixo são cenários propostos, não medições de uso. Definir `T_in` e `T_out` pelas três execuções reais antes de estimar tokens ou custo. O catálogo com 26 habilidades e o pool de até 15 aumentam entrada; não reaproveitar consumo médio da IA antiga.

| Cenário | Pessoas ativas hipotéticas | Pedidos/mês | Chamadas máximas | Tokens estimados |
|---|---:|---:|---:|---|
| Piloto | 10 | 20 | 20 | 20 × (T_in + T_out) |
| 10× | 100 | 200 | 200 | 200 × (T_in + T_out) |
| Expansão | 1.000 | 2.000 | Até 900 em 30 dias, distribuídos | Até 900 × (T_in + T_out) |

Até cinco consultas por pedido implicam, por hipótese, 100/1.000/10.000 consultas de status nesses cenários, além das leituras normais. Não são gerações. Fotos futuras: perfis com foto × tamanho médio, limitado a 2MB por foto; não multiplicar o tamanho total do banco linearmente, pois inclui estrutura fixa. Tráfego = visitas × bytes medidos por visita + fotos. Execuções = jobs + funções de conta; medir nos painéis.

Na expansão, o limite interno de trinta chamadas/dia restringiria a IA antes de atender dois mil pedidos/mês. Uma cota Gemini por minuto ou limite Supabase/Vercel pode chegar antes: sem cotas atuais e consumo real, não há evidência para ordenar esses limites externos. Planejar a validação em dias diferentes e continuar com o plano B ao atingir cotas, sem compra automática.

## Sustentabilidade

Acesso essencial gratuito durante o MVP. Contribuições voluntárias e apoio institucional podem ser estudados no futuro, sem influenciar recomendações, acesso, avaliações ou prioridade. Não implementar pagamento agora.

Avaliar receita quando medições demonstrarem ultrapassagem persistente de cotas ou custos operacionais que não caibam nos planos atuais; não há data ou receita mínima calculável sem medições. Antes de contribuições ou monetização, conferir https://vercel.com/docs/limits/fair-use-guidelines e os termos comerciais vigentes do plano Vercel. Não presumir que doações sejam permitidas no Hobby. Reduzir chamadas ou limitar o piloto são alternativas sem novos gastos.
