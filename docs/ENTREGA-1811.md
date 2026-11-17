# Entrega 18/11 · redesenho do MVP

Tudo foi feito localmente. Nada foi aplicado em produção.

## O que mudou

| Etapa | Resumo |
|---|---|
| Sistema visual | A ajuda fica abaixo do campo; rótulo único; altura `h-12`; select e foto próprios; chips; grade 7×3 de disponibilidade com teclado; nota de 1 a 5; Badge, Toast, Skeleton e ícones SVG próprios; escala de 5 tamanhos; títulos em Quicksand |
| Objetivo por conversa (017) | O perfil tem "Posso ajudar com" e "Quero conversar sobre". A indicação exige que o objetivo esteja no "posso ajudar com" da outra pessoa. "Ver outra sugestão" não repete pessoas nem gasta o limite de 3 buscas por dia. Cada sugestão gera um trabalho de IA, dentro do limite global de 30 por dia |
| Sala e horários (016) | A sala aceita só `https://` de Meet, Zoom, Teams, Whereby e Jitsi. Até 3 horários nos próximos 14 dias; a outra pessoa escolhe um. Depois: "Entrar na chamada", Google Agenda e `.ics` |
| Telas | Início em painel; cartão de indicação; conversas com 5 etapas, abas e menu "⋯"; perfil com seções abertas, índice e barra de salvar; primeiro acesso em 3 passos; navegação inferior no celular; favicon, imagem de compartilhamento e meta tags |
| Textos | Landing e telas internas reescritas; perguntas frequentes; maiúscula no início das frases |
| Limpeza | Páginas antigas sem uso foram removidas (fórum, catálogo, pitch, conexões antigas). Continuam no histórico do git |

## Cliques no caminho principal (quem pede a conversa)

| Passo | Antes | Depois |
|---|---|---|
| Pedir e enviar o convite | 5 (intenção, abrir select, escolher, buscar, aprovar) | 2 (o objetivo já vem marcado: buscar, enviar) |
| Combinar o horário | 3 + digitar o texto, e as duas precisavam escrever igual | 1 (os horários já vêm sugeridos: enviar). A outra pessoa escolhe com 1 clique |
| Entrar na chamada | Procurar o link no perfil | 1 |
| Avaliar | 6 a 7 (selects) | 5 |

## Segurança

- [x] RLS na tabela nova `conversation_time_proposals`: só as duas participantes de um convite aceito, sem bloqueio.
- [x] `conversation_suggestions` não tem leitura para participantes (teste).
- [x] Os contatos e a sala só aparecem depois do aceite (`mvp_shared_contacts`); o bloqueio revoga o acesso (teste).
- [x] A IA recebe só o objetivo e categorias (áreas, momento, assuntos). Não recebe a intenção, a descrição ou a ocupação (teste do SQL e de `core.ts`).
- [x] Os limites continuam: 3 buscas em 24 h por pessoa e 30 trabalhos de IA por dia no total. "Ver outra sugestão" só percorre as compatíveis, sem repetir.
- [x] Se a sugestão mudar enquanto a IA trabalha, o resultado antigo é descartado (`sugestao_trocada`).
- [x] A RPC de horário em texto livre (`mvp_schedule`) deixou de ser oferecida; as colunas antigas foram preservadas.
- [x] Nenhuma chave no código. Os testes usam só dados `@exemplo.invalid` locais.
- [x] Contraste AA: chips 10,6:1 (claro) e 9,4:1 (escuro); selo "Realizada" 5,5:1; texto suave 7,4 a 10,1:1. O coral fica só na logo, em tamanho grande (3,2:1).
- [x] Teclado: chips (Tab + Espaço), grade (setas + Espaço) e menu "⋯" (Enter, setas, Esc). Tudo coberto pelo teste de navegador.
- [x] Movimento de 200 a 300 ms, desligado com `prefers-reduced-motion`.

## Jitsi automático (opcional): não feito

