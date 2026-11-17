-- 034 · Apoio não vira atalho para compartilhar contatos antes do aceite.
create function public.mvp_redact_support(t text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(regexp_replace(regexp_replace(coalesce(t,''),
  'https?://[^[:space:]]+|www\.[^[:space:]]+', '[link removido]', 'gi'),
  '[[:alnum:]_.%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[e-mail removido]', 'gi'),
  '[+]?[0-9][0-9[:space:]()./-]{5,}[0-9]', '[número removido]', 'g');
$$;
create or replace function public.mvp_invite_context(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;
begin
 select * into i from public.conversation_invites where id=invite and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'convite indisponível';end if;
 return (select jsonb_build_object('description',case when owner_id=auth.uid() then description else public.mvp_redact_support(description) end,'habilidades',habilidades_que_ajudam) from public.conversation_requests where id=i.request_id);
end;$$;
-- Os quatro canais seguem a escolha individual da participante; não basta existir um link antigo.
create or replace function public.mvp_shared_contacts(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;other uuid;result jsonb;
begin
 select * into i from public.conversation_invites where id=invite and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'contatos disponíveis apenas após aceite mútuo';end if;
 other:=case when i.sender_id=auth.uid() then i.recipient_id else i.sender_id end;
 select jsonb_build_object('linkedin',case when p.channels @> array['linkedin'] then c.linkedin end,'whatsapp',case when p.channels @> array['whatsapp'] then c.whatsapp end,'email',case when p.channels @> array['email'] then c.email end,'meet',case when p.channels @> array['meet'] then c.meet end,'nome_completo',c.nome_completo,'slots',p.slots,'common_slots',array(select unnest(p.slots) intersect select unnest(m.slots))) into result
 from public.professional_profiles p join public.professional_profiles m on m.profile_id=auth.uid() left join public.professional_contacts c on c.profile_id=p.profile_id where p.profile_id=other;
 return result;
end;$$;
revoke all on function public.mvp_redact_support(text) from public,anon,authenticated;
grant execute on function public.mvp_redact_support(text) to service_role;
