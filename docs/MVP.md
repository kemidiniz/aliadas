# Aliadas — MVP por habilidades

> Atualização 17/11 (037–039): objetivo escrito → IA sugere habilidades → confirmação humana → busca determinística → convite revisado. Cadastro sem aprovação prévia; habilidades só obrigatórias para receber convites. [Detalhes atuais](ATUALIZACAO-PERFIL-E-OBJETIVO.md). Trechos de ranking de pessoas por IA abaixo são históricos.

Atualizado em 17/11/2026. Reaproveita o projeto React/Vite/TypeScript/Supabase existente; não cria rede social, mentoria formal ou chat próprio. Inclusão: mulheres cis e trans e pessoas não binárias, de todas as áreas e momentos de carreira.

## Jornada

1. Confirmar acesso por e-mail e criar perfil curto.
2. Após revisão humana, completar interesses e contatos; escolher até oito habilidades se quiser ser indicada.
3. Escolher objetivo e, opcionalmente, apoio até 300 caracteres (obrigatório em Outro).
4. Receber uma indicação, revisar a mensagem fixa editável e clicar em Enviar convite.
5. Após aceite mútuo, abrir somente os canais autorizados: LinkedIn, WhatsApp, e-mail e Google Meet. Sem compartilhamento automático do e-mail Auth, APIs de mensagens, Calendar ou criação de Meet.
6. Registrar se a conversa aconteceu, nota 1–5 e resultados. Cada participante responde independentemente; aceite ou ausência de resposta não comprova encontro. Utilidade exige confirmação e nota 4 ou 5.

Menu: Início, Alianças e Perfil. Painel só para administradora principal e embaixadoras com atribuição; as permissões são rechecadas no banco. Só a principal concede/revoga acessos. Fórum, feed, cursos, pitch independente e ranking público continuam fora.

Página institucional pública em `/sobre`, também para quem está logada. `/` mostra a instituição para visitantes e o Início para participantes. Termos e Privacidade em `/termos-e-privacidade`, com âncoras. URLs antigas redirecionam.

## Perfil estável

Carregamento por id da conta, sem sobrescrever o formulário na renovação de sessão/foco. Rascunho temporário em sessionStorage, por conta, com recuperação/descarte e aviso ao sair; apagado ao salvar/logout. Nunca inclui senha. Fotos ficam em memória durante edição e precisam ser escolhidas novamente após recarregar, pois o rascunho é textual.

Catálogo fechado de 26 habilidades em seis grupos. `src/lib/habilidades.ts` reexporta a fonte compartilhada com worker e validação; migration 031 cria referência e valida até oito ids. `can_help` histórico permanece para a transição. Sem habilidades, o Início orienta atualizar o perfil.

## IA real e plano B

O banco filtra perfis aprovados, disponíveis, canal comum, bloqueios, pares ativos e sobrecarga. Separa até 15 candidatas com habilidades e consentimento novo (`habilidades-v1`), priorizando mapa do objetivo e menos convites recentes, com sorteio no empate.

INSERT do pedido → gatilho → pg_net → Edge Function `conversa-ia` → Gemini seleciona até três habilidades necessárias e ordena até três candidatas → validação no worker e banco → revisão humana. O mapa código-pessoa e a ordem completa ficam privados no servidor. Perfil sem consentimento só participa do plano B.

O provedor recebe objetivo/categorias, habilidades e códigos C1…C15. Do apoio, só expressões do catálogo atravessam a lista permitida após remoção de contatos/documentos; nunca nomes, contatos, fotos, ids reais ou apoio bruto. O texto original é protegido no pedido e não entra em logs. A destinatária vê o contexto por RPC, com contatos acidentais ocultos. Termos do plano gratuito e possível uso dos dados pelo Google estão no consentimento/página legal.

JSON com enums e validação de habilidades efetivamente oferecidas. Justificativa, perguntas e rascunho antigos ficam no banco sem uso na tela. A IA não envia convites. Trocar indicação percorre a lista salva e depois usa o mapa fixo, sem nova geração nem pedido. Sem consentimento/cota/configuração válida, continua a regra, identificada como indicação sem IA. Após 15s, o frontend pode continuar pelo plano B.

Limites: três pedidos/pessoa/24h, trinta chamadas iniciadas/24h globalmente, 700 tokens máximos de saída, timeout de 14s e até cinco consultas automáticas de estado. Logs guardam modelo, tokens e códigos de erro, sem apoio ou dados pessoais.

## Segurança e administração

RLS nas tabelas expostas; pool privado sem grants a participantes. Contatos só após aceite e sem bloqueio; cada canal depende de autorização individual. Bloqueio, denúncia e exclusão preservados. Motivo opcional de não aprovação só pode ser gravado por revisão autorizada. Não foram alterados papéis nesta rodada.

Painel: tarefas permitidas no topo, métricas e demanda/oferta de habilidades; IA e automações reúne consumo, erros, convites pendentes agregados e três exportações para a banca. Dados de perfil/contato não são incluídos nos exports de provas.

## Publicação e evidência

Bloco A publicado sob autorização geral: migration 031, worker versão 12 e frontend commit `ff725b2`. Deploy Vercel `dpl_D6g5qLtNqMdRUrLW9kbBm2CFqhct`, confirmado READY e no domínio público antes de iniciar B. Sete perfis presentes na migração preservados; backup privado fora do Git.

Na checagem após 031, zero perfis tinham habilidades/consentimento novo; por isso a nova geração real e três execuções não foram alegadas. A presença dos secrets não comprova resposta Gemini. Consultar situação final em `ENTREGA-17-11.md`: o Gemini reconheceu chave/modelo em consulta de metadados, mas ainda não houve geração da nova recomendação por falta de habilidades/consentimentos preenchidos.

Testes: build, RLS local descartável, contratos de IA, navegador com Auth/API simulados, worker Deno com rede externa proibida, validação humana com stub e varredura de links. Evidência sintética não substitui pessoas reais nem API generativa real. Ver `VALIDACAO.md`, `CUSTOS.md`, `SEGURANCA.md` e `EMAILS.md`.

Sem novas ferramentas pagas, faturamento, pagamentos ou contas fictícias em produção. Descoberta de habilidades por currículo (B7) é opcional e fica fora desta entrega principal.
