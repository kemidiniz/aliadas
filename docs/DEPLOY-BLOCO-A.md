# Publicação do Bloco A — 17/11/2026

Autorização nesta conversa: “Eu autorizo você ja fazer tudo”. Branch `claude/new-session-39k0a4`; base atualizada de `3f79a29`. Bloco B só começa depois da confirmação do frontend A no ar.

- A1: sessão/foco não recarregam o formulário; rascunho em sessionStorage por conta, recuperação, descarte, limpeza no logout/salvamento, proteção de navegação e fechamento. Senhas não entram no rascunho. A foto escolhida é preservada em memória durante renovação de sessão; após fechar/recarregar precisa ser escolhida novamente, pois o rascunho textual não serializa fotos.
- A2: 26 habilidades em seis grupos, busca por sinônimos, até oito; transição preserva can_help. Catálogo único compartilhado com worker/script e referência no banco.
- A3: IA ordena até três candidatas por habilidades; códigos efêmeros, schema com enums, dupla validação, plano B, troca sem nova geração/pedido e métricas. Justificativa, perguntas e rascunho antigos fora da tela. Mensagem fixa, editável e enviada só por clique.
- A4: pool/casos somente com cabeçalho e linha-modelo; runner reutiliza core publicado; comparação com regra, consenso 2/3 e consolidação de duas rodadas. Não há resultados humanos inventados.

## Banco e função

Backup protegido fora do repositório, em `/workspace/.aliadas-backups/`: schema/funções/políticas/grants e linhas afetadas; bundle anterior do worker e Advisor antes/depois. Não publicar o backup: contém dados privados. Os sete perfis presentes na aplicação da migration foram preservados.

Migration `20261117000031_habilidades_e_recomendacao.sql` aplicada em transação, com lock timeout, e registrada com versão `20261117000031`. Não reaplicadas migrations antigas: as versões de algumas aplicadas pelo Claude têm timestamps diferentes dos arquivos locais. Não usar db push sem reconciliar o histórico.

`conversa-ia` republicada e ACTIVE, versão 12, com o catálogo compartilhado incluído. Secrets não foram lidos em texto nem alterados; sem ativação de faturamento.

## Testes

Em A1/A2/A3/A4/A5: build, test:rls, test:ia, test:browser. Prints 390 e 1440 em `/workspace/aliadas-review/A1`…`A5`. Deno check do worker e scripts, test:worker e test:validacao com stubs locais também passaram. Testes SQL incluem limites, consentimentos, pool de 15, saída inventada, ordem e não repetição. Navegador usa Auth/API simulados: não é prova do Gemini real.

Produção: verificações em transação revertida preservaram a administradora principal, confirmaram bloqueio do pool privado/claim para authenticated e ausência de leitura de contatos alheios. Advisor: cinco informações de RLS sem política (tabelas internas intencionalmente privadas), 52 avisos de RPCs SECURITY DEFINER executáveis por authenticated e um aviso de senhas vazadas desativadas. As três RPCs novas acessíveis a authenticated possuem validações de dona/participação/permissão; funções internas e pool não têm acesso público. Nenhum privilégio foi revogado em massa.

## Teste real da nova IA: impedimento observado

Após migration: zero perfis com habilidades, zero confirmações do consentimento novo e zero candidatas consentidas com habilidades elegíveis para a conta principal. Não foi criado um pedido inútil para consumir o limite de três nem foram atribuídas habilidades/consentimentos a outras pessoas. A comprovação de geração real e as três execuções continuam pendentes.

Próximo passo: duas participantes reais aprovadas salvarem habilidades e consentimento no perfil; a titular criar uma busca e conferir Painel › IA e automações. Perfis legados podem aparecer pelo plano B. O aviso de senha vazada requer verificar disponibilidade sem upgrade no painel Auth. Preços/termos atuais Gemini não puderam ser consultados devido a HTTP 403 do proxy; fontes e limitação estão documentadas.

O deploy do frontend deste commit será conferido pela API Vercel e por abertura do site antes de iniciar B. O resultado final e o identificador da publicação serão registrados no relatório da entrega.
