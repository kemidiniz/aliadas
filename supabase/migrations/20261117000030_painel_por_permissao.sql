-- 030 · Painel das embaixadoras por permissão.
-- Cada aba checa a SUA permissão no servidor; a administradora principal tem todas.
-- Nada é apagado: as funções antigas (mvp_manage_ambassador, mvp_admin_members) continuam,
-- só a principal as chama, e o painel novo usa as funções abaixo.

-- 1. Permissões novas (as duas antigas continuam: review_profiles = avaliar perfis,
--    handle_reports = tratar denúncias).
alter table public.ambassador_permissions
 add column if not exists ver_visao_geral boolean not null default false,
 add column if not exists ver_feedback boolean not null default false,
 add column if not exists ver_ia_automacoes boolean not null default false;

-- 2. Uma checagem para todas as abas. Principal (ou o acesso legado antes do bootstrap)
--    tem todas; embaixadora só as marcadas, e só enquanto tiver o papel.
create function public.mvp_permissao(p text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_curadora() or exists(select 1 from public.ambassador_permissions a
  join public.roles r on r.user_id=a.user_id and r.role='embaixadora'
  where a.user_id=auth.uid() and case p
   when 'ver_visao_geral' then a.ver_visao_geral
   when 'avaliar_perfis' then a.review_profiles
   when 'tratar_denuncias' then a.handle_reports
   when 'ver_feedback' then a.ver_feedback
   when 'ver_ia_automacoes' then a.ver_ia_automacoes
   else false end);
$$;

create or replace function public.mvp_admin_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('principal',public.mvp_is_principal(),'legacy',public.is_curadora() and not public.mvp_is_principal(),
  'review_profiles',public.mvp_can_review_profiles(),'handle_reports',public.mvp_can_handle_reports(),
  'ver_visao_geral',public.mvp_permissao('ver_visao_geral'),'ver_feedback',public.mvp_permissao('ver_feedback'),
  'ver_ia_automacoes',public.mvp_permissao('ver_ia_automacoes'));
$$;

-- 3. Visão geral: só os 6 números dos cards.
create or replace function public.mvp_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare aconteceram integer;uteis integer;
begin
 if not public.mvp_permissao('ver_visao_geral') then raise exception 'sem permissão para a visão geral';end if;
 select count(*),count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4))
  into aconteceram,uteis from public.conversation_invites i where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened);
 return jsonb_build_object(
  'pending_profiles',(select count(*) from public.profiles where status='pendente'),
  'pending_invites',(select count(*) from public.conversation_invites where state='pendente'),
  'conversations_happened',aconteceram,
  'useful_rate',case when aconteceram>0 then round(uteis::numeric/aconteceram,4) end,
  'open_reports',(select count(*) from public.reports where status in ('aberta','em_analise')),
  'feedback_new',(select count(*) from public.feedback where status='novo'));
end;$$;

-- 4. Feedback, parte 2: avaliação das conversas (saiu da visão geral).
create function public.mvp_conversation_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare aconteceram integer;uteis integer;
begin
 if not public.mvp_permissao('ver_feedback') then raise exception 'sem permissão para o feedback';end if;
 select count(*),count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4))
  into aconteceram,uteis from public.conversation_invites i where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened);
 return jsonb_build_object(
  'conversations_happened',aconteceram,
  'useful_rate',case when aconteceram>0 then round(uteis::numeric/aconteceram,4) end,
  'top_marks',(select coalesce(jsonb_object_agg(m,n),'{}'::jsonb) from (select m,count(*) n from public.conversation_feedback cross join unnest(marcas) m group by m order by n desc limit 4) x),
  'feedback_requests_pending',(select count(*) from public.conversation_feedback_requests where encerrado_em is null),
  'expired_invites',(select count(*) from public.conversation_invites where state='expirado'));
end;$$;

