-- 025 · Avaliação depois da conversa, na mesma rotina diária da 021.
-- A rotina (mesmo job do pg_cron) passa a: 1) expirar convites; 2) pedir
-- avaliação 5 dias depois do aceite a cada participante que ainda não avaliou.

-- 1. Respostas novas: "Vocês conversaram?" e as marcas (várias escolhas).
alter table public.conversation_feedback
 add column conversaram text check(conversaram in ('sim','nao_vai_rolar')),
 add column marcas text[] not null default '{}' check(marcas <@ array['escuta','dica','contato','outro_olhar']);

-- 2. Pedidos de avaliação: cada uma vê só os seus.
create table public.conversation_feedback_requests (
 id uuid primary key default gen_random_uuid(),
 invite_id uuid not null references public.conversation_invites(id) on delete cascade,
 participante uuid not null references public.profiles(id) on delete cascade,
 criado_em timestamptz not null default now(),
 mostrar_a_partir timestamptz not null default now(),
 ainda_nao smallint not null default 0 check(ainda_nao between 0 and 3),
 encerrado_em timestamptz,
 unique(invite_id,participante)
);
alter table public.conversation_feedback_requests enable row level security;
revoke all on public.conversation_feedback_requests from anon,authenticated;
grant select on public.conversation_feedback_requests to authenticated;
grant all on public.conversation_feedback_requests to service_role;
create policy "pedidos de avaliação: só a participante" on public.conversation_feedback_requests for select to authenticated using(participante=auth.uid());

alter table public.conversation_expiry_runs add column pedidos_avaliacao integer not null default 0 check(pedidos_avaliacao>=0);

-- 3. Rotina diária ampliada (mesmo nome e mesmo job do pg_cron).
create or replace function public.mvp_expire_invites() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;pedidos integer;
begin
 update public.conversation_invites set state='expirado',expirado_em=now()
 where state='pendente' and created_at<now()-interval '7 days';
 get diagnostics n=row_count;
 insert into public.conversation_feedback_requests(invite_id,participante)
 select i.id,x.p from public.conversation_invites i cross join lateral (values(i.sender_id),(i.recipient_id)) x(p)
 where i.state='aceita' and coalesce(i.responded_at,i.created_at)<=now()-interval '5 days'
 and not public.mvp_blocked(i.sender_id,i.recipient_id)
 and not exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.author_id=x.p)
 on conflict(invite_id,participante) do nothing;
 get diagnostics pedidos=row_count;
 insert into public.conversation_expiry_runs(expirados,pedidos_avaliacao) values(n,pedidos);
 return n;
end;$$;

-- 4. Responder: sim (nota + marcas), "ainda não" (volta em 5 dias, até 2 vezes) ou "não vai rolar".
create function public.mvp_feedback_v2(invite uuid,resposta text,utility smallint default null,marcas text[] default '{}') returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if not exists(select 1 from public.conversation_invites where id=invite and state='aceita' and uid in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id)) then raise exception 'conversa indisponível';end if;
 if resposta='ainda_nao' then
  insert into public.conversation_feedback_requests(invite_id,participante,ainda_nao,mostrar_a_partir) values(invite,uid,1,now()+interval '5 days')
  on conflict(invite_id,participante) do update set ainda_nao=least(conversation_feedback_requests.ainda_nao+1,3),
   mostrar_a_partir=now()+interval '5 days',
   encerrado_em=case when conversation_feedback_requests.ainda_nao+1>2 then now() end;
  return;
 end if;
 if resposta='sim' then
  if utility is null or utility not between 1 and 5 then raise exception 'escolha uma nota de 1 a 5';end if;
  insert into public.conversation_feedback(invite_id,author_id,happened,utility,outcome,conversaram,marcas) values(invite,uid,true,utility,'outro','sim',coalesce(marcas,'{}'))
  on conflict(invite_id,author_id) do update set happened=true,utility=excluded.utility,outcome='outro',conversaram='sim',marcas=excluded.marcas;
 elsif resposta='nao_vai_rolar' then
  insert into public.conversation_feedback(invite_id,author_id,happened,utility,outcome,conversaram,marcas) values(invite,uid,false,null,'nao_aconteceu','nao_vai_rolar','{}')
  on conflict(invite_id,author_id) do update set happened=false,utility=null,outcome='nao_aconteceu',conversaram='nao_vai_rolar',marcas='{}';
 else raise exception 'resposta inválida';end if;
 update public.conversation_feedback_requests set encerrado_em=now() where invite_id=invite and participante=uid;
end;$$;

-- "Lembrar depois": esconde por 3 dias.
create function public.mvp_feedback_later(pedido uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.conversation_feedback_requests set mostrar_a_partir=now()+interval '3 days' where id=pedido and participante=auth.uid() and encerrado_em is null;
 if not found then raise exception 'pedido indisponível';end if;
end;$$;

-- 5. Indicação: par em que uma das duas deu nota 1 ou 2 não é indicado de novo. A nota não dá prioridade.
create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and p.can_help @> array[goal]
 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id
  where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by (case when p.area_principal<>'decidindo' and (p.area_principal=any(mine.interesses) or p.area_principal=mine.area_principal) then 4 else 0 end
  + case when p.interesses && mine.interesses then 2 else 0 end) desc,
  (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days') asc,
  random()
 limit 1;
$$;

-- 6. Cartões: só "X conversas realizadas" e até 3 marcas mais citadas sobre a pessoa. Sem nota.
create or replace function public.mvp_cards() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',case when public.mvp_text_safe(p.apelido) then p.apelido else 'participante' end,
  'occupation',pp.occupation,'situacao',pp.situacao,'area_principal',pp.area_principal,'interesses',pp.interesses,'areas',pp.areas,'moment',pp.moment,
  'conversas',(select count(distinct i.id) from public.conversation_invites i where p.id in(i.sender_id,i.recipient_id) and exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened)),
  'marcas',coalesce((select jsonb_agg(m) from (select m from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id cross join unnest(f.marcas) m
    where p.id in(i.sender_id,i.recipient_id) and f.author_id<>p.id group by m order by count(*) desc,m limit 3) t),'[]'::jsonb))), '[]')
 from public.profiles p join public.professional_profiles pp on pp.profile_id=p.id
 where auth.uid() is not null and not public.mvp_blocked(auth.uid(),p.id) and (
 exists(select 1 from public.conversation_requests r where r.owner_id=auth.uid() and r.candidate_id=p.id)
 or exists(select 1 from public.conversation_invites i where auth.uid() in(i.sender_id,i.recipient_id) and p.id in(i.sender_id,i.recipient_id)));
$$;

revoke all on function public.mvp_feedback_v2(uuid,text,smallint,text[]),public.mvp_feedback_later(uuid) from public,anon,authenticated;
grant execute on function public.mvp_feedback_v2(uuid,text,smallint,text[]),public.mvp_feedback_later(uuid) to authenticated,service_role;
