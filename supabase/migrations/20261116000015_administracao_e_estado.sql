-- PREPARADA, NÃO APLICAR EM PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA.
-- Bootstrap separado, com UUID da conta principal conferido pela titular.
alter table public.roles drop constraint roles_role_check;
alter table public.roles add constraint roles_role_check check(role in ('curadora','administradora','embaixadora'));
create table public.principal_administrator (
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references auth.users(id) on delete restrict,
 verified_at timestamptz not null default now()
);
create table public.ambassador_permissions (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 review_profiles boolean not null default false,
 handle_reports boolean not null default false,
 granted_by uuid not null references auth.users(id) on delete restrict,
 granted_at timestamptz not null default now()
);
create table public.admin_access_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 target_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('bootstrap','grant','revoke')),
 permissions jsonb not null default '{}',created_at timestamptz not null default now()
);
alter table public.principal_administrator enable row level security;
alter table public.ambassador_permissions enable row level security;
alter table public.admin_access_audit enable row level security;
revoke all on public.principal_administrator,public.ambassador_permissions,public.admin_access_audit from public,anon,authenticated;
grant all on public.principal_administrator,public.ambassador_permissions,public.admin_access_audit to service_role;
-- Somente o UUID fixado na tabela pode delegar. Metadados editáveis nunca são usados.
create function public.mvp_is_principal() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.principal_administrator where user_id=auth.uid());
$$;
-- Mantém o acesso legado SOMENTE enquanto o bootstrap não foi concluído.
-- Uma embaixadora nunca recebe is_curadora=true, evitando privilégios legados amplos.
create or replace function public.is_curadora() returns boolean language sql stable security definer set search_path='' as $$
 select public.mvp_is_principal() or (not exists(select 1 from public.principal_administrator) and exists(select 1 from public.roles where user_id=auth.uid() and role='curadora'));
$$;
create function public.mvp_can_review_profiles() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_curadora() or exists(select 1 from public.ambassador_permissions a join public.roles r on r.user_id=a.user_id and r.role='embaixadora' where a.user_id=auth.uid() and a.review_profiles);
$$;
create function public.mvp_can_handle_reports() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_curadora() or exists(select 1 from public.ambassador_permissions a join public.roles r on r.user_id=a.user_id and r.role='embaixadora' where a.user_id=auth.uid() and a.handle_reports);
$$;
create function public.mvp_admin_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('principal',public.mvp_is_principal(),'legacy',public.is_curadora() and not public.mvp_is_principal(),'review_profiles',public.mvp_can_review_profiles(),'handle_reports',public.mvp_can_handle_reports());
$$;
create function public.mvp_bootstrap_principal(verified_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.principal_administrator where user_id=verified_user_id) then return;end if;
 if exists(select 1 from public.principal_administrator) then raise exception 'administradora principal já definida';end if;
 if not exists(select 1 from public.roles where user_id=verified_user_id and role='curadora') then raise exception 'a conta verificada deve possuir o papel administrativo legado';end if;
 insert into public.principal_administrator(user_id) values(verified_user_id);
 insert into public.roles(user_id,role) values(verified_user_id,'administradora') on conflict do nothing;
 insert into public.admin_access_audit(actor_id,target_id,action) values(verified_user_id,verified_user_id,'bootstrap');
