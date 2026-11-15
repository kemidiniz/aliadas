# aliadas

MVP de conexões profissionais entre mulheres universitárias e profissionais de qualquer área, incluindo mulheres cis e trans e pessoas não binárias. Não é rede social, terapia nem mentoria formal.

## jornada

**início → perfil em uma página → objetivo → uma sugestão → convite revisado pela usuária → aceite mútuo → canal externo → confirmação e utilidade.**

Menu principal: início, minhas conversas, meu perfil. A curadoria fica no rodapé, em área administrativa protegida. Fórum e catálogo saíram da navegação; tabelas e migrations históricas continuam preservadas.

React + Vite + TypeScript + Tailwind + Supabase. Compatibilidade básica determinística e opcionalmente Gemini em Edge Function, com consentimento e sem texto livre ou dados pessoais.

## desenvolvimento local

```bash
npm ci
# configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local ignorado
npm run dev
npm run build
node --test tests/conversa-ia.test.mjs
# apenas em Postgres LOCAL DESCARTÁVEL, pois o runner recria aliadas_teste
PGHOST=... PGPORT=... PGUSER=postgres npm run test:rls
```

Use o checkout existente. Não precisa de worktree. Nenhuma nova dependência de frontend foi adicionada. O teste de navegador usa Playwright e Chromium disponíveis no ambiente; não transmite dados ao banco real:

```bash
node tests/mvp-browser.mjs
```

## situação da entrega

**Versão autorizada para produção, com migrations MVP e funções aplicadas. Link principal: https://aliadas-indol.vercel.app. Consulte o registro de ativação em docs/MVP.md.** IA externa **não validada**: os secrets estão presentes e o modelo foi identificado, mas faltam geração real e comprovação técnica de limites/termos atuais. Nenhuma cobrança foi habilitada. O produto mostra claramente “compatibilidade básica • sem IA generativa” enquanto não há resultado real e validado do provedor.

- [Entrega e ativação](docs/MVP.md): arquivos, migrations, limites, comandos e pendências.
- [Segurança e RLS](docs/SEGURANCA.md): regras atuais e histórico.
- [Custos e sustentabilidade](docs/CUSTOS.md): fontes, medições e cenários.
- [Validação do projeto final](docs/VALIDACAO.md): critérios, roteiro e evidências a coletar.
- [Guia Supabase histórico](docs/SUPABASE.md): não ativar o fluxo antigo da Anthropic/Make no MVP.

Não executar deploy, migrations remotas, seed em produção ou contratar serviços sem autorização explícita. Não reaproveitar automaticamente o e-mail de autenticação como contato.

A finalização visual e administrativa foi autorizada posteriormente pela titular. A migration 015 e o bootstrap da conta principal foram aplicados e auditados; nenhuma outra conta foi promovida. Veja `docs/VALIDACAO.md` (tabela requisito/implementado/comprovado/pendente/próxima ação) e `docs/AUDITORIA-SEGURANCA.md`. A migration 015 e o bootstrap exigem autorização expressa.

Relatório objetivo da finalização: [docs/FINALIZACAO.md](docs/FINALIZACAO.md). A autorização expressa e os resultados de aplicação do backend estão registrados no relatório de finalização.
