-- 016 · Sala de chamada fixa e horários propostos.
-- ADITIVA: nenhuma coluna ou dado antigo é apagado. sender_time/recipient_time
-- ficam preservados, mas a RPC de texto livre deixa de ser oferecida.

-- 1. Sala fixa: o campo "meet" passa a aceitar salas https de provedores conhecidos.
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.professional_contacts'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%meet%' loop
  execute format('alter table public.professional_contacts drop constraint %I',c.conname);
 end loop;
end;$$;
create function public.mvp_room_valid(url text) returns boolean language sql immutable set search_path='' as $$
 select url is null or (length(url)<=250 and url ~ '^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com|([a-z0-9-]+\.)?whereby\.com|meet\.jit\.si)/[A-Za-z0-9._~%/?=&#+-]+$');
$$;
alter table public.professional_contacts add constraint professional_contacts_sala_valida check(public.mvp_room_valid(meet));

-- 2. Horários: até três propostas de cada participante, nos próximos 14 dias.
create table public.conversation_time_proposals (
 id uuid primary key default gen_random_uuid(),
 invite_id uuid not null references public.conversation_invites(id) on delete cascade,
 autora uuid not null references public.profiles(id) on delete cascade,
 inicio timestamptz not null,
 created_at timestamptz not null default now(),
 unique(invite_id,autora,inicio)
);
alter table public.conversation_invites add column horario_confirmado timestamptz, add column confirmado_em timestamptz;
alter table public.conversation_time_proposals enable row level security;
revoke all on public.conversation_time_proposals from anon,authenticated;
grant select on public.conversation_time_proposals to authenticated;
grant all on public.conversation_time_proposals to service_role;
-- Só as duas participantes de um convite ACEITO e sem bloqueio leem as propostas.
create policy "horários: participantes" on public.conversation_time_proposals for select to authenticated using(
 exists(select 1 from public.conversation_invites i where i.id=invite_id and i.state='aceita' and auth.uid() in(i.sender_id,i.recipient_id) and not public.mvp_blocked(i.sender_id,i.recipient_id)));

create function public.mvp_propose_times(invite uuid,horarios timestamptz[]) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();h timestamptz;
begin
 if not exists(select 1 from public.conversation_invites where id=invite and state='aceita' and uid in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id)) then raise exception 'conversa indisponível';end if;
 if coalesce(cardinality(horarios),0) not between 1 and 3 then raise exception 'proponha de um a três horários';end if;
 foreach h in array horarios loop
  if h<now() or h>now()+interval '14 days' then raise exception 'escolha horários nos próximos 14 dias';end if;
 end loop;
 perform 1 from public.conversation_invites where id=invite for update;
 delete from public.conversation_time_proposals where invite_id=invite and autora=uid;
 insert into public.conversation_time_proposals(invite_id,autora,inicio) select distinct invite,uid,x from unnest(horarios) x;
 -- nova proposta reabre o agendamento
 update public.conversation_invites set horario_confirmado=null,confirmado_em=null where id=invite;
end;$$;

create function public.mvp_confirm_time(proposal uuid) returns void language plpgsql security definer set search_path='' as $$
declare t public.conversation_time_proposals;
begin
 select * into t from public.conversation_time_proposals where id=proposal;
 if not found or t.autora=auth.uid() or t.inicio<now() then raise exception 'horário indisponível';end if;
 update public.conversation_invites set horario_confirmado=t.inicio,confirmado_em=now()
 where id=t.invite_id and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'horário indisponível';end if;
end;$$;

-- 3. Contatos após o aceite: a sala aparece quando preenchida (não é canal de contato).
create or replace function public.mvp_shared_contacts(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;other uuid;result jsonb;
begin
 select * into i from public.conversation_invites where id=invite and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'contatos disponíveis apenas após aceite mútuo';end if;
 other:=case when i.sender_id=auth.uid() then i.recipient_id else i.sender_id end;
 select jsonb_build_object('linkedin',case when p.channels @> array['linkedin'] then c.linkedin end,'whatsapp',case when p.channels @> array['whatsapp'] then c.whatsapp end,'email',case when p.channels @> array['email'] then c.email end,'meet',c.meet,'slots',p.slots,'common_slots',array(select unnest(p.slots) intersect select unnest(m.slots))) into result
 from public.professional_profiles p join public.professional_profiles m on m.profile_id=auth.uid() left join public.professional_contacts c on c.profile_id=p.profile_id where p.profile_id=other;
 return result;
end;$$;

revoke all on function public.mvp_room_valid(text),public.mvp_propose_times(uuid,timestamptz[]),public.mvp_confirm_time(uuid) from public,anon,authenticated;
grant execute on function public.mvp_room_valid(text) to authenticated,service_role;
grant execute on function public.mvp_propose_times(uuid,timestamptz[]),public.mvp_confirm_time(uuid) to authenticated,service_role;
-- Proposta em texto livre substituída pelas propostas estruturadas.
revoke execute on function public.mvp_schedule(uuid,text) from authenticated;
