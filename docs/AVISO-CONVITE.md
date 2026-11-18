# Avisos de convites e aceites por e-mail

## Estado em 18/11/2026

**Envios ativados em produção.** A migration 044 acrescenta o aviso de aceite para quem enviou o convite, mantendo o aviso de recebimento para a destinatária. A titular cadastrou a senha de aplicativo diretamente nos Secrets. O teste SMTP retornou HTTP 200: um endereço aceito pelo Gmail e nenhum rejeitado. Foi enviada uma mensagem identificada como teste somente para o remetente configurado; isso comprova aceite pelo SMTP, não leitura ou chegada à caixa principal.

A chave `mvp_invite_email_enabled` está ativa e a rotina `aliadas-avisos-convite` está habilitada. A fila estava vazia na ativação: nenhum convite antigo foi reenviado, nenhuma conta ou aliança fictícia foi criada e nenhuma notificação de convite real foi declarada como processada neste teste. A função temporária de diagnóstico foi removida. A configuração SMTP dos códigos de login foi conferida e permaneceu igual.

O registro sem dados pessoais está em `docs/evidencias/aviso-email-ativacao-2026-11-18.json`.

## Funcionamento

1. Um novo convite pendente cria um evento `convite`, destinado a quem o recebe. A mudança real de `pendente` para `aceita` cria um evento independente `aceite`, destinado a quem enviou o convite.
2. `pg_net` chama a função com apenas identificador do convite, tipo do aviso e segredo interno. Recusas e atualizações repetidas do mesmo aceite não criam outro aviso.
3. O servidor verifica o estado esperado do convite, contas ativas, bloqueios, preferência de quem receberá o e-mail e endereço confirmado no Auth. Para o aceite, confere a preferência e o endereço da remetente.
4. Uma reivindicação atômica e a chave única `(invite_id,event)` impedem duas execuções de processarem a mesma notificação. O Gmail recebe somente o endereço de destino e texto fixo com o link para `/minhas-aliancas`. O aviso de aceite tem assunto **Seu convite de aliança foi aceito** e botão **Acompanhar aliança**.
5. O resultado é registrado separadamente por evento como enviado, ignorado ou falha, com código fechado. O registro não guarda nome, endereço ou mensagem. "Enviado" significa aceito pelo SMTP; não comprova leitura ou chegada à caixa principal.

Os avisos e resultados históricos de recebimento foram preservados como `convite`. Nenhum aceite anterior à migration 044 foi reenviado. O histórico de um tipo não é apagado quando o outro acontece.

Há um limite próprio compartilhado de 100 avisos em 24h para recebimentos e aceites, além dos limites existentes de convites. O Gmail continua sujeito às cotas da conta e compartilha seu uso com os e-mails de autenticação. Não foi contratado outro serviço.

A rotina `aliadas-avisos-convite` executa a cada cinco minutos. Reencaminha até três vezes uma chamada de fila ainda não reivindicada, mas não reenvia automaticamente uma mensagem de resultado SMTP incerto. Uma execução interrompida fica marcada para investigação. Se os envios forem suspensos pela chave de ativação, a fila aguarda sem consumir tentativas.

## Controle da participante

Em **Meu perfil → Privacidade**, a participante pode desativar "Receber e-mails de novos convites e de convites aceitos" e salvar. A mesma preferência controla os dois tipos de aviso transacional, e escolhas já salvas foram mantidas. O e-mail de acesso serve somente para o aviso; não aparece para a outra participante. A preferência é revalidada no servidor.

## Manutenção e nova configuração

A ativação inicial foi concluída. Se for necessário trocar a credencial futuramente:

1. Testar SMTP com mensagem identificada como teste apenas para o remetente configurado, sem criar alianças ou contas fictícias.
2. Confirmar aceite do Gmail e remover a função temporária de diagnóstico.
3. Criar/atualizar no Vault `mvp_invite_email_enabled` com o valor `true` e executar `public.mvp_retry_pending_invite_emails()`.
4. Conferir os registros privados da fila quando houver um novo convite real. Não reprocessar convites antigos em massa nem afirmar que uma notificação real foi entregue sem essa evidência.

Para suspender os envios, mudar a chave do Vault para `false`; convites e navegação continuam funcionando. Não expor as credenciais, o segredo interno ou os endereços das destinatárias.

## Segurança e testes

RLS ativa; fila sem SELECT para visitantes ou participantes. Somente o worker pode reivindicar/concluir/disparar envios. A preferência é alterada apenas no próprio perfil; clientes antigos preservam o valor salvo. Contatos seguem indisponíveis antes do aceite mútuo.

A suíte SQL verifica duplicidade, bloqueio, preferência, convite já respondido, acesso indevido, cota, erro incerto e ativação pendente. O teste do conteúdo do e-mail confirma texto fixo e códigos de erro sem dados pessoais. As notificações dos testes SQL são locais e revertidas; não contam como envios reais ou validação humana.

Fontes oficiais consultadas: [limites das Edge Functions](https://supabase.com/docs/guides/functions/limits) (portas 25 e 587 bloqueadas; uso de TLS na 465) e [sessões do Auth](https://supabase.com/docs/guides/auth/sessions). Os textos oficiais também foram conferidos no repositório público do Supabase.

## Verificação da extensão para aceite — 18/11/2026

383 verificações SQL/RLS, 12 testes de IA, três testes do conteúdo/erros de e-mail, build/TypeScript e navegador passaram. Os testes locais cobrem a troca correta de destinatária, dois eventos independentes, compatibilidade dos RPCs anteriores, não repetição, bloqueio, recusa, preferência e limite compartilhado. Prévias do e-mail em 390px e 1440px foram conferidas.

Em produção foram conferidos o gatilho, a migration, RLS, privilégios dos dois formatos de RPC e a função atualizada. Chamadas autorizadas com identificador inexistente reconheceram `convite` e `aceite`; um tipo inválido foi recusado. Essas verificações não criaram um convite nem um aceite real. O teste SMTP já documentado confirma a configuração existente, sem afirmar entrega de um e-mail de aceite real que ainda não ocorreu.
