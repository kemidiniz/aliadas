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
