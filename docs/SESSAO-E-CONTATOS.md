# Sessão, contatos e feedback — 17/11/2026

- **Sessão:** o Supabase já tinha JWT de 3.600 segundos, renovação ativa e nenhum encerramento por inatividade ou tempo máximo. Essa configuração de uma hora foi confirmada, sem ativar recursos pagos. Corrigida uma falha da interface: uma leitura temporariamente indisponível podia substituir o perfil por vazio e encaminhar a participante ao cadastro. Agora preserva o perfil conhecido; numa primeira leitura com falha, oferece tentar novamente. Ao voltar à aba ou recuperar conexão, o SDK confere e renova o token quando necessário. Uma leitura inicial antiga também não sobrescreve um evento de autenticação mais recente. Saída explícita e invalidação verdadeira de sessão continuam sendo respeitadas.
- **WhatsApp:** seletor de países com Brasil (+55) como padrão. A participante informa DDD e número; o código internacional é incluído automaticamente. Colar número internacional identifica o país quando possível; números existentes são preservados. O formato salvo continua E.164 e o acesso aos contatos continua no banco, após aceite mútuo.
- **Rodapé:** copyright centralizado apenas no celular; links mantêm margens e tamanho anteriores.
- **Feedback:** removido "Prefiro não responder". Os três campos começam vazios, indicados como opcionais, e podem ser enviados sem seleção; o banco recebe nulo, nunca uma nota zero. As opções de não uso de IA e de não ter enviado convites continuam distinguindo situações reais.
- **Avisos de convite:** migration 043 e função `aviso-convite`; veja AVISO-CONVITE.md. A ativação depende do secret SMTP válido. O teste retornou 535/EAUTH; nenhum envio foi declarado como bem-sucedido.

## Verificação

Build/TypeScript, 12 testes da IA, dois testes do aviso e 359 verificações SQL/RLS. Navegador e administração conferem o fluxo existente, renovação simulada com validade de uma hora, falha inicial/temporária de perfil, países Brasil/Portugal/Reino Unido, preferência de e-mail, campos opcionais e centralização. Capturas em 390px e 1440px. Testes de autenticação usam API simulada, sem criar contas, conversas ou feedback de produção.

A configuração de duração foi consultada no Supabase real. Uma simulação de renovação não prova a causa exata de toda saída relatada em um dispositivo. A confirmação do momento em que o problema acontece continua útil se houver nova ocorrência.
