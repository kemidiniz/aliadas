-- 039 · Gestão de contas e denúncias substitui a fila de aprovação, sem novos papéis.
create function public.mvp_admin_participants(q text default '',filter_status text default 'todos') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare padrao text;result jsonb;begin
 if not public.mvp_can_review_profiles() then raise exception 'Sem permissão para gerenciar contas.';end if;
 padrao:=replace(replace(replace(left(trim(q),80),'\','\\'),'%','\%'),'_','\_');
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
 select p.id,p.apelido as name,p.status,pp.situacao,pp.area_principal,pp.habilidades,pp.available
 from public.profiles p left join public.professional_profiles pp on pp.profile_id=p.id
 where (filter_status='todos' or (filter_status='ativas' and p.status in ('pendente','aprovado')) or (filter_status='restritas' and p.status in ('pausado','reprovado')))
 and p.apelido ilike '%'||padrao||'%' order by p.apelido limit 100) x;return result;
end;$$;
create function public.mvp_admin_set_active(target uuid,active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.mvp_can_review_profiles() or target=auth.uid() then raise exception 'Sem permissão para alterar esta conta.';end if;
 -- Só muda a disponibilidade da conta, nunca papéis ou credenciais.
 perform public.mvp_admin_review(target,case when active then 'aprovado' else 'pausado' end);
end;$$;
revoke all on function public.mvp_admin_participants(text,text),public.mvp_admin_set_active(uuid,boolean) from public,anon,authenticated;
grant execute on function public.mvp_admin_participants(text,text),public.mvp_admin_set_active(uuid,boolean) to authenticated,service_role;
create or replace function public.mvp_admin_counts() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('denuncias',case when public.mvp_can_handle_reports() then (select count(*) from public.reports where status in ('aberta','em_analise')) end,'feedback',case when public.mvp_permissao('ver_feedback') then (select count(*) from public.feedback where tipo='duvida' and status<>'respondido') end));
$$;

-- 033 · Tarefas e destino correto de convites no painel; só agregados, sem dados privados.
create or replace function public.mvp_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare aconteceram integer;uteis integer;
begin
 if not public.mvp_permissao('ver_visao_geral') then raise exception 'sem permissão para a visão geral';end if;
 select count(*),count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4))
  into aconteceram,uteis from public.conversation_invites i where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened);
 return jsonb_build_object(
  'active_profiles',(select count(*) from public.profiles where status in ('pendente','aprovado')),
  'available_profiles',(select count(*) from public.professional_profiles pp join public.profiles p on p.id=pp.profile_id where p.status in ('pendente','aprovado') and pp.available and cardinality(pp.habilidades)>0),
  'pending_invites',(select count(*) from public.conversation_invites where state='pendente'),
  'conversations_happened',aconteceram,
  'useful_rate',case when aconteceram>0 then round(uteis::numeric/aconteceram,4) end,
  'open_reports',(select count(*) from public.reports where status in ('aberta','em_analise')),
  'feedback_new',(select count(*) from public.feedback where status='novo'),
  'unanswered_questions',case when public.mvp_permissao('ver_feedback') then (select count(*) from public.feedback where tipo='duvida' and status<>'respondido') else 0 end);
end;$$;


create or replace function public.mvp_skill_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.mvp_permissao('ver_ia_automacoes') and not public.mvp_permissao('ver_visao_geral') then raise exception 'sem permissão';end if;
 return jsonb_build_object(
 'first_choice_rate',(select count(*) filter(where r.next_count=0)::numeric/nullif(count(*),0) from public.conversation_invites i join public.conversation_requests r on r.id=i.request_id where r.recommendation_version in ('habilidades-v1','objetivo-v1')),
 'ia',(select count(*) from public.conversation_objectives where mode='ia' and state='pronta'),
 'regra',(select count(*) from public.conversation_objectives where mode='regra' and state='pronta'),
 'sem_compativel',(select count(*) from public.conversation_requests where recommendation_version in ('habilidades-v1','objetivo-v1') and state='sem_candidata'),
 'habilidades',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'nome',h.nome,
 'pedidas',(select count(*) from public.conversation_requests r where h.id=any(r.habilidades_necessarias)),
 'oferecidas',(select count(*) from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id where h.id=any(p.habilidades) and p.available and pr.status in ('pendente','aprovado'))) order by h.grupo,h.nome),'[]') from public.habilidades_referencia h));
end;$$;
