# Correção de abertura de páginas — 17/11/2026

## O que aconteceu

Foi reproduzida uma falha compatível com o relato de erro ao abrir Ajuda e feedback e Alianças. Uma aba já aberta pode guardar os nomes dos arquivos da versão anterior. Depois de uma publicação, esses arquivos podem deixar de existir na URL principal.

A configuração anterior encaminhava qualquer endereço para `index.html`, inclusive arquivos JavaScript inexistentes em `/assets/`. URLs de versões anteriores de Feedback e ConversasProfissionais responderam HTTP 200 com `text/html`. Ao reproduzir essa resposta na abertura das duas telas, o navegador rejeitou o módulo e exibiu **Unexpected Application Error / Failed to fetch dynamically imported module**.

Sessões novas abriram normalmente. Não houve acesso ao console da aba da participante; a reprodução foi controlada, com a mesma resposta incorreta observada nas URLs antigas.

## Correção

- As cinco páginas carregadas sob demanda — Ajuda e feedback, Alianças, Perfil, Painel e Termos e privacidade — tentam recuperar a versão atual com uma única recarga. A URL e a sessão são preservadas; a recuperação não reenvia formulários, convites ou solicitações de IA.
- Uma trava em `sessionStorage` impede recargas repetidas em 60 segundos. Sem conexão ou com esse armazenamento bloqueado, a recuperação é manual.
- Se persistir, aparece uma mensagem em português com **Atualizar página** e **Voltar à página inicial**. O menu e o rodapé continuam disponíveis. Não são mostrados detalhes técnicos do erro.
- Um tratamento geral também substitui a tela técnica padrão em falhas fora do conteúdo da página.
- A regra da Vercel deixa de encaminhar `/assets/` para o HTML da aplicação.

Abas abertas antes desta correção precisam ser atualizadas uma vez para receber a proteção nova.

## Verificações

- Build/TypeScript, 12 testes de IA e 337 verificações SQL/RLS.
- Regressão de navegador, permissões administrativas e links internos.
- Novo `npm run test:carregamento`, executado sobre o build de produção local: recuperação nas cinco páginas, falha persistente, armazenamento bloqueado, erro de execução e falta de conexão. Confere ausência de ciclo e preservação de URL/sessão; capturas em 390px e 1440px.
- Consulta de produção em transação de leitura e papel `authenticated`: leitura de cartões, dois convites autorizados, feedback próprio e lembretes sem erro. RLS ativa nas três tabelas da jornada consultadas; convites sem estados ou datas inválidas.

As falhas e contas dos testes de navegador são simuladas. Não foram criadas contas, respostas de feedback, convites ou gerações de IA em produção. Não há migration nem alteração de permissões nesta correção.
