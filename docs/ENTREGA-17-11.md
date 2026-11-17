# Entrega final — Aliadas, 17/11/2026

**Publicado:** https://aliadas-indol.vercel.app. Branch `claude/new-session-39k0a4`, atualizada a partir de `3f79a29`, sem recriar projeto ou apagar dados. A autorização geral “Eu autorizo você ja fazer tudo” abrangeu as publicações desta rodada. Bloco A entrou no ar antes de iniciar B.

## Resumo por etapa

| Etapa | Entrega | Commit |
|---|---|---|
| A1 | Perfil resiste à renovação/foco; rascunho por conta, recuperação/descarte, avisos e limpeza no salvar/logout | 263f9cf |
| A2 | 26 habilidades, seis grupos, busca por sinônimos, até oito; transição preserva can_help | d3a1d1b |
| A3 | Gemini ordena até três aliadas por habilidades; códigos temporários, dupla validação, plano B, limites e métricas; mensagem fixa editável | 47dda17 |
| A4 | Pool/casos-modelo, runner com mesmo core publicado, comparação com regra e consolidação de duas rodadas | 4d085b1 |
| A5 | Backup, migration 031, worker versão 12, Advisor e frontend A publicados e conferidos | ff725b2 |
| B1 | Alianças, Minhas alianças e redirecionamentos das rotas antigas | 31b54ba |
| B2 | Textos/estados em português, consumo explicado, Não aprovar com motivo opcional | b3213ec |
| B3 | Landing na ordem pedida, papel das embaixadoras no FAQ, nova etapa de IA e lema final | 9805eb3 |
| B4 | Tarefas por permissão, números, Onde falta gente, destino correto dos convites e três exports juntos | e87daf0 |
| B5 | Resposta de convite no Início; contexto recolhido; proteção do apoio e dos quatro canais | 0c26f5b |
| B6 | Três e-mails atualizados e aplicados no Auth, com backup e verificação exata da configuração | 06ab0c3 / 986fe7f |
| B7 | **Opcional, adiado.** Descoberta de habilidades por currículo não foi implementada nem exibida como beta | — |
| B8 | /sobre acessível logada; página legal única; Quem somos removida; rodapé com três links em uma linha | 8761d28 |
| Segurança final | Convite vinculado à pessoa revisada; retorno controlado da consulta; consentimento novo não presumido de checkbox/rascunho antigo | 043772b / 986fe7f |

O texto “Por que ela” mostra etiquetas de habilidades. Justificativa em texto, perguntas e rascunho de IA saíram da interface e do prompt; colunas antigas permanecem. Fórum, feed, cursos, pitch independente e rankings públicos continuam fora. Links, bloqueio, denúncia, exclusão e feedback da conversa foram preservados.

## Publicações e banco

- **A:** commit `ff725b2`, deploy `dpl_D6g5qLtNqMdRUrLW9kbBm2CFqhct`, READY e domínio público conferidos antes de B.
- **B final:** código `986fe7f`, deploy `dpl_4i2RnnntcU4ihYxxTAR9Wk4jSs23`, READY, alias `aliadas-indol.vercel.app` atribuído e confirmado.
- `conversa-ia` ACTIVE, **versão 12**, com o catálogo compartilhado. O código da função não mudou no Bloco B.
- **Migrations 031–036 aplicadas e registradas**, em transações com lock timeout e backups privados. Nenhum papel foi concedido/revogado em produção nesta rodada. A administradora principal existente foi preservada.
- Última consulta: **sete perfis profissionais preservados**, zero tabelas públicas sem RLS. Backups de schema/funções/políticas/dados afetados, bundle anterior e e-mails ficam fora do Git, em `/workspace/.aliadas-backups/`, com acesso restrito; não compartilhar esse diretório.

