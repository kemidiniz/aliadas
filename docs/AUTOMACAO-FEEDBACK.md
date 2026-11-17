# Automação do feedback (um caminho só)

## Fluxo

1. A pessoa envia o formulário em /feedback. O banco grava a linha.
2. O gatilho `feedback_novo_avisa_make` (migration 019) avisa o webhook do Make.
3. O Make busca o feedback pelo `id` e manda um e-mail para a curadoria, com o resumo e o botão "Responder" (`mailto:` com o e-mail da pessoa, quando houver).
4. Se a pessoa deixou e-mail, o Make manda uma resposta automática de recebimento (texto fixo). A curadora responde direto pelo Gmail; não há aprovação de resposta no site.

## O que vai para o Make

O aviso leva só `{ "tabela": "feedback", "evento": "insert", "id": "<uuid>" }`, sem e-mail nem texto. O Make busca a linha no Supabase com a chave de serviço guardada só na conexão do Make (nunca no código, no git ou no site). Assim, uma chamada forjada para a URL do webhook não consegue mandar e-mail com conteúdo inventado.

Cenário de referência (ajustado pela titular no Make):
1. Webhook.
2. Supabase: buscar o feedback pelo `id` (sem os campos antigos de indicação de programa).
3. Gmail para a curadoria, com o resumo e o botão "Responder".
4. Gmail de recebimento para a pessoa, só se houver e-mail.

Os caminhos antigos "resposta aprovada" e "perfil novo" deixaram de existir: a tela de aprovar resposta foi removida e os perfis aguardando aprovação aparecem no painel da administração.

## Limites do plano gratuito do Make

- 1.000 operações por mês. Cada feedback usa cerca de 4 (webhook, busca, e-mail para a curadoria e, se houver e-mail, a resposta automática): uns 250 feedbacks por mês.
- O banco limita a 3 feedbacks por e-mail a cada 24 h e 60 por hora no total (migration 012).
- Até 2 cenários ativos.

## Como conferir as execuções

No Make, abra o cenário e a aba **History**. No plano gratuito o histórico guarda só 7 dias: tire print das execuções logo depois do teste para usar como evidência. Não mostre URLs do webhook nem e-mails nos prints.

## Configurar o segredo no Vault

A URL do webhook fica só no Vault do Supabase. No SQL Editor, uma vez:

```sql
select vault.create_secret('<URL do webhook do Make>', 'make_feedback_novo_url');
```

Para conferir se existe, sem mostrar o valor:

```sql
select name from vault.secrets where name = 'make_feedback_novo_url';
```

Sem esse segredo, o site continua funcionando e o feedback é gravado, só não há aviso.
