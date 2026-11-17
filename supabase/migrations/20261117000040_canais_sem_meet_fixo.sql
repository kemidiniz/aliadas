-- 040 · Meet fixo fica para o futuro. Valores históricos não são apagados.
-- Novas buscas exigem um canal de contato efetivamente disponível na interface.
create or replace function public.mvp_pode_buscar(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.mvp_account_active(uid) and exists(select 1 from public.professional_profiles p where p.profile_id=uid and p.situacao is not null and p.area_principal is not null and p.channels && array['linkedin','whatsapp','email']);
$$;
create or replace function public.mvp_eligible_candidates(owner uuid,goal text,exclude uuid[] default '{}')
returns table(candidate uuid, habilidades text[], ai_consent boolean, situacao text, area_principal text, matches integer, recent bigint, legacy boolean)
language sql volatile security definer set search_path='' as $$
 select p.profile_id,p.habilidades,(p.ai_consent and p.ai_consent_version='habilidades-v1'),p.situacao,p.area_principal,
 (select count(*)::integer from unnest(p.habilidades) h where h=any(public.mvp_goal_skills(goal))),
 (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days'),
 (cardinality(p.habilidades)=0 and p.can_help @> array[goal])
 from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner join public.profiles me on me.id=mine.profile_id
 where me.status in ('pendente','aprovado') and p.profile_id<>owner and p.available and pr.status in ('pendente','aprovado')
 and (cardinality(p.habilidades)>0 or cardinality(p.can_help)>0)
 and p.profile_id<>all(coalesce(exclude,'{}')) and not public.mvp_blocked(owner,p.profile_id)

 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by 6 desc,7 asc,random();
$$;
create or replace function public.mvp_shared_contacts(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;other uuid;result jsonb;
begin
 select * into i from public.conversation_invites where id=invite and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'contatos disponíveis apenas após aceite mútuo';end if;
 other:=case when i.sender_id=auth.uid() then i.recipient_id else i.sender_id end;
 select jsonb_build_object('linkedin',case when p.channels @> array['linkedin'] then c.linkedin end,'whatsapp',case when p.channels @> array['whatsapp'] then c.whatsapp end,'email',case when p.channels @> array['email'] then c.email end,'meet',null,'nome_completo',c.nome_completo,'slots',p.slots,'common_slots',array(select unnest(p.slots) intersect select unnest(m.slots))) into result
 from public.professional_profiles p join public.professional_profiles m on m.profile_id=auth.uid() left join public.professional_contacts c on c.profile_id=p.profile_id where p.profile_id=other;
 return result;
end;$$;