-- Feedback, parte 1: métricas do site (027), agora com a permissão certa.
create or replace function public.mvp_feedback_metrics(mes date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ini timestamptz:=(date_trunc('month',mes)::timestamp) at time zone 'America/Sao_Paulo';
 fim timestamptz:=((date_trunc('month',mes)+interval '1 month')::timestamp) at time zone 'America/Sao_Paulo';
begin
 if not public.mvp_permissao('ver_feedback') then raise exception 'sem permissão para o feedback';end if;
 return (select jsonb_build_object(
  'por_tipo',(select coalesce(jsonb_object_agg(tipo,n),'{}'::jsonb) from (select tipo,count(*) n from public.feedback where created_at>=ini and created_at<fim group by tipo) x),
  'nota_media',(select round(avg(nota_facilidade),2) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'notas',(select count(*) from public.feedback where created_at>=ini and created_at<fim and nota_facilidade is not null),
  'conectou',(select coalesce(jsonb_object_agg(encontrou_aliadas,n),'{}'::jsonb) from (select encontrou_aliadas,count(*) n from public.feedback where created_at>=ini and created_at<fim and encontrou_aliadas is not null group by encontrou_aliadas) x),
  'problemas_por_pagina',(select coalesce(jsonb_object_agg(problema_pagina,n),'{}'::jsonb) from (select problema_pagina,count(*) n from public.feedback where created_at>=ini and created_at<fim and tipo='problema' group by problema_pagina) x),
  'novos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='novo'),
  'respondidos',(select count(*) from public.feedback where created_at>=ini and created_at<fim and status='respondido')));
end;$$;

-- 5. IA e automações: tokens e erros do mês e pedidos sem ninguém compatível.
create function public.mvp_ai_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare mes timestamptz:=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
 if not public.mvp_permissao('ver_ia_automacoes') then raise exception 'sem permissão para IA e automações';end if;
 return jsonb_build_object(
  'jobs_month',(select count(*) from public.conversation_jobs where created_at>=mes),
  'jobs_failed_month',(select count(*) from public.conversation_jobs where created_at>=mes and state='falha'),
  'tokens_month',jsonb_build_object('input',(select coalesce(sum(input_tokens),0) from public.conversation_jobs where created_at>=mes),'output',(select coalesce(sum(output_tokens),0) from public.conversation_jobs where created_at>=mes)),
  'requests_without_match',(select coalesce(jsonb_object_agg(goal,n),'{}'::jsonb) from (select goal,count(*) n from public.conversation_requests where state='sem_candidata' group by goal) x));
end;$$;

-- 6. As exportações em CSV leem estas tabelas pelo RLS: cada uma com a sua permissão.
drop policy "feedback: curadoria lê" on public.feedback;
create policy "feedback: quem pode ver feedback lê" on public.feedback for select to authenticated using(public.mvp_permissao('ver_feedback'));
drop policy "feedback: curadoria responde" on public.feedback;
create policy "feedback: quem pode ver feedback responde" on public.feedback for update to authenticated using(public.mvp_permissao('ver_feedback')) with check(public.mvp_permissao('ver_feedback'));
drop policy "logs: curadoria" on public.conversation_jobs;
create policy "logs: quem vê IA e automações" on public.conversation_jobs for select to authenticated using(public.mvp_permissao('ver_ia_automacoes'));
drop policy "expiração: curadoria lê" on public.conversation_expiry_runs;
create policy "expiração: quem vê IA e automações" on public.conversation_expiry_runs for select to authenticated using(public.mvp_permissao('ver_ia_automacoes'));

-- 7. Perfis: só os que aguardam aprovação, com os campos do perfil atual (sem contatos).
create or replace function public.mvp_admin_profiles(filter_status text default 'pendente') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_can_review_profiles() then raise exception 'sem permissão para avaliar perfis';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
  select p.id,p.apelido as name,p.status,p.created_at,pp.situacao,pp.area_principal,pp.interesses,pp.can_help
  from public.profiles p left join public.professional_profiles pp on pp.profile_id=p.id
  where p.status='pendente' order by p.created_at limit 100) x;
 return result;
end;$$;

-- Contadores das abas: só o que a pessoa pode ver.
create function public.mvp_admin_counts() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object(
  'perfis',case when public.mvp_can_review_profiles() then (select count(*) from public.profiles where status='pendente') end,
  'denuncias',case when public.mvp_can_handle_reports() then (select count(*) from public.reports where status in ('aberta','em_analise')) end,
  'feedback',case when public.mvp_permissao('ver_feedback') then (select count(*) from public.feedback where status='novo') end));
$$;

-- 8. Acessos (só a principal). O e-mail nunca sai inteiro do banco.
create function public.mvp_mascara_email(e text) returns text language sql immutable set search_path='' as $$
 select case when e is null or position('@' in e)=0 then null
  else left(split_part(e,'@',1),case when length(split_part(e,'@',1))<=2 then 1 else 2 end)||'***@'||split_part(e,'@',2) end;
$$;