| Migration | Finalidade |
|---|---|
| 031 — habilidades_e_recomendacao | Catálogo, habilidades, pool privado, recomendação/automação, limites, próxima indicação e métricas |
| 032 — revisao_com_motivo | Motivo opcional de revisão, somente por RPC autorizada |
| 033 — painel_pendencias | Dúvidas sem resposta e detalhamento agregado de convites pendentes |
| 034 — contexto_e_canais_privados | Ocultar contatos acidentais no apoio; Meet depende da autorização individual |
| 035 — convite_revisado | Recusar envio se a candidata mudar entre a leitura do cartão e o clique |
| 036 — consentimento_explicito | Checkbox legado/rascunho antigo não autorizam automaticamente a finalidade nova |

## Situação real do Gemini e da automação

Os três secrets existem; modelo confirmado `gemini-2.5-flash-lite`; flag gratuita verdadeira. A titular já confirmou projeto Google sem faturamento. Não foi ativada cobrança ou contratado serviço.

Uma consulta autenticada real ao **endpoint de metadados** do Gemini retornou **HTTP 200**, reconhecendo a chave/modelo e suporte a `generateContent`. Não enviou prompt, perfis ou dados pessoais; não gerou conteúdo. A função temporária de diagnóstico foi removida.

**A geração da nova recomendação ainda não foi comprovada.** Na consulta final havia zero perfis com habilidades preenchidas, zero confirmações do consentimento novo e zero jobs. Sua conta estava aprovada/completa, mas sem a autorização da finalidade nova; não havia candidata elegível com habilidades/consentimento. O pedido real autorizado não foi disparado nessas condições: não consumimos seu limite nem inventamos perfis ou consentimentos para forçar uma execução.

Para testar: sua conta confirma a autorização da IA e salva; outra participante real aprovada salva habilidades, contato compatível, disponibilidade e autorização. Escolha um objetivo compatível no Início. Conferir em **Painel › IA e automações** uma execução concluída, modelo/tokens e indicação com selo de IA. Sem isso, o site mostra a indicação por habilidades sem IA. As três execuções reais da banca e a validação humana continuam pendentes.

## Testes e limitações

Executados ao final das etapas: `npm run build`, `npm run test:rls`, `npm run test:ia`, `npm run test:browser`; prints 390/1440 e commit em português por etapa implementada.

Resultado final:

- **276 verificações SQL passaram** em Postgres local descartável: autorização, contatos, bloqueios, limites, pool privado/15 candidatas, códigos/habilidades inventados, consentimento, ordem sem repetição e destinatária revisada.
- **Nove testes de IA passaram**, sem chamada generativa: minimização, nenhum nome/contato/id/foto, enum, consentimento e saída estruturada.
- Navegador com Auth/API simulados: cadastro, foco/rascunho, convite revisado, aceitar/recusar no Início, contatos, feedback e permissões. 375/390/768/1440, claro/escuro, sem overflow ou erros JS.
- Teste administrativo: abas por atribuição, motivo de revisão, card de convites, provas e revogação. Somente a principal gerencia acessos.
- Validação com Gemini stub: duas rodadas fictícias temporárias, maioria 2/3, plano B, ganho/regressão e comentários agrupados. Nenhum resultado fictício foi colocado nos CSVs do projeto.
- `test:links`: **50 destinos literais**, contra 23 rotas, sem links legados fora dos redirecionamentos.
- Deno check do worker/scripts e teste do worker com rede externa proibida passaram.
- Modelos de e-mail: código de oito dígitos e variáveis preservadas em prévias 360/390/1440; HTML/assuntos remotos conferidos. **Nenhum e-mail foi enviado**; SMTP/chegada na caixa de entrada não foram testados.
- Produção: landing, /sobre, redirecionamentos/âncoras legais, rota protegida e rodapé em linha 360/390/1440 conferidos. O contexto do navegador de teste aceitou o certificado do proxy do ambiente; não é auditoria de TLS.
- SQL em produção confirmou administração preservada e bloqueio de contatos/pool/claim para quem não pode acessá-los. Endpoint `conversa-ia` sem segredo respondeu **401**, sem geração.

