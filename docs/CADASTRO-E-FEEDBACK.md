# Cadastro imediato e avaliação do site — 18/11/2026

## Cadastro

Após confirmar o e-mail e criar o perfil, a participante pode usar a jornada profissional sem aprovação manual. Para concluir a busca/envio de convite, fornece os contatos solicitados pelo site. Para ser indicada a outras participantes, escolhe habilidades e disponibilidade.

As regras já publicadas (037/039/040) aceitam o estado legado `pendente` como conta ativa. Foi confirmado em produção que os novos perfis nesse estado estão liberados; não foi necessário promovê-los ou alterar papéis. Contas pausadas/restritas, bloqueio e denúncia continuam protegidos. A Ajuda agora explica isso explicitamente.

## Pesquisa voluntária

Participar continua sendo escolha da pessoa. Para **enviar** a avaliação, são exigidas:

1. Foi fácil usar a aliadas?
2. Ficou claro o próximo passo em cada tela?
3. As habilidades sugeridas pela IA combinaram com seu objetivo?
4. Foi fácil encontrar onde acompanhar seus convites?

Quem não usou a IA ou os convites responde a opção correspondente; não precisa inventar uma nota. As perguntas posteriores permanecem opcionais. Os menus começam em **Escolha**, sem “opcional”. Dúvida e relato de problema continuam independentes da pesquisa.

## Banco e preservação

Migration **045 — feedback_quatro_perguntas**: campos obrigatórios também no banco, com versão interna. Registros existentes recebem versão 1 e mantêm seus valores, inclusive respostas ausentes. Novas avaliações recebem versão 2 e precisam das quatro respostas. A versão não pode ser escolhida pelo navegador. O painel pode continuar respondendo/atualizando registros históricos, sem preenchê-los artificialmente.

A pergunta sobre ter conseguido se conectar passa a aceitar ausência de resposta; isso não conta como “não”. Métricas existentes excluem valores ausentes das respectivas contagens. Não foram criados resultados de pesquisas ou avaliações humanas em produção para testar.

## Verificações

Build/TypeScript, 12 testes de IA, três testes específicos do formulário, 401 verificações SQL/RLS, navegador e administração. O navegador testa o fluxo com conta `pendente`, rejeição de avaliação incompleta antes da rede, envio das quatro respostas e quinta resposta vazia. A suíte SQL confirma a exigência no banco, impossibilidade de escolher a versão antiga, preservação/tratamento do histórico e cadastro ativo sem aprovação. Capturas em 390px e 1440px.
