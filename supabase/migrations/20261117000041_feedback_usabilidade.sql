-- 041 · Três medidas opcionais de usabilidade; histórico continua sem notas inventadas.
alter table public.feedback
 add column clareza_fluxo text check(clareza_fluxo in ('1','2','3','4','5')),
 add column adequacao_ia text check(adequacao_ia in ('1','2','3','4','5','nao_usei','sem_sugestoes')),
 add column acompanhar_convites text check(acompanhar_convites in ('1','2','3','4','5','nao_cheguei')),
 add constraint feedback_usabilidade_so_avaliacao check(tipo='avaliacao' or (clareza_fluxo is null and adequacao_ia is null and acompanhar_convites is null));
grant insert(clareza_fluxo,adequacao_ia,acompanhar_convites) on public.feedback to anon,authenticated;
create or replace function public.mvp_feedback_metrics(mes date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ini timestamptz:=(date_trunc('month',mes)::timestamp) at time zone 'America/Sao_Paulo';
 fim timestamptz:=((date_trunc('month',mes)+interval '1 month')::timestamp) at time zone 'America/Sao_Paulo';
begin
 if not public.mvp_permissao('ver_feedback') then raise exception 'sem permissão para o feedback';end if;
 return (select jsonb_build_object(
  'usabilidade',(select jsonb_object_agg(campo,medida) from (
    select campo,jsonb_build_object(
      'media',round(avg(case when valor in ('1','2','3','4','5') then valor::int end),2),
      'notas',count(*) filter(where valor in ('1','2','3','4','5')),
      'positivas',count(*) filter(where valor in ('4','5')),
      'nao_usei',count(*) filter(where valor='nao_usei'),
      'sem_sugestoes',count(*) filter(where valor='sem_sugestoes'),
      'nao_cheguei',count(*) filter(where valor='nao_cheguei')) as medida
    from public.feedback f cross join lateral (values ('clareza_fluxo',f.clareza_fluxo),('adequacao_ia',f.adequacao_ia),('acompanhar_convites',f.acompanhar_convites)) v(campo,valor)
    where f.tipo='avaliacao' and f.created_at>=ini and f.created_at<fim group by campo
  ) x),
  'por_tipo',(select coalesce(jsonb_object_agg(tipo,n),'{}'::jsonb) from (select tipo,count(*) n from public.feedback where created_at>=ini and created_at<fim group by tipo) x),
  'nota_media',(select round(avg(nota_facilidade),2) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'notas',(select count(*) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'conectou',(select coalesce(jsonb_object_agg(encontrou_aliadas,n),'{}'::jsonb) from (select encontrou_aliadas,count(*) n from public.feedback where created_at>=ini and created_at<fim and encontrou_aliadas is not null group by encontrou_aliadas) x),
  'problemas_por_pagina',(select coalesce(jsonb_object_agg(problema_pagina,n),'{}'::jsonb) from (select problema_pagina,count(*) n from public.feedback where created_at>=ini and created_at<fim and tipo='problema' group by problema_pagina) x),
  'novos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='novo'),
  'respondidos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='respondido')));
end;$$;

