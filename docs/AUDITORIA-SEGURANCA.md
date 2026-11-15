# Revisão individual de SECURITY DEFINER — 15/11/2026

Diagnóstico somente de leitura em produção; nenhuma revogação em massa, alteração de papéis ou configuração de segurança foi aplicada nesta etapa. Todas as funções observadas tinham `search_path` vazio. O Security Advisor retornou 25 avisos `authenticated_security_definer_function_executable` e 1 `auth_leaked_password_protection`, sem achados de nível ERROR nessa consulta. Aviso não foi tratado como falha automaticamente: a finalidade e as verificações de cada RPC foram revisadas abaixo.

| Função | Anon executa | Participante executa | Revisão e limite |
|---|---|---|---|
| `anonimiza_ai_runs()` | não | não | Gatilho de exclusão: remove conteúdo pessoal dos logs históricos; execução de participantes revogada. |
| `aparece_na_busca(uuid)` | não | sim | Legado: exige participante aprovada e consentimento do alvo; não retorna contato. Não está na navegação nova. |
| `aprova_com_linkedin()` | não | não | Legado inativo: gatilho removido em produção pela migration 014. Sem execução direta de participantes. |
| `aprovar_indicacao(uuid,text,text,text,text)` | não | sim | Legado administrativo: exige is_curadora; não é usado na jornada nova e não dá acesso a participantes comuns. |
| `avisa_make()` | não | não | Gatilho legado desativado; segredo fica no Vault; sem EXECUTE para participantes. |
| `buscar_aliadas(text,text,text,integer)` | não | sim | Busca histórica autorizada por aprovação/consentimento; não expõe contato. Interface nova não a utiliza. |
| `conexao_aceita_com(uuid)` | não | sim | Helper ligado a auth.uid: responde apenas sobre a relação da pessoa autenticada com o alvo. |
| `denunciar_conteudo(text,uuid,text)` | não | sim | Legado: confere auth.uid e visibilidade do conteúdo; não concede funções administrativas. |
| `dispara_recomendar()` | não | não | Gatilho antigo retirado; função não executável por participante. Endpoint antigo retorna 410. |
| `eu_aprovada()` | não | sim | Helper limitado ao perfil de auth.uid. |
| `feedback_limite_envios()` | não | não | Gatilho de limite; EXECUTE revogado de participantes; não retorna contatos. |
| `forum_comentarios_de(uuid)` | não | sim | Legado com verificação de aprovação e visibilidade do post; fórum fora da interface principal. |
| `forum_feed(text,integer)` | não | sim | Legado com aprovação, visibilidade e limite; sem contatos no retorno. |
| `is_curadora()` | não | sim | Produção: papel legado confiável. Migration preparada mantém fallback apenas até bootstrap; depois somente UUID principal. Embaixadora nunca recebe esse privilégio amplo. |
| `minhas_geracoes_hoje()` | não | sim | Conta somente os registros ligados a auth.uid; não retorna logs de outras pessoas. |
| `mvp_blocked(uuid,uuid)` | não | sim | Produção: helper de bloqueio executável por participantes. Correção local preparada limita inspeção de bloqueios entre terceiros; RLS/worker continuam funcionando. |
| `mvp_cards()` | não | sim | Projeção mínima para dona da solicitação/participante do convite; exclui bloqueios. Sem contatos ou descrição livre. |
| `mvp_claim_job(uuid)` | não | não | Somente service_role. Valida dupla aprovada, disponibilidade, consentimentos, bloqueio, lock, limite global e idempotência. |
| `mvp_create_request(text,text,text)` | não | sim | auth.uid obrigatório, perfil aprovado/disponível, intenção permitida e limite por participante com lock. |
| `mvp_enqueue()` | não | não | Gatilho: ambas consentindo; segredo interno só no Vault; payload da rede contém apenas request_id. |
| `mvp_feedback(uuid,boolean,smallint,text)` | não | sim | Confere participante e aceite; impede nota sem encontro ou avaliação em nome de outra pessoa. |
| `mvp_finish_job(uuid,jsonb,text,integer,integer,text)` | não | não | Somente service_role; exige trabalho executando e revalida consentimento/bloqueio antes de publicar resultado. |
| `mvp_invite(uuid,text)` | não | sim | Pedido deve pertencer a auth.uid; candidata aprovada/disponível, sem bloqueio, revisão humana e mensagem sem contatos. |
| `mvp_match_request()` | não | não | Gatilho sem execução de participantes; filtros de elegibilidade e escolha determinística, sem serviço externo. |
| `mvp_metrics()` | não | sim | Exige is_curadora, que não é concedido a embaixadoras na migration preparada. |
| `mvp_report(uuid,text)` | não | sim | Confere relação de solicitação/convite e autor auth.uid; não permite denúncia em nome de outra pessoa. |
| `mvp_respond(uuid,boolean)` | não | sim | Somente destinatária, convite pendente, ambas aprovadas e sem bloqueio; remetente não aceita sozinho. |
| `mvp_save_profile(jsonb,jsonb,boolean)` | não | sim | Escreve somente dados de auth.uid; exige termos, valida campos e não altera status/roles. Não copia e-mail do Auth. |
| `mvp_schedule(uuid,text)` | não | sim | Somente participante de convite aceito, sem bloqueio. Cada uma altera somente sua proposta. |
| `mvp_shared_contacts(uuid)` | não | sim | Confere participação, aceite e bloqueio; retorna somente canais preenchidos E autorizados. Não usa e-mail do Auth. |
| `mvp_worker_secret()` | não | não | Segredo não exposto ao navegador; EXECUTE somente service_role. |
| `pedir_conexao(uuid,text)` | não | sim | API histórica exige aprovação/consentimento/elegibilidade e limite; não é usada pelo fluxo novo. |
| `pode_ver_foto(text)` | não | sim | Helper do bucket privado; verifica caminho e visibilidade autorizada. Não abre bucket público. |
| `pode_ver_perfil(uuid)` | não | sim | Helper de RLS com relação autorizada/consentimento no legado; não abre a tabela de contatos. |
| `responder_conexao(uuid,boolean)` | não | sim | API histórica exige destinatária e pedido pendente. Sem atualização por terceiros. |
| `segredo_webhook_recomendar()` | não | não | Segredo histórico exclusivo de service_role; participante não tem EXECUTE. |

