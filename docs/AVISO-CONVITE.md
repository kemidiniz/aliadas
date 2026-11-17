# Aviso de convite por e-mail: duas opções (decisão pendente)

Hoje a destinatária só vê o convite quando abre o site. A rotina da migration 021 expira convites pendentes há mais de 7 dias, mas não avisa ninguém. Nada abaixo foi implementado.

Nas duas opções, o terceiro recebe só um identificador. O e-mail é buscado no servidor, nunca vai no aviso nem fica no código, e o texto do convite não sai da aliadas.

## Opção A: novo caminho no cenário do Make do feedback

O plano gratuito do Make permite só 2 cenários ativos, por isso a ideia é um segundo caminho no mesmo cenário, e não um cenário novo.

1. Migration nova: gatilho `after insert on public.conversation_invites` chamando `public.avisa_make('make_feedback_novo_url')`. O corpo já sai como `{tabela: "conversation_invites", evento: "insert", id}`.
2. No Make, um roteador depois do webhook: se `tabela = feedback`, segue o caminho atual; se `tabela = conversation_invites`, segue o caminho novo.
3. Caminho novo: buscar o convite pelo `id` com a chave de serviço (só `recipient_id` e `state`); conferir se `state = pendente`; buscar o e-mail de login da destinatária pela API de Auth do Supabase; conferir o consentimento de aviso (coluna nova no perfil).
4. Gmail com texto fixo: "Você recebeu um convite para uma conversa na aliadas. Entre para responder: https://aliadas-indol.vercel.app/minhas-conversas". Sem nome de quem convidou e sem a mensagem.

O que vai para o Make: o id do convite. O Make busca o `recipient_id` e o e-mail com a chave guardada só na conexão dele.

Custo: cerca de 4 operações por convite, somadas às do feedback, dentro das 1.000 por mês do plano gratuito.

## Opção B: Edge Function e serviço de e-mail

1. Migration nova: gatilho `after insert on public.conversation_invites` com `pg_net`, chamando uma Edge Function nova (`aviso-convite`). A URL e um segredo ficam no Vault, no mesmo padrão da `conversa-ia`; o corpo leva só `{invite_id}`.
2. A função confere o segredo, busca o convite e o e-mail da destinatária com a service role (que existe só dentro da função), confere o consentimento e o estado `pendente`.
3. A função envia o e-mail por um serviço com plano gratuito (por exemplo, Resend ou Brevo, com domínio verificado). A chave do serviço fica só nos segredos da Edge Function.
4. O mesmo texto fixo da opção A.

O que vai para o serviço de e-mail: o endereço da destinatária e o texto fixo. Nada do perfil ou da mensagem do convite.

Comparação: a opção B não depende do Make nem do limite de operações dele, mas exige configurar domínio e mais uma chave. A opção A é mais rápida de montar.

## Para as duas opções

Consentimento no perfil, na seção Privacidade (desmarcado por padrão; nova coluna `invite_email_consent`):

> Quero receber um e-mail quando alguém me convidar para uma conversa. O e-mail diz só que há um convite, sem nomes nem a mensagem.

Trecho para /privacidade:

> Se você autorizar no perfil, avisamos por e-mail quando alguém te convidar. O aviso usa o e-mail de login, passa por [Make e Gmail | serviço de e-mail escolhido] e diz só que há um convite, sem nomes nem a mensagem.