create function public.mvp_admin_search(q text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare termo text:=lower(trim(coalesce(q,'')));padrao text;result jsonb;
begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 if length(termo)<2 then return '[]'::jsonb;end if;
 termo:=left(termo,80);
 padrao:=replace(replace(replace(termo,'\','\\'),'%','\%'),'_','\_');
 select coalesce(jsonb_agg(item),'[]') into result from (
  select jsonb_build_object('id',p.id,'name',p.apelido,'email',public.mvp_mascara_email(u.email),
   'ver_visao_geral',coalesce(a.ver_visao_geral,false),'avaliar_perfis',coalesce(a.review_profiles,false),
   'tratar_denuncias',coalesce(a.handle_reports,false),'ver_feedback',coalesce(a.ver_feedback,false),
   'ver_ia_automacoes',coalesce(a.ver_ia_automacoes,false)) item
  from public.profiles p join auth.users u on u.id=p.id
  left join public.ambassador_permissions a on a.user_id=p.id
  where p.id<>auth.uid() and (lower(p.apelido) like '%'||padrao||'%' or lower(u.email) like padrao||'%')
  order by p.apelido limit 10) x;
 return result;
end;$$;

create function public.mvp_admin_ambassadors() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 select coalesce(jsonb_agg(item order by nome),'[]') into result from (
  select p.apelido nome,jsonb_build_object('id',p.id,'name',p.apelido,'email',public.mvp_mascara_email(u.email),
   'ver_visao_geral',a.ver_visao_geral,'avaliar_perfis',a.review_profiles,'tratar_denuncias',a.handle_reports,
   'ver_feedback',a.ver_feedback,'ver_ia_automacoes',a.ver_ia_automacoes) item
  from public.ambassador_permissions a join public.profiles p on p.id=a.user_id left join auth.users u on u.id=a.user_id
  where a.ver_visao_geral or a.review_profiles or a.handle_reports or a.ver_feedback or a.ver_ia_automacoes) x;
 return result;
end;$$;

-- Salvar acessos: nenhuma caixa marcada = revogar.
create function public.mvp_salvar_acessos(target uuid,ver_visao_geral boolean,avaliar_perfis boolean,tratar_denuncias boolean,ver_feedback boolean,ver_ia_automacoes boolean)
returns void language plpgsql security definer set search_path='' as $$
declare algum boolean:=coalesce(ver_visao_geral,false) or coalesce(avaliar_perfis,false) or coalesce(tratar_denuncias,false) or coalesce(ver_feedback,false) or coalesce(ver_ia_automacoes,false);
begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal concede acessos';end if;
 if target=auth.uid() then raise exception 'esta ação não altera a administradora principal';end if;
 if not exists(select 1 from public.profiles where id=target) then raise exception 'pessoa não encontrada';end if;
 if algum then
  insert into public.roles(user_id,role) values(target,'embaixadora') on conflict do nothing;
  insert into public.ambassador_permissions(user_id,ver_visao_geral,review_profiles,handle_reports,ver_feedback,ver_ia_automacoes,granted_by)
  values(target,coalesce(mvp_salvar_acessos.ver_visao_geral,false),coalesce(avaliar_perfis,false),coalesce(tratar_denuncias,false),coalesce(mvp_salvar_acessos.ver_feedback,false),coalesce(mvp_salvar_acessos.ver_ia_automacoes,false),auth.uid())
  on conflict(user_id) do update set ver_visao_geral=excluded.ver_visao_geral,review_profiles=excluded.review_profiles,handle_reports=excluded.handle_reports,
   ver_feedback=excluded.ver_feedback,ver_ia_automacoes=excluded.ver_ia_automacoes,granted_by=excluded.granted_by,granted_at=now();
 else
  delete from public.ambassador_permissions where user_id=target;
  delete from public.roles where user_id=target and role='embaixadora';
 end if;
 insert into public.admin_access_audit(actor_id,target_id,action,permissions) values(auth.uid(),target,case when algum then 'grant' else 'revoke' end,
  jsonb_build_object('ver_visao_geral',coalesce(mvp_salvar_acessos.ver_visao_geral,false),'avaliar_perfis',coalesce(avaliar_perfis,false),'tratar_denuncias',coalesce(tratar_denuncias,false),
   'ver_feedback',coalesce(mvp_salvar_acessos.ver_feedback,false),'ver_ia_automacoes',coalesce(mvp_salvar_acessos.ver_ia_automacoes,false)));
end;$$;

-- Auditoria com nomes, sem e-mail.
create or replace function public.mvp_admin_audit() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') into result from (
  select l.id,l.actor_id,l.target_id,ac.apelido actor_name,al.apelido target_name,l.action,l.permissions,l.created_at
  from public.admin_access_audit l left join public.profiles ac on ac.id=l.actor_id left join public.profiles al on al.id=l.target_id
  order by l.created_at desc limit 50) x;
 return result;
end;$$;

revoke all on function public.mvp_permissao(text),public.mvp_conversation_metrics(),public.mvp_ai_metrics(),public.mvp_admin_counts(),
 public.mvp_mascara_email(text),public.mvp_admin_search(text),public.mvp_admin_ambassadors(),
 public.mvp_salvar_acessos(uuid,boolean,boolean,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.mvp_permissao(text),public.mvp_conversation_metrics(),public.mvp_ai_metrics(),public.mvp_admin_counts(),
 public.mvp_admin_search(text),public.mvp_admin_ambassadors(),
 public.mvp_salvar_acessos(uuid,boolean,boolean,boolean,boolean,boolean) to authenticated,service_role;
grant execute on function public.mvp_mascara_email(text) to service_role;
