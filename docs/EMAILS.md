# E-mails do código

Modelos em `supabase/templates/`: frases com maiúscula, visual vinho/coral/off-white, apresentação da primeira aliança, instrução **Perfil › Conta** na recuperação e lema final. Variáveis `{{ .Token }}` e `{{ .ConfirmationURL }}` preservadas; nenhum código real está nos arquivos.

## Como aplicar manualmente

No projeto `mbiutzyteuvcoahhizmg`, abrir **Authentication › Emails › Templates**. Antes, copiar o HTML/assunto atual para um backup privado.

| Template do Supabase | Arquivo | Assunto sugerido |
|---|---|---|
| Confirm signup | confirmar-cadastro.html | Falta pouco para sua primeira aliança |
| Magic Link | entrar.html | Seu código para entrar na aliadas |
| Reset password | recuperar-senha.html | Crie uma senha nova na aliadas |

Copiar todo o conteúdo do arquivo correspondente para o campo HTML e salvar. Não substituir as variáveis por valores. Conferir a URL do site e os redirecionamentos existentes antes de testar o botão. Não mudar SMTP, duração do token ou configuração de senha nesta ação.

A autorização geral da titular nesta rodada inclui a aplicação das mudanças. A aplicação remota dos modelos será feita após o frontend B, preservando backup e conferindo o retorno da API; o resultado fica no relatório da entrega. Não enviar e-mails a participantes para testar sem solicitação específica. Os prints usam código e links de exemplo, nunca um token real. SMTP e entrega na caixa de entrada não são comprovados por uma prévia local.
