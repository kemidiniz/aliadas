# Aviso de novos convites por e-mail

## Estado em 17/11/2026

Código, migration 043, fila privada e função `aviso-convite` preparados e publicados no Supabase. **Envio ainda desativado, aguardando uma senha de aplicativo utilizável no secret `ALIADAS_SMTP_PASSWORD`.** O teste SMTP foi recusado pelo Gmail (535 / EAUTH); não comprova envio nem chegada de e-mail. A função temporária de diagnóstico foi removida.

O acesso à configuração do Auth não forneceu uma credencial utilizável para esta função. Não alterar o SMTP do Auth nem enviar senhas pelo chat. A titular deve cadastrar uma senha de aplicativo do Gmail diretamente em **Edge Functions → Secrets**, no projeto existente. Host, porta 465, usuário e remetente já foram configurados como secrets privados.

## Funcionamento

1. Um novo convite pendente cria uma linha em `conversation_email_notifications`; convites anteriores à migration não são reenviados.
2. Depois da ativação, `pg_net` chama a função com apenas o identificador do convite e o segredo interno.
3. O servidor verifica convite pendente, contas ativas, bloqueios, preferência da destinatária e e-mail confirmado no Auth.
4. Uma reivindicação atômica impede duas execuções de processarem a mesma notificação. O Gmail recebe apenas o endereço da destinatária e um texto fixo com o link para `/minhas-aliancas`.
5. O resultado fica registrado como enviado, ignorado ou falha, com código fechado. O registro não guarda destinatária, nome ou mensagem. "Enviado" significa aceito pelo SMTP; não comprova leitura ou chegada à caixa principal.

Há um limite próprio de 100 avisos em 24h, além dos limites existentes de convites. O Gmail continua sujeito às cotas da conta e compartilha seu uso com os e-mails de autenticação. Não foi contratado outro serviço.

A rotina `aliadas-avisos-convite` executa a cada cinco minutos. Reencaminha até três vezes uma chamada de fila ainda não reivindicada, mas não reenvia automaticamente uma mensagem de resultado SMTP incerto. Uma execução interrompida fica marcada para investigação. Até a ativação, a fila permanece aguardando sem consumir tentativas ou enviar usando uma credencial inválida.

## Controle da participante

Em **Meu perfil → Privacidade**, a participante pode desativar "Receber um e-mail quando chegar um novo convite de aliança" e salvar. O padrão é receber o aviso transacional de novos convites. O e-mail de acesso serve somente para o aviso; não aparece para a outra participante. A preferência é revalidada no servidor.

## Ativação final

Depois de cadastrar o secret correto:

1. Testar SMTP com mensagem identificada como teste apenas para o remetente configurado, sem criar alianças ou contas fictícias.
2. Confirmar aceite do Gmail e remover a função temporária de diagnóstico.
3. Criar/atualizar no Vault `mvp_invite_email_enabled` com o valor `true` e executar `public.mvp_retry_pending_invite_emails()`.
4. Conferir os registros privados da fila quando houver um novo convite real. Não reprocessar convites antigos em massa nem afirmar que uma notificação real foi entregue sem essa evidência.

Para suspender os envios, mudar a chave do Vault para `false`; convites e navegação continuam funcionando. Não expor as credenciais, o segredo interno ou os endereços das destinatárias.

## Segurança e testes

RLS ativa; fila sem SELECT para visitantes ou participantes. Somente o worker pode reivindicar/concluir/disparar envios. A preferência é alterada apenas no próprio perfil; clientes antigos preservam o valor salvo. Contatos seguem indisponíveis antes do aceite mútuo.

A suíte SQL verifica duplicidade, bloqueio, preferência, convite já respondido, acesso indevido, cota, erro incerto e ativação pendente. O teste do conteúdo do e-mail confirma texto fixo e códigos de erro sem dados pessoais. As notificações dos testes SQL são locais e revertidas; não contam como envios reais ou validação humana.

Fontes oficiais consultadas: [limites das Edge Functions](https://supabase.com/docs/guides/functions/limits) (portas 25 e 587 bloqueadas; uso de TLS na 465) e [sessões do Auth](https://supabase.com/docs/guides/auth/sessions). Os textos oficiais também foram conferidos no repositório público do Supabase.
