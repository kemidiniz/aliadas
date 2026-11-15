-- MVP profissional. ADITIVA: preserva tabelas e dados históricos.
-- Aplicar apenas após revisão, nunca automaticamente em produção.
create function public.mvp_text_safe(value text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(value !~* '(https?://|www\.|@|\+?[0-9][0-9 ()-]{6,}[0-9])',false);
$$;
create table public.professional_profiles (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 occupation text not null check (char_length(btrim(occupation)) between 2 and 120),
 moment text not null check (moment in ('estudante','inicio','transicao','experiente')),
 areas text[] not null check (cardinality(areas) between 1 and 8 and areas <@ array['tecnologia','educacao','saude','negocios','comunicacao','artes','ciencias','direito','engenharia','servicos','outras']),
 themes text[] not null check (cardinality(themes) between 1 and 8 and themes <@ array['situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro']),
 intentions text[] not null check (cardinality(intentions) between 1 and 2 and intentions <@ array['buscar','compartilhar']),
 channels text[] not null check (cardinality(channels) between 1 and 4 and channels <@ array['linkedin','whatsapp','email','meet']),
 slots text[] not null default '{}' check (cardinality(slots)<=21),
 ai_consent boolean not null default false,
 available boolean not null default true,
 updated_at timestamptz not null default now(),
 consent_version text not null default 'mvp-profissional-v1'
);
create function public.mvp_slots_valid(slots text[]) returns boolean language sql immutable set search_path='' as $$
 select not exists(select 1 from unnest(slots) s where s !~ '^[1-7]_(manha|tarde|noite)$');
$$;
alter table public.professional_profiles add check(public.mvp_slots_valid(slots));
alter table public.professional_profiles add check(public.mvp_text_safe(occupation));
create table public.professional_contacts (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 linkedin text check(linkedin is null or (length(linkedin)<=250 and linkedin ~ '^https://([a-z]{2,3}\.)?linkedin\.com/')),
 whatsapp text check(whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
 email text check(email is null or (length(email)<=254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
 meet text check(meet is null or (length(meet)<=250 and meet ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'))
);
create table public.conversation_blocks (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 primary key(owner_id,blocked_id),check(owner_id<>blocked_id)
);
create function public.mvp_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversation_blocks where (owner_id=a and blocked_id=b) or (owner_id=b and blocked_id=a));
$$;
create table public.conversation_requests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 intention text not null check(intention in ('buscar','compartilhar')),
 goal text not null check(goal in ('situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro')),
 description text check(length(description)<=400), -- NUNCA enviado ao provedor
 candidate_id uuid references public.profiles(id) on delete set null,
 mode text not null default 'basica' check(mode in ('basica','generativa')),
 state text not null default 'nova' check(state in ('nova','pronta','sem_candidata')),
 explanation text not null default 'compatibilidade básica por objetivo, áreas, disponibilidade e canais.',
 questions jsonb not null default '[]', draft text,
 created_at timestamptz not null default now()
);
create table public.conversation_invites (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references public.conversation_requests(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 message text not null check(length(btrim(message)) between 1 and 600),
 state text not null default 'pendente' check(state in ('pendente','aceita','recusada')),
 sender_time text check(length(sender_time)<=120), recipient_time text check(length(recipient_time)<=120),
 created_at timestamptz not null default now(), responded_at timestamptz,
 check(sender_id<>recipient_id)
);
alter table public.conversation_invites add check(public.mvp_text_safe(message));
create unique index conversation_pair_active on public.conversation_invites(least(sender_id,recipient_id),greatest(sender_id,recipient_id)) where state in ('pendente','aceita');
create table public.conversation_feedback (
 invite_id uuid not null references public.conversation_invites(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 happened boolean not null, utility smallint check(utility between 1 and 5),
 outcome text not null check(outcome in ('clareza','preparo','feedback','contato','outro','nao_aconteceu')),
 created_at timestamptz not null default now(),
 primary key(invite_id,author_id),
 check((happened and utility is not null and outcome<>'nao_aconteceu') or (not happened and utility is null and outcome='nao_aconteceu'))
);
create table public.conversation_jobs (
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique references public.conversation_requests(id) on delete cascade,
 state text not null default 'pendente' check(state in ('pendente','executando','concluida','falha','sem_consentimento')),
 error_code text, model text, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now(),finished_at timestamptz
);
-- Nenhum nome, contato, texto livre ou resposta bruta em logs.
create function public.mvp_match_request() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen uuid; mine public.professional_profiles; job uuid; url text; secret text;
begin
 select * into mine from public.professional_profiles where profile_id=new.owner_id;
 select p.profile_id into chosen from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 where p.profile_id<>new.owner_id and p.available and pr.status='aprovado'
 and not public.mvp_blocked(new.owner_id,p.profile_id)
 and p.intentions @> array[case when new.intention='buscar' then 'compartilhar' else 'buscar' end]
 and p.themes @> array[new.goal] and p.channels && mine.channels
 and (exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email')) or p.slots && mine.slots)
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(new.owner_id,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(new.owner_id,p.profile_id))
 order by (case when p.areas && mine.areas then 4 else 0 end + case when p.moment<>mine.moment then 1 else 0 end + case when p.slots && mine.slots then 2 else 0 end) desc,p.profile_id limit 1;
 new.candidate_id:=chosen;new.state:=case when chosen is null then 'sem_candidata' else 'pronta' end;
 if chosen is not null then new.explanation:='vocês têm um objetivo de conversa e um canal em comum, com intenções complementares de buscar e compartilhar experiências.';end if;
 return new;
end;$$;
create trigger mvp_match before insert on public.conversation_requests for each row execute function public.mvp_match_request();
create function public.mvp_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
declare url text;secret text;
begin
 if new.candidate_id is null or not (select ai_consent from public.professional_profiles where profile_id=new.owner_id) or not (select ai_consent from public.professional_profiles where profile_id=new.candidate_id) then return new;end if;
 insert into public.conversation_jobs(request_id) values(new.id);
 select decrypted_secret into url from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if url is not null and secret is not null then
  begin
  perform net.http_post(url:=url,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('request_id',new.id),timeout_milliseconds:=10000);
  exception when others then update public.conversation_jobs set state='falha',error_code='fila_indisponivel',finished_at=now() where request_id=new.id;
  end;
 end if;
 return new;
end;$$;
create trigger mvp_enqueue after insert on public.conversation_requests for each row execute function public.mvp_enqueue();

-- Cadastro/edição em uma transação; não copia o email do Auth para contatos.
create function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or terms is distinct from true then raise exception 'entre e aceite os termos';end if;
 if not public.mvp_text_safe(p->>'name') then raise exception 'não inclua contatos ou links no nome de apresentação';end if;
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),btrim(p->>'occupation'),'estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,themes,intentions,channels,slots,ai_consent,available)
 values(uid,btrim(p->>'occupation'),p->>'moment',array(select jsonb_array_elements_text(p->'areas')),array(select jsonb_array_elements_text(p->'themes')),array(select jsonb_array_elements_text(p->'intentions')),array(select jsonb_array_elements_text(p->'channels')),array(select jsonb_array_elements_text(p->'slots')),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=excluded.occupation,moment=excluded.moment,areas=excluded.areas,themes=excluded.themes,intentions=excluded.intentions,channels=excluded.channels,slots=excluded.slots,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,meet=excluded.meet;
end;$$;
create function public.mvp_create_request(intention text,goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();
begin
 if uid is null or not public.eu_aprovada() or not exists(select 1 from public.professional_profiles where profile_id=uid and available and intentions @> array[intention]) then raise exception 'complete o perfil e aguarde aprovação';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,intention,goal,description) returning id into result;return result;
end;$$;
create function public.mvp_invite(request uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;result uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or r.candidate_id is null or public.mvp_blocked(r.owner_id,r.candidate_id) or not public.eu_aprovada() or not exists(select 1 from public.profiles where id=r.candidate_id and status='aprovado') or not exists(select 1 from public.professional_profiles where profile_id=r.candidate_id and available) then raise exception 'convite indisponível';end if;
 insert into public.conversation_invites(request_id,sender_id,recipient_id,message) values(r.id,r.owner_id,r.candidate_id,message) returning id into result;return result;
end;$$;
create function public.mvp_respond(invite uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.conversation_invites set state=case when accept then 'aceita' else 'recusada' end,responded_at=now()
 where id=invite and recipient_id=auth.uid() and state='pendente' and not public.mvp_blocked(sender_id,recipient_id) and public.eu_aprovada() and exists(select 1 from public.profiles p where p.id=sender_id and p.status='aprovado');
 if not found then raise exception 'convite indisponível';end if;
end;$$;
create function public.mvp_feedback(invite uuid,happened boolean,utility smallint,outcome text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.conversation_invites where id=invite and state='aceita' and auth.uid() in (sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id)) then raise exception 'conversa indisponível';end if;
 insert into public.conversation_feedback(invite_id,author_id,happened,utility,outcome) values(invite,auth.uid(),happened,utility,outcome)
 on conflict(invite_id,author_id) do update set happened=excluded.happened,utility=excluded.utility,outcome=excluded.outcome;
end;$$;
create function public.mvp_schedule(invite uuid,proposal text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.conversation_invites set sender_time=case when sender_id=auth.uid() then proposal else sender_time end,recipient_time=case when recipient_id=auth.uid() then proposal else recipient_time end
 where id=invite and state='aceita' and auth.uid() in (sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'conversa indisponível';end if;
end;$$;
-- Conhecer um UUID não dá acesso. Somente canais explicitamente preenchidos e autorizados.
create function public.mvp_shared_contacts(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;other uuid;result jsonb;
begin
 select * into i from public.conversation_invites where id=invite and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'contatos disponíveis apenas após aceite mútuo';end if;
 other:=case when i.sender_id=auth.uid() then i.recipient_id else i.sender_id end;
 select jsonb_build_object('linkedin',case when p.channels @> array['linkedin'] then c.linkedin end,'whatsapp',case when p.channels @> array['whatsapp'] then c.whatsapp end,'email',case when p.channels @> array['email'] then c.email end,'meet',case when p.channels @> array['meet'] then c.meet end,'slots',p.slots,'common_slots',array(select unnest(p.slots) intersect select unnest(m.slots))) into result
 from public.professional_contacts c join public.professional_profiles p using(profile_id) join public.professional_profiles m on m.profile_id=auth.uid() where c.profile_id=other;
 return result;
end;$$;
-- Perfis mínimos para cartões; não expõe trajetória antiga, contatos nem preferências privadas.
create function public.mvp_cards() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',case when public.mvp_text_safe(p.apelido) then p.apelido else 'participante' end,'occupation',pp.occupation,'areas',pp.areas,'moment',pp.moment)), '[]')
 from public.profiles p join public.professional_profiles pp on pp.profile_id=p.id
 where auth.uid() is not null and not public.mvp_blocked(auth.uid(),p.id) and (
 exists(select 1 from public.conversation_requests r where r.owner_id=auth.uid() and r.candidate_id=p.id)
 or exists(select 1 from public.conversation_invites i where auth.uid() in(i.sender_id,i.recipient_id) and p.id in(i.sender_id,i.recipient_id)));
$$;
-- RLS e privilégios: somente leitura autorizada; mutações de workflow apenas pelas RPCs.
do $$declare t text;begin
 foreach t in array array['professional_profiles','professional_contacts','conversation_blocks','conversation_requests','conversation_invites','conversation_feedback','conversation_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end;$$;
create policy "profissional: dona" on public.professional_profiles for select to authenticated using(profile_id=auth.uid());
create policy "contatos: somente dona diretamente" on public.professional_contacts for select to authenticated using(profile_id=auth.uid());
create policy "bloqueios: dona lê" on public.conversation_blocks for select to authenticated using(owner_id=auth.uid());
create policy "bloqueios: dona cria" on public.conversation_blocks for insert to authenticated with check(owner_id=auth.uid());
grant insert(owner_id,blocked_id) on public.conversation_blocks to authenticated;
create policy "solicitações: dona ou curadoria" on public.conversation_requests for select to authenticated using(owner_id=auth.uid() or public.is_curadora());
create policy "convites: participantes ou curadoria" on public.conversation_invites for select to authenticated using((auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id)) or public.is_curadora());
create policy "avaliações: autora ou curadoria" on public.conversation_feedback for select to authenticated using(author_id=auth.uid() or public.is_curadora());
create policy "logs: curadoria" on public.conversation_jobs for select to authenticated using(public.is_curadora());
-- Métricas: encontro realizado = ao menos uma confirmação positiva; respostas independentes.
create function public.mvp_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_curadora() then raise exception 'apenas curadoria';end if;
 select jsonb_build_object('requests',(select count(*) from public.conversation_requests),'invites',count(*),'accepted',count(*) filter(where i.state='aceita'),
 'confirmed',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened)),
 'useful',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4)),
 'responses',(select count(*) from public.conversation_feedback),'average',(select avg(utility) from public.conversation_feedback where happened),
 'conflicting',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened) and exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and not f.happened))) into result from public.conversation_invites i;return result;
end;$$;
-- Desativa apenas o disparo antigo de IA paga por aprovação; histórico permanece.
drop trigger if exists profiles_aprovado_recomendar on public.profiles;
-- Novas funções não herdam execução pública.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'mvp_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname in ('mvp_save_profile','mvp_create_request','mvp_invite','mvp_respond','mvp_feedback','mvp_schedule','mvp_shared_contacts','mvp_cards','mvp_metrics','mvp_blocked') then execute format('grant execute on function %s to authenticated',f.signature);end if;
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end;$$;