A rede desta sessão bloqueia jitsi.org, então não foi possível conferir na documentação atual se o meet.jit.si exige login para criar sala. Por isso não gerei salas automáticas. A pessoa pode colar uma sala do Jitsi no perfil, que já é aceita.

## Deploy (só depois do seu "autorizo")

1. Fazer um backup: no painel do Supabase, Database → Backups.
2. Aplicar **só** as migrations novas, nesta ordem:
   - `supabase/migrations/20261117000016_sala_e_horarios.sql`
   - `supabase/migrations/20261117000017_objetivo_por_conversa.sql`
3. Republicar a Edge Function `conversa-ia`, porque `core.ts` mudou.
4. Rodar o Security Advisor. Esperado: novos avisos de SECURITY DEFINER nas RPCs novas, já documentados aqui; nenhum "RLS disabled".
5. Publicar o frontend na Vercel a partir da branch `claude/new-session-39k0a4`.
6. Teste rápido com a sua conta: abrir o perfil (as listas novas devem vir preenchidas a partir dos temas antigos), fazer uma busca e ver um cartão ou a mensagem "Ninguém compatível agora".

**Ordem importa:** as migrations vão antes do frontend. O frontend novo chama `mvp_create_request(goal, description)`, que só existe depois da 017.

## Registro do deploy (17/11, autorizado)

- Migrations 016 e 017 aplicadas em produção (o banco não tinha perfis profissionais; nada a converter).
- `conversa-ia` republicada (versão 8, `verify_jwt` desligado como antes).
- Security Advisor: nenhuma tabela sem RLS. Avisos novos esperados: 4 RPCs de participantes (SECURITY DEFINER) e `conversation_suggestions` sem política (uso interno). Continua pendente ligar a proteção contra senhas vazadas no painel de Auth.
- Site publicado na Vercel a partir do commit d140ad2 (aliadas-indol.vercel.app).

## Correções da auditoria de 16/11 (locais, aguardando "autorizo")

| Migration | O que faz |
|---|---|
| 018 `desempate_indicacao` | Desempate por menos convites recebidos em 14 dias e sorteio; quem tem 2 ou mais convites pendentes sai da seleção |
| 019 `feedback_avisa_make` | Recria só o gatilho de feedback novo (aviso com tabela, evento e id) |
| 020 `painel_administracao` | Amplia `mvp_metrics` com perfis aguardando, pedidos sem candidata por objetivo, convites parados, denúncias abertas, feedbacks, tokens e erros do mês |
| 021 `convites_expiram` | Instala o pg_cron, cria o estado `expirado`, a rotina diária (03:07 de Brasília) e o log só para a curadoria |

### Deploy, na ordem

1. Backup: no painel do Supabase, em Database → Backups.
2. Migrations 018, 019, 020 e 021, nessa ordem. O pg_cron está disponível no projeto (1.6.4) e é instalado pela 021.
3. Vault: conferir se `make_feedback_novo_url` existe (`select name from vault.secrets where name = 'make_feedback_novo_url'`), sem mostrar o valor. Sem ele, o feedback é gravado sem aviso.
4. Republicar `conversa-ia`: o `core.ts` e o `index.ts` foram reorganizados para o script da validação, com o mesmo comportamento. É opcional, mas mantém o código publicado igual ao do repositório.
5. Security Advisor. Esperado: `conversation_expiry_runs` com RLS e política de curadoria; nenhuma tabela sem RLS.
6. Frontend: publicar na Vercel a partir da branch `claude/new-session-39k0a4`. A Vercel não publica sozinha a cada push; o deploy é disparado manualmente.
7. Conferir em produção a rotina agendada (`select jobname, schedule from cron.job`).

### Registro do deploy (17/11, autorizado)

