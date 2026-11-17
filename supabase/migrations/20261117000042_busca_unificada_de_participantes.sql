-- 042 · Participantes só após busca; permissões continuam exclusivas da principal.
create or replace function public.mvp_admin_participants(q text default '',filter_status text default 'todos') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare padrao text;result jsonb;begin
 if not public.mvp_can_review_profiles() then raise exception 'Sem permissão para gerenciar contas.';end if;
 if char_length(trim(coalesce(q,'')))<2 then return '[]'::jsonb;end if;
 padrao:=replace(replace(replace(left(trim(q),80),'\','\\'),'%','\%'),'_','\_');
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
 select p.id,p.apelido as name,p.status,pp.situacao,pp.area_principal,pp.habilidades,pp.available
 from public.profiles p left join public.professional_profiles pp on pp.profile_id=p.id
 where (filter_status='todos' or (filter_status='ativas' and p.status in ('pendente','aprovado')) or (filter_status='restritas' and p.status in ('pausado','reprovado')))
 and p.apelido ilike '%'||padrao||'%' order by p.apelido limit 100) x;return result;
end;$$;
create or replace function public.mvp_admin_search(q text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare termo text:=lower(trim(coalesce(q,'')));padrao text;result jsonb;
begin
 if not public.mvp_is_principal() then raise exception 'somente a administradora principal';end if;
 if length(termo)<2 then return '[]'::jsonb;end if;
 termo:=left(termo,80);
 padrao:=replace(replace(replace(termo,'\','\\'),'%','\%'),'_','\_');
 select coalesce(jsonb_agg(item),'[]') into result from (
  select jsonb_build_object('id',p.id,'name',p.apelido,'status',p.status,'situacao',pp.situacao,'area_principal',pp.area_principal,'habilidades',pp.habilidades,'available',pp.available,'email',public.mvp_mascara_email(u.email),
   'ver_visao_geral',coalesce(a.ver_visao_geral,false),'avaliar_perfis',coalesce(a.review_profiles,false),
   'tratar_denuncias',coalesce(a.handle_reports,false),'ver_feedback',coalesce(a.ver_feedback,false),
   'ver_ia_automacoes',coalesce(a.ver_ia_automacoes,false)) item
  from public.profiles p join auth.users u on u.id=p.id
  left join public.professional_profiles pp on pp.profile_id=p.id
  left join public.ambassador_permissions a on a.user_id=p.id
  where p.id<>auth.uid() and (lower(p.apelido) like '%'||padrao||'%' or lower(u.email) like padrao||'%')
  order by p.apelido limit 10) x;
 return result;
end;$$;
