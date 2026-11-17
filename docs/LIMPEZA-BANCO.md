# Limpeza do banco (migration 028): só com autorização separada

Esta migration apaga as tabelas e as funções do produto antigo (fórum, programas, recomendações antigas, conexões antigas, contatos do cadastro antigo e registros da IA antiga). Ela foi preparada e testada **só localmente**. Não aplicar em produção sem um "autorizo" específico para ela.

## O que sai (contagem conferida em produção em 17/11, só leitura)

| Tabela | Linhas | Usada por |
|---|---|---|
| forum_posts | 0 | forum_feed, forum_protege, denunciar_conteudo, pode_ver_foto + gatilho forum_posts_protege |
| forum_comentarios | 0 | forum_comentarios_de, forum_protege, denunciar_conteudo, pode_ver_foto + gatilho forum_comentarios_protege |
| forum_curtidas | 0 | forum_feed |
| programs | 3 | aprovar_indicacao; chave estrangeira feedback.program_id |
| program_recommendations | 0 | nada |
| recommendations | 0 | pedir_conexao, pode_ver_perfil |
| connections | 1 | pedir_conexao, responder_conexao, conexao_aceita_com, pode_ver_perfil |
| contacts | 2 | salvar_cadastro + gatilho contacts_updated_at |
| ai_runs | 4 | anonimiza_ai_runs (gatilho em profiles), minhas_geracoes_hoje |
| conversation_time_proposals | 0 | mvp_propose_times, mvp_confirm_time |

Funções apagadas (todas conferidas em produção, sem outra função usando as tabelas acima): anonimiza_ai_runs, aparece_na_busca, aprova_com_linkedin, aprovar_indicacao, buscar_aliadas, conexao_aceita_com, denunciar_conteudo (sem uso no site), dispara_recomendar, forum_comentarios_de, forum_feed, forum_protege, minhas_geracoes_hoje, pedir_conexao, pode_ver_foto, pode_ver_perfil, responder_conexao, salvar_cadastro, segredo_webhook_recomendar, toca_updated_at, mvp_propose_times, mvp_confirm_time e mvp_schedule.

Antes de apagar, a migration:
1. cria `mvp_pode_ver(alvo)`: posso ver o perfil e a foto de alguém se sou eu, tenho acesso ao painel ou existe entre nós uma indicação, um pedido ou um convite (em qualquer estado), sem bloqueio;
2. reescreve as três políticas que usavam as funções antigas: "perfis: vejo quando tenho motivo" (profiles), "fotos: vejo quando posso ver o perfil" (storage.objects) e "denúncias: denuncio quem eu vejo" (reports);
3. remove, uma a uma, os gatilhos, as políticas das tabelas que saem e as chaves estrangeiras `feedback.program_id`, `reports.post_id` e `reports.comentario_id` (as colunas ficam, vazias);
4. só então apaga as funções e as tabelas, sem CASCADE.

Mudança de comportamento: antes, qualquer pessoa aprovada podia ver os perfis aprovados que aceitavam aparecer na busca antiga. Agora, só vê quem tem uma indicação, um pedido ou um convite em comum (mais a curadoria).

## consents

Tem 4 linhas; 1 é de uma conta sem perfil profissional (provavelmente do cadastro antigo ou da conta da administração). As colunas são todas do cadastro antigo (`autodeclaracao`, `aceita_ser_recomendada`, `entende_contato_pos_aceite`, `sabe_que_pode_apagar`, `aceita_termo_conduta`, `aceito_em`). O cadastro atual (`mvp_save_profile`) grava todas como verdadeiras. `aceita_ser_recomendada` deixa de ser lida depois da 028 (era usada por `aparece_na_busca` e `buscar_aliadas`). A tabela não é apagada.

## Exportações antes da migration (você decide o que guardar)

No painel do Supabase, em SQL Editor, rode cada consulta e use "Export → CSV". Eu não exportei nada.

```sql
select * from public.programs order by created_at;
```

```sql
select * from public.connections order by created_at;
```

```sql
select * from public.contacts;
```

```sql
select * from public.ai_runs order by created_at;
```

`contacts` e `connections` têm dados pessoais do cadastro antigo. Apagar está de acordo com a minimização da LGPD; guarde só o que tiver motivo para guardar, em lugar seguro.

## Passo a passo do deploy (só com "autorizo" para a 028)

1. Backup: Database → Backups no painel do Supabase.
2. Exportações acima, se quiser guardar algo.
3. Aplicar `supabase/migrations/20261117000028_limpeza_produto_antigo.sql`.
4. Security Advisor: esperado nenhum aviso novo; somem os avisos das funções apagadas.
5. Teste com duas contas reais: uma pede, a outra é indicada e recebe o convite; as duas veem o perfil e a foto uma da outra. Uma terceira conta não vê. Uma denúncia funciona.
6. Remover a Edge Function `recomendar` do Supabase (já responde 410 e saiu do repositório): Edge Functions → recomendar → Delete, ou `npx supabase functions delete recomendar`. Os segredos `recomendar_url` e `recomendar_webhook_secret` no Vault deixam de ser usados e podem ser apagados depois.