## Novas funções administrativas, somente preparadas

A migration 015 cria funções explícitas para direitos da própria conta, bootstrap por service_role, gestão exclusiva da principal, projeções sem contatos para curadoria e atualização restrita de status. As tabelas de identidade principal, permissões e auditoria têm RLS e nenhuma escrita direta de participantes. O bootstrap só aceita uma conta já detentora do papel legado e não substitui uma principal definida. O UUID de produção foi confirmado pela titular; o script separado não foi executado.

Testes SQL locais cobrem tentativa de promoção por roles/JSON de usuário, bootstrap indevido, embaixadora criando outra embaixadora, contatos privados, consulta de indicadores sem permissão e sessão revogada. Os testes de navegador cobrem ocultação e URL direta. Funções foram revogadas/concedidas por assinatura, apenas para as funções novas; nenhum comando `REVOKE ... ALL FUNCTIONS` foi aplicado.

## Senhas vazadas

`password_hibp_enabled=false` foi observado em produção. A ativação deve ser verificada em Supabase Auth → configuração de segurança de senhas, considerando disponibilidade no plano atual. Não foi ativada nem foi contratado upgrade. Comprimento mínimo e confirmação no formulário não substituem essa proteção. O risco residual precisa constar na apresentação e no procedimento de lançamento.

## Limites desta auditoria

É uma revisão de definições/privilégios e testes de autorização da aplicação, não uma certificação de segurança. O worker ainda não gerou conteúdo real. A migration administrativa e a correção do helper de bloqueio continuam pendentes de autorização de produção; os privilégios em produção permanecem os anteriores.
