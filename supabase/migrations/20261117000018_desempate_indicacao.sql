-- 018 · Desempate da indicação sem viés de id e sem sobrecarga.
-- Antes: empate decidido por profile_id (a mesma pessoa vencia sempre).
-- Agora: pontuação desc → menos convites recebidos nos últimos 14 dias → sorteio.
-- Quem já tem 2 ou mais convites pendentes recebidos sai da seleção.
-- O resto da regra (017) continua igual.
create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and p.can_help @> array[goal] and p.channels && mine.channels
 and (exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email')) or p.slots && mine.slots)
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by (case when p.areas && mine.areas then 4 else 0 end + case when p.moment<>mine.moment then 1 else 0 end + case when p.slots && mine.slots then 2 else 0 end) desc,
  (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days') asc,
  random()
 limit 1;
$$;
revoke all on function public.mvp_pick_candidate(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.mvp_pick_candidate(uuid,text,uuid[]) to service_role;