end;$$;
create function public.mvp_manage_ambassador(target uuid,review_profiles boolean,handle_reports boolean,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal gerencia embaixadoras';end if;
 if target=auth.uid() then raise exception 'esta ação não altera a administradora principal';end if;
 if not exists(select 1 from public.profiles where id=target) then raise exception 'selecione uma participante existente pelo identificador da conta';end if;
 if enabled then
 insert into public.roles(user_id,role) values(target,'embaixadora') on conflict do nothing;
 insert into public.ambassador_permissions(user_id,review_profiles,handle_reports,granted_by) values(target,review_profiles,handle_reports,auth.uid())
 on conflict(user_id) do update set review_profiles=excluded.review_profiles,handle_reports=excluded.handle_reports,granted_by=excluded.granted_by,granted_at=now();
 else
 delete from public.ambassador_permissions where user_id=target;
 delete from public.roles where user_id=target and role='embaixadora';
 end if;
 insert into public.admin_access_audit(actor_id,target_id,action,permissions) values(auth.uid(),target,case when enabled then 'grant' else 'revoke' end,jsonb_build_object('review_profiles',enabled and review_profiles,'handle_reports',enabled and handle_reports));
end;$$;
create function public.mvp_admin_members(search text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 select coalesce(jsonb_agg(item),'[]') into result from (
 select jsonb_build_object('id',p.id,'name',p.apelido,'ambassador',a.user_id is not null,'review_profiles',coalesce(a.review_profiles,false),'handle_reports',coalesce(a.handle_reports,false)) item
 from public.profiles p left join public.ambassador_permissions a on a.user_id=p.id
 where p.id<>auth.uid() and (coalesce(search,'')='' or p.id::text=search or position(lower(left(search,80)) in lower(p.apelido))>0)
 order by p.created_at desc limit 50) x;return result;
end;$$;
create function public.mvp_admin_audit() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select id,actor_id,target_id,action,permissions,created_at from public.admin_access_audit order by created_at desc limit 50) x;return result;
end;$$;
create function public.mvp_admin_profiles(filter_status text default 'pendente') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_can_review_profiles() then raise exception 'sem permissão para avaliar perfis';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select p.id,p.apelido as name,p.status,p.created_at,pp.occupation,pp.moment,pp.areas,pp.themes from public.profiles p left join public.professional_profiles pp on pp.profile_id=p.id where p.status=filter_status order by p.created_at limit 100) x;return result;
end;$$;
create function public.mvp_admin_review(target uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.mvp_can_review_profiles() then raise exception 'sem permissão para avaliar perfis';end if;
 if target=auth.uid() then raise exception 'outra responsável deve avaliar seu perfil';end if;
 if new_status not in ('aprovado','reprovado','pausado','pendente') then raise exception 'status inválido';end if;
 update public.profiles set status=new_status where id=target;
 if not found then raise exception 'perfil não encontrado';end if;
end;$$;
create function public.mvp_admin_reports() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.mvp_can_handle_reports() then raise exception 'sem permissão para tratar denúncias';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (select r.id,r.denunciado_id,r.motivo,r.status,r.created_at,p.apelido as name from public.reports r left join public.profiles p on p.id=r.denunciado_id order by r.created_at desc limit 100) x;return result;
end;$$;
create function public.mvp_admin_report_status(report_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.mvp_can_handle_reports() then raise exception 'sem permissão para tratar denúncias';end if;
 if new_status not in ('aberta','em_analise','resolvida','descartada') then raise exception 'status inválido';end if;
 update public.reports set status=new_status where id=report_id;
 if not found then raise exception 'denúncia não encontrada';end if;
end;$$;
-- Expõe à participante apenas o estado de sua própria solicitação, sem logs internos.
create function public.mvp_job_status(request_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.conversation_requests;j public.conversation_jobs;begin
 select * into r from public.conversation_requests r0 where r0.id=mvp_job_status.request_id and r0.owner_id=auth.uid();
 if not found then raise exception 'solicitação indisponível';end if;
 select * into j from public.conversation_jobs where conversation_jobs.request_id=r.id;
 return jsonb_build_object('state',coalesce(j.state,'sem_ia'),'mode',r.mode,'has_candidate',r.candidate_id is not null,'error_code',case when j.error_code in ('limite_provedor','limite_global','ia_nao_configurada') then j.error_code when j.error_code is not null then 'indisponivel' end);
end;$$;
-- Helper usado por RLS: não revela se duas OUTRAS participantes se bloquearam.
create or replace function public.mvp_blocked(a uuid,b uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid() not in(a,b) and not public.is_curadora() and current_setting('role',true)<>'service_role' then return false;end if;
 return exists(select 1 from public.conversation_blocks where (owner_id=a and blocked_id=b) or (owner_id=b and blocked_id=a));
end;$$;
-- Grants por assinatura, sem revogações globais. As tabelas novas não têm escrita direta de participantes.
revoke all on function public.mvp_is_principal(),public.mvp_can_review_profiles(),public.mvp_can_handle_reports(),public.mvp_admin_access(),public.mvp_bootstrap_principal(uuid),public.mvp_manage_ambassador(uuid,boolean,boolean,boolean),public.mvp_admin_members(text),public.mvp_admin_audit(),public.mvp_admin_profiles(text),public.mvp_admin_review(uuid,text),public.mvp_admin_reports(),public.mvp_admin_report_status(uuid,text),public.mvp_job_status(uuid) from public,anon,authenticated;
grant execute on function public.mvp_is_principal(),public.mvp_can_review_profiles(),public.mvp_can_handle_reports(),public.mvp_admin_access(),public.mvp_manage_ambassador(uuid,boolean,boolean,boolean),public.mvp_admin_members(text),public.mvp_admin_audit(),public.mvp_admin_profiles(text),public.mvp_admin_review(uuid,text),public.mvp_admin_reports(),public.mvp_admin_report_status(uuid,text),public.mvp_job_status(uuid) to authenticated,service_role;
grant execute on function public.mvp_bootstrap_principal(uuid) to service_role;
