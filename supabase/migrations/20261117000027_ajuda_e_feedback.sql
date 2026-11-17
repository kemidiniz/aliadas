-- 027 · Ajuda e feedback: tipo "duvida" e métricas do feedback no Painel.
-- O limite de envios (3 por e-mail em 24 h e 60 por hora) continua valendo
-- (gatilho feedback_limite_envios da 012, que não muda).
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.feedback'::regclass and contype='c'
  and (pg_get_constraintdef(oid) ilike '%tipo = ANY%' or conname='feedback_campos_por_tipo') loop
  execute format('alter table public.feedback drop constraint %I',c.conname);
 end loop;
end;$$;
alter table public.feedback add column mensagem text check(mensagem is null or char_length(btrim(mensagem)) between 1 and 1000);
alter table public.feedback add constraint feedback_tipo_check check(tipo in ('avaliacao','indicacao','problema','duvida'));
-- campos obrigatórios de cada caminho; a dúvida exige o texto e o e-mail (para responder)
alter table public.feedback add constraint feedback_campos_por_tipo check (
  (tipo = 'avaliacao' and nota_facilidade is not null and encontrou_aliadas is not null)
  or (tipo = 'indicacao' and indicacao_nome is not null and indicacao_link is not null and indicacao_motivo is not null and indicacao_gratuito is not null)
  or (tipo = 'problema' and problema_descricao is not null and problema_pagina is not null)
  or (tipo = 'duvida' and mensagem is not null and email is not null)
);
grant insert (mensagem) on public.feedback to anon, authenticated;

-- Métricas do mês escolhido (horário de Brasília), só para quem tem acesso ao painel.
create function public.mvp_feedback_metrics(mes date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ini timestamptz:=(date_trunc('month',mes)::timestamp) at time zone 'America/Sao_Paulo';
 fim timestamptz:=((date_trunc('month',mes)+interval '1 month')::timestamp) at time zone 'America/Sao_Paulo';
begin
 if not public.is_curadora() then raise exception 'apenas curadoria';end if;
 return (select jsonb_build_object(
  'por_tipo',(select coalesce(jsonb_object_agg(tipo,n),'{}'::jsonb) from (select tipo,count(*) n from public.feedback where created_at>=ini and created_at<fim group by tipo) x),
  'nota_media',(select round(avg(nota_facilidade),2) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'notas',(select count(*) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'conectou',(select coalesce(jsonb_object_agg(encontrou_aliadas,n),'{}'::jsonb) from (select encontrou_aliadas,count(*) n from public.feedback where created_at>=ini and created_at<fim and encontrou_aliadas is not null group by encontrou_aliadas) x),
  'problemas_por_pagina',(select coalesce(jsonb_object_agg(problema_pagina,n),'{}'::jsonb) from (select problema_pagina,count(*) n from public.feedback where created_at>=ini and created_at<fim and tipo='problema' group by problema_pagina) x),
  'novos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='novo'),
  'respondidos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='respondido')));
end;$$;
revoke all on function public.mvp_feedback_metrics(date) from public,anon,authenticated;
grant execute on function public.mvp_feedback_metrics(date) to authenticated,service_role;
