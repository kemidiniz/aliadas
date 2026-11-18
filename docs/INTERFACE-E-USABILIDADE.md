# Interface, painel e medidas de usabilidade — 17/11/2026

## Mudanças

- Feedback, termos/privacidade, entrada e demais formulários usam a largura do container compartilhado. Não há justificação artificial de palavras.
- A navegação autenticada passa de Início para **Encontrar**; título **Encontre sua aliada**. A busca e a indicação ocupam toda a largura. Convites e lembretes ficam em Alianças.
- A foto mostra iniciais enquanto carrega e só apresenta a imagem depois do carregamento. Não aparece o texto provisório. Assinaturas são reutilizadas por até 45s em memória, com invalidação na saída/troca de conta; URLs privadas não ficam em localStorage.
- Google Meet fixo sai do perfil, das opções atuais e dos contatos exibidos. O banco guarda valores históricos, sem compartilhá-los no RPC. Novas indicações precisam de LinkedIn, WhatsApp ou e-mail em comum. Chamadas podem ser combinadas por esses canais, fora da plataforma.
- “Onde falta gente” sai do painel. Participantes e gerenciamento de acessos ficam na aba **Participantes**, com um buscador. Ninguém é listado antes de buscar. Somente a administradora principal continua concedendo/revogando permissões; embaixadoras veem só as atribuições autorizadas.
- Registros de IA, feedback, denúncias, resultados de busca e auditoria mostram três itens inicialmente, com **+ Ver mais** e **Mostrar menos**. Respostas longas têm prévia de três linhas e expansão. Exportar não se limita às três linhas visíveis.
- Alianças são agrupadas em Hoje, Últimos 7 dias e Anteriores, com três registros iniciais por aba e expansão. Mensagem/objetivo ficam recolhidos e só são consultados quando abertos, com autorização no banco.
- Os textos de apresentação usam **Para nós mulheres**. O cadastro mantém autodeclaração de pertencimento ao público e aceite dos termos. As regras de respeito e combate à discriminação permanecem.

## Conversa e avaliação: decisão recomendada

Não exigir uma nota para permitir outra busca: uma indicação, um convite ou mesmo um aceite não comprovam que houve conversa. A busca continua disponível dentro dos limites existentes.

Em Alianças, a participante pode atualizar a situação: **Sim**, **Ainda não** ou **Não vamos conversar**. Só “Sim” pede nota de utilidade e resultado. “Ainda não” agenda novo lembrete e não registra nota negativa nem encontro. “Lembrar depois” adia o aviso. O lembrete existente surge cinco dias depois do aceite, pela rotina do banco; não pressupõe que a conversa aconteceu.

Se futuramente houver uma exigência para uso contínuo, considerar apenas uma atualização breve de situação, que aceite “Ainda não”, e avaliar o impacto com usuárias antes de bloquear buscas. Esta rodada não cria esse bloqueio.

## Três perguntas novas no feedback

| Pergunta | Medida | Como tratar quem não usou |
|---|---|---|
| Ficou claro o próximo passo em cada tela? | Clareza do fluxo, de 1 a 5 | Pode não responder |
| As habilidades sugeridas pela IA combinaram com seu objetivo? | Adequação percebida, de 1 a 5 | Não usei a IA / A IA não trouxe sugestões |
| Foi fácil encontrar onde acompanhar seus convites? | Facilidade de acompanhamento, de 1 a 5 | Não enviei nem recebi convites |

São opcionais. Respostas antigas continuam sem notas novas. O painel mostra média, número de notas, quantidade/proporção de 4 e 5, e contagens separadas das opções não aplicáveis. Ausência de resposta não vale zero.

Em Painel → Avaliações e feedback, filtrar **Avaliação** e o mês desejado. **Exportar medidas (CSV)** inclui todos os registros carregados do filtro, com notas numéricas para cálculo; exclui e-mail e conteúdo aberto. O texto aberto continua disponível apenas na área administrativa autorizada, para leitura e resposta.

## Isso comprova os 20 casos de validação?

O feedback serve como evidência complementar de usabilidade e percepção sobre a IA. Não substitui a avaliação estruturada: uma resposta geral não identifica o caso testado, a entrada/saída da IA, a rodada e qual das três avaliadoras julgou o resultado. Também não comprova que uma conversa aconteceu.

Para a validação da IA, manter `validacao/casos.csv`, `pool.csv` e as duas planilhas de avaliação, ligando cada julgamento a um caso e rodada. A aprovação de um caso continua sendo duas de três avaliadoras. Não misturar a média de satisfação do site com a taxa de aprovação desses casos.

Nenhum feedback fictício ou avaliação humana foi inserido em produção para preencher indicadores.

## Banco preparado

- **040 — canais_sem_meet_fixo:** três canais atuais para busca e compartilhamento; Meet histórico preservado e não retornado.
- **041 — feedback_usabilidade:** três colunas opcionais, constraints, INSERT restrito e métricas administrativas que excluem opções não aplicáveis das médias.
- **042 — busca_unificada_de_participantes:** busca mínima de duas letras, dados profissionais e permissões apenas no contexto permitido; e-mail mascarado para a principal.

RLS, revisão humana, contatos após aceite mútuo, bloqueio, denúncia, limite de três objetivos e trinta gerações globais permanecem. Não há alteração da função generativa nem necessidade de novas chaves. As três gerações reais documentadas em EVIDENCIAS-IA.md continuam no histórico.

## Verificações da entrega

Build/TypeScript, 12 testes da IA, 337 verificações SQL/RLS (incluindo o contrato histórico e os atuais), testes de navegador em claro/escuro e de administração por permissão, envio das três respostas opcionais e exportação completa com histórico limitado a três na tela. Capturas em 390px e 1440px. O teste da foto atrasou o carregamento da imagem, confirmou a ausência do texto provisório e verificou reutilização da assinatura ao voltar ao perfil.

As respostas de usabilidade dos testes são simuladas e ficam fora do banco de produção. Os testes não criaram contas nem consumiram gerações do Gemini em produção. Avaliações humanas e sua vinculação aos vinte casos continuam pendentes.

## Complemento mobile

As etapas de Encontrar usam três colunas fixas, com números destacados e rótulos curtos no celular. Em Alianças, as quatro etapas têm a mesma posição inicial e espaço reservado para duas linhas, alinhando Contatos liberados às demais. Alinhamento conferido no navegador em 375, 390, 768 e 1440px, além das capturas em 390/1440. Ajuste somente de interface, sem nova migration.

Os três passos da página institucional **Sobre nós** preservam a disposição anterior: empilhados no celular e lado a lado no desktop. O novo alinhamento aplica-se à busca com IA e às Alianças. Os indicadores da página institucional receberam os textos e as legendas solicitados, mantendo fontes clicáveis, datas dos estudos e a observação sobre economias, países e territórios.
