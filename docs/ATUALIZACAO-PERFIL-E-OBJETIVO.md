# Perfil e objetivo por habilidades — 17/11/2026

## O que muda para as participantes

- Cadastro libera a busca sem fila de aprovação. Contas pausadas ou restritas permanecem bloqueadas; nenhum status histórico é reescrito em massa.
- Quem não recebe convites pode buscar apoio sem oferecer habilidades. Novos perfis começam assim. Para receber convites, selecionar de uma a oito habilidades.
- Habilidades em menu com busca, grupos e etiquetas removíveis; áreas de interesse saem da seleção. Valores antigos continuam no banco.
- Índice do perfil acompanha a rolagem no celular e computador. Rascunho e avisos de alterações não salvas continuam.
- Foto é salva ao confirmar o recorte, sem depender de outros campos. Há decodificação alternativa para navegadores sem suporte a ImageBitmap. Arquivos continuam reduzidos, sem EXIF, em bucket privado.
- Objetivo escrito → IA sugere até três habilidades → participante confirma → banco encontra quem oferece essas habilidades. É possível pedir outras até duas vezes ou escolher manualmente. Sem IA, seleção manual explícita, sem simulação de geração.
- O banco prioriza maior número de habilidades em comum, menos convites recentes e sorteio. O cartão informa quando cobre apenas parte das habilidades. Nenhum dado de candidatas vai ao Gemini.
- Painel: Participantes substitui aprovação; busca e filtro de contas, pausar/reativar, denúncias e tarefas sem fila de aprovação. As permissões anteriores continuam, com nomes mais claros.
- Parágrafos institucionais usam a largura disponível. Páginas legais mantêm leitura de 720px.

## Banco e automação

- **037:** conta ativa inclui os estados históricos pendente/aprovado; disponibilidade não bloqueia buscar; salvamento separado de foto; leitura de fotos pelo vínculo atual do MVP.
- **038:** tabela de objetivos com RLS, gatilho/pg_net e jobs de habilidades; confirmação humana antes da busca, escolha manual, tentativas e cotas. Convites continuam vinculados à pessoa vista. Colunas e resultados antigos são preservados.
- **039:** gestão de contas e indicadores coerentes com a finalidade nova da IA. Nenhuma concessão/revogação de papel é feita pela migration.

## Controles e limites

Três objetivos e três buscas por pessoa/24h; no máximo duas novas sugestões por objetivo; trinta chamadas de IA iniciadas/24h no total. Saída até 200 tokens, timeout do provedor 14s, até seis consultas de estado em aproximadamente 15s. Depois disso, escolha manual disponível. Não há chamada da IA ao ver outra pessoa.

O objetivo original fica somente na tabela protegida e no pedido. Ao Gemini saem situação/área da solicitante e expressões de um vocabulário profissional fechado, depois da retirada de contatos/documentos. O texto bruto, nomes, fotos, identificadores, dados de candidatas e observações de avaliadoras não saem. Esse processo pode perder nuances: deve ser avaliado com casos reais. Não há detector universal de nomes; o envio usa somente expressões previamente permitidas.

## Diagnóstico da foto

A usuária repetiu o envio e informou sucesso. No banco remoto, o bucket aceita JPEG/PNG/WebP até 2 MiB, a escrita está limitada à própria pasta e havia um objeto salvo. Não foi possível reproduzir a falha da colega nem consultar seus logs (endpoint retornou HTTP 410). Encontramos uma regra antiga de leitura e preparamos sua substituição pela relação de indicação/convite do MVP. Isso é um problema concreto de visibilidade, mas não comprova a causa da falha relatada.

## Como verificar no site

1. Perfil → Como você pode ajudar: desativar recebimento permite salvar sem habilidades; ativar pede ao menos uma.
2. Início: escrever um objetivo, autorizar o processamento informado se desejar usar IA, revisar habilidades e só então encontrar uma aliada.
3. Editar a mensagem e enviar convite; os contatos aparecem depois do aceite da destinatária.
4. Painel → Participantes: buscar, filtrar e moderar contas; Painel → IA e automações: conferir resultado, modelo, consumo e falhas.

Do Início ao convite: escrever o objetivo, analisar (1), confirmar/encontrar (2), enviar (3). Se o consentimento estiver desativado, mais um toque para autorizar; revisar as habilidades pode acrescentar marcações. Cadastro, contatos e autenticação não entram nessa contagem.

## Validação

`test:rls` verifica primeiro o contrato histórico até 036 e depois aplica 037–039 para os testes do contrato vigente. As verificações antigas não são apresentadas como validação da nova finalidade. Testes de navegador usam Auth/API simulados; testes de worker e instrumentos usam stub local. Isso não comprova vinte casos reais, três avaliadoras, duas rodadas ou três execuções reais do gatilho.

As próximas gerações reais exigem consentimento da participante no site. Na consulta anterior à publicação: 11 perfis, três com habilidades, dois pedidos legados e zero jobs; a conta principal estava sem consentimento atualizado de IA. Não foi alterado esse consentimento administrativamente.


## Publicação e evidências

Migrations 037, 038 e 039 aplicadas em transações, com backup privado prévio; conversa-ia republicada. Teste real autorizado pela titular: três gerações concluídas e uma falha anterior de modelo preservada. Modelo configurado pelo alias gemini-flash-lite-latest, com versão real gemini-3.5-flash-lite gravada. Ver [evidências da IA](EVIDENCIAS-IA.md). Nenhuma escolha de habilidade ou convite foi confirmada em nome da participante.

Verificações: build e TypeScript; 315 checks SQL (276 do contrato histórico e 39 do vigente); 12 testes Node da IA; worker Deno local autenticado sem rede externa; navegador em 375/390/768/1440, claro e escuro; administração por permissões; CSV das duas rodadas com stub; links internos. Capturas em 390/1440, com rodapé também em 360.

Security Advisor: nenhum alerta ERROR na consulta; 62 avisos de funções SECURITY DEFINER executáveis por autenticadas (incluem RPCs necessárias com validação interna e funções legadas), cinco informações de RLS sem policy e aviso de proteção de senhas vazadas. Não equivale a afirmar que todo aviso foi eliminado. Funções novas têm search_path fixo, permissões mínimas e verificações de conta/dona/papel; negativas foram testadas. Funções legadas continuam para revisão específica, sem revogação em massa. Proteção de senhas vazadas permanece uma configuração pendente.