- Migrations 018, 019, 020 e 021 aplicadas. pg_cron instalado, com a rotina `aliadas-expirar-convites` agendada para `7 6 * * *` (03:07 de Brasília).
- Gatilho `feedback_novo_avisa_make` ativo e segredo `make_feedback_novo_url` presente no Vault (valor não exibido).
- `conversa-ia` republicada (versão 9), com o mesmo comportamento.
- Security Advisor: nenhuma tabela sem RLS e nenhum aviso novo.
- Site publicado a partir do commit cb1fc8b (rodapé com © 2026 Kemily Diniz).

### Registro do deploy da nova rodada (17/11, autorizado)

- Migrations 022, 023, 024, 025, 026 e 027 aplicadas. Os 3 perfis existentes foram convertidos (situação, área principal e interesses) e o momento antigo foi preservado.
- A 028 (limpeza do banco) **não** foi aplicada: espera uma autorização separada (docs/LIMPEZA-BANCO.md).
- `conversa-ia` republicada (versão 10), com a entrada nova e o SYSTEM com a frase "lado a lado".
- Security Advisor: nenhuma tabela sem RLS. Avisos novos esperados: mvp_feedback_v2, mvp_feedback_later e mvp_feedback_metrics (funções de uso intencional). Os avisos das funções antigas só somem com a 028.
- Job `aliadas-expirar-convites` continua agendado, agora também criando os pedidos de avaliação.
- Site publicado a partir do commit 480e769.
- Make: falta atualizar o cenário para mostrar o texto da dúvida (tipo "duvida").

## Rodada de 17/11 (etapas A a G)

| Etapa | Resumo |
|---|---|
| A | O perfil só tem "Posso ajudar com" (opcional), na seção "Como você pode ajudar", com "Disponível para receber convites". O objetivo é escolhido na busca, sem nada pré-marcado. A IA não recebe mais "quero conversar sobre" |
| B | Uma margem para o site todo (contêiner de 1200px, como o cabeçalho e o rodapé); leitura com 720px e formulários com 760px, alinhados à esquerda |
| E | Rodapé com logo, links e © 2026 Kemily Diniz; "Quem somos" saiu do menu e da landing; "Como funciona" abre com o conceito |
| F | Revisão dos textos (docs/TEXTOS-REVISAO.md) |
| C | Foto: escolher, arrastar, colar e câmera no computador; recorte com zoom e posição; 640px em WebP sem metadados, até 2 MB |
| D | Perfil com 6 seções, sem "Minhas buscas" |
| G | Painel por permissão: Visão geral, Perfis, Denúncias, Feedback, IA e automações e Acessos |

| Migration | O que faz |
|---|---|
| 029 `posso_ajudar_com` | Para buscar: situação, área, interesses e um contato. Para ser indicada: isso + o objetivo em "posso ajudar com". `want_talk` deixa de ser gravado. A IA recebe de quem pede só situação, área e interesses |
| 030 `painel_por_permissao` | Permissões novas (visão geral, feedback, IA e automações); cada RPC e cada tabela das exportações checa a sua; a principal tem todas. Busca de pessoas só para a principal, com e-mail mascarado. Salvar acessos com auditoria |

### Registro do deploy (17/11, autorizado)

- Backup: as funções e políticas substituídas eram idênticas às das migrations 022 a 027 (conferido em produção antes de aplicar); o retorno é pelo histórico do git. O backup diário do Supabase continua valendo.
- Migrations 029 e 030 aplicadas. A 028 **não** foi aplicada.
- `conversa-ia` republicada (versão 11), com a entrada nova da IA.
- Security Advisor: nenhuma tabela sem RLS. Avisos novos esperados (SECURITY DEFINER com checagem de permissão dentro): mvp_permissao, mvp_conversation_metrics, mvp_ai_metrics, mvp_admin_counts, mvp_admin_search, mvp_admin_ambassadors e mvp_salvar_acessos. Continua pendente ligar a proteção contra senhas vazadas no painel de Auth.
- Conferido: as regras de perfil e foto em produção não usam as tabelas do fórum apagadas.
- Site publicado a partir do commit e923066.