**Advisor final:** cinco informações de RLS sem política (tabelas internas intencionalmente fechadas), 54 avisos de funções SECURITY DEFINER acessíveis a authenticated e um aviso de proteção de senha vazada desativada. Os avisos não foram silenciados com revogação em massa: RPCs novas têm escopo de dona/participante/permissão e funções internas não são públicas. Isso não significa “zero alertas”. Conferir proteção contra senhas vazadas no plano atual, sem upgrade.

## Prints

Em `/workspace/aliadas-review/`: A1…A5, B1…B6, B8, FINAL e RELEASE são capturas locais com dados de teste. `PRODUCAO-B` contém a página institucional e o rodapé do domínio publicado em 360/390/1440. Os modelos de e-mail em B6 usam código fictício de prévia.

## Cliques até enviar o convite

Partindo do **Início com perfil aprovado e completo**, pelo mouse: **quatro cliques** — abrir o menu de objetivo, escolher uma opção, Encontrar minha aliada, Enviar convite após revisar a mensagem. São três ações principais se contar a seleção do menu como uma ação. Digitação do apoio/mensagem é opcional, salvo Outro. Cada Ver outra indicação acrescenta um clique e não cria novo pedido/chamada.

Cadastro, login e aprovação humana não estão incluídos nessa contagem; o número desde uma primeira visita varia conforme os campos pendentes. Não foi medido tempo de conclusão com participantes reais.

## Passo a passo do deploy B realizado

1. Conferir branch/origin e preservar mudanças existentes; executar os testes e revisar prints.
2. Fazer backup privado antes das alterações.
3. Aplicar somente 032–035 em transação; depois 036 para a confirmação explícita. Registrar versões no histórico. **Não reaplicar 031 ou versões antigas**: migrations anteriores do Claude têm timestamps remotos diferentes dos arquivos locais, portanto não usar db push cegamente.
4. Conferir RLS, RPCs e Advisor; preservar papéis/credenciais. Worker v12 já publicado em A, sem alteração de código em B.
5. Commit/push sem force para a branch indicada; criar deploy de produção Vercel do SHA final, esperar READY e atribuição do alias.
6. Abrir o domínio, conferir rotas/âncoras/rodapé e a proteção de rota privada.
7. Com a autorização geral da titular, salvar backup dos três templates/assuntos Auth, aplicar os HTMLs e comparar o retorno da API; sem envio de teste. Instruções manuais em `EMAILS.md`.
8. Verificar pré-requisitos do pedido real; registrar o bloqueio de dados/consentimento sem simular geração. Depois das atualizações das participantes, executar e guardar evidências reais.

## Suas pendências

1. **Preencher `validacao/pool.csv` e `validacao/casos.csv`**: até 15 perfis reais consentidos/anônimos e vinte necessidades profissionais higienizadas, incluindo três ou quatro difíceis. Apagar/substituir a linha-modelo comentada. Não incluir nomes, contatos ou ids Supabase.
2. **Pedir às participantes atuais que escolham habilidades no perfil**, confirmem a autorização da IA se desejarem, verifiquem canais e salvem. Você também precisa confirmar a nova autorização. Perfis precisam estar aprovados para participar das indicações.
3. Percorrer um pedido real e comprovar três execuções; convidar três avaliadoras além de você, realizar duas rodadas e consolidar. Ainda faltam entrevistas/linha de base, resultados humanos e benefício mensurado — não apresentar metas como resultados.
4. Conferir cotas/termos gratuitos atuais nos painéis/fontes: as páginas oficiais do Gemini foram bloqueadas pelo proxy (403). A consulta de metadados não informa billing/cota gratuita. Conferir proteção de senha vazada apenas se disponível sem custo; nenhuma cobrança foi habilitada.
5. Ensaiar demonstração de até dois minutos dentro do pitch de cinco. O roteiro e a tabela de requisitos estão em `VALIDACAO.md`.

Arquivos alterados: `ARQUIVOS-ALTERADOS-17-11.txt`. Histórico preservado no Git; o arquivo removido foi a página Quem somos, incluindo seu bloco oculto, conforme solicitado.
