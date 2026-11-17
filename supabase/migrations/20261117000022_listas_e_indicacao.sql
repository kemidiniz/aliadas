-- 022 · Listas novas do perfil, nome completo após o aceite e regra de indicação.
-- ADITIVA: nada é apagado. moment e occupation continuam no banco, mas deixam
-- de ser obrigatórios; areas continua preenchida (área principal + interesses).

-- 1. Listas: situação, área principal (com "decidindo") e interesses.
create function public.mvp_situacao_de(moment text) returns text language sql immutable set search_path='' as $$
 select case moment when 'estudante' then 'estudo' when 'inicio' then 'trabalho' when 'transicao' then 'transicao' when 'experiente' then 'trabalho' end;
$$;
do $$declare c record;begin
 -- areas passa a aceitar "decidindo"; occupation pode ficar vazia (o check antigo recusava null)
 for c in select conname from pg_constraint where conrelid='public.professional_profiles'::regclass and contype='c'
  and (pg_get_constraintdef(oid) ilike '%areas <@%' or pg_get_constraintdef(oid) ilike '%mvp_text_safe(occupation)%') loop
  execute format('alter table public.professional_profiles drop constraint %I',c.conname);
 end loop;
end;$$;
alter table public.professional_profiles
 add constraint professional_profiles_areas_lista check(cardinality(areas) between 1 and 8 and areas <@ array['tecnologia','educacao','saude','negocios','comunicacao','artes','ciencias','direito','engenharia','servicos','outras','decidindo']),
 add constraint professional_profiles_ocupacao_segura check(occupation is null or public.mvp_text_safe(occupation)),
 alter column occupation drop not null,
 alter column moment drop not null,
 add column situacao text check(situacao in ('trabalho','estudo','trabalho_estudo','transicao','buscando')),
 add column area_principal text check(area_principal in ('tecnologia','educacao','saude','negocios','comunicacao','artes','ciencias','direito','engenharia','servicos','outras','decidindo')),
 add column interesses text[] not null default '{}' check(cardinality(interesses)<=5 and interesses <@ array['tecnologia','educacao','saude','negocios','comunicacao','artes','ciencias','direito','engenharia','servicos','outras','decidindo']);
-- Conversão sem perda: moment → situação; 1ª área → principal; áreas → interesses (até 5).
update public.professional_profiles set
 situacao=coalesce(public.mvp_situacao_de(moment),'trabalho'),
 area_principal=areas[1],
 interesses=areas[1:5];
alter table public.professional_profiles alter column situacao set not null, alter column area_principal set not null;

-- 2. Nome completo: opcional, liberado só após o aceite (como os contatos).
alter table public.professional_contacts add column nome_completo text check(nome_completo is null or (char_length(btrim(nome_completo)) between 2 and 120 and public.mvp_text_safe(nome_completo)));

create or replace function public.mvp_shared_contacts(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;other uuid;result jsonb;
begin
 select * into i from public.conversation_invites where id=invite and state='aceita' and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'contatos disponíveis apenas após aceite mútuo';end if;
 other:=case when i.sender_id=auth.uid() then i.recipient_id else i.sender_id end;
 select jsonb_build_object('linkedin',case when p.channels @> array['linkedin'] then c.linkedin end,'whatsapp',case when p.channels @> array['whatsapp'] then c.whatsapp end,'email',case when p.channels @> array['email'] then c.email end,'meet',c.meet,'nome_completo',c.nome_completo,'slots',p.slots,'common_slots',array(select unnest(p.slots) intersect select unnest(m.slots))) into result
 from public.professional_profiles p join public.professional_profiles m on m.profile_id=auth.uid() left join public.professional_contacts c on c.profile_id=p.profile_id where p.profile_id=other;
 return result;
end;$$;

-- 3. Cadastro: aceita os campos novos; payload antigo continua funcionando.
create or replace function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();help text[];talk text[];sit text;principal text;inter text[];todas text[];
begin
 if uid is null or terms is distinct from true then raise exception 'entre e aceite os termos';end if;
 if not public.mvp_text_safe(p->>'name') then raise exception 'não inclua contatos ou links no nome de apresentação';end if;
 if p ? 'can_help' or p ? 'want_talk' then
  help:=array(select distinct jsonb_array_elements_text(coalesce(p->'can_help','[]')));
  talk:=array(select distinct jsonb_array_elements_text(coalesce(p->'want_talk','[]')));
 else
  help:=case when p->'intentions' ? 'compartilhar' then array(select jsonb_array_elements_text(p->'themes')) else '{}' end;
  talk:=case when p->'intentions' ? 'buscar' then array(select jsonb_array_elements_text(p->'themes')) else '{}' end;
 end if;
 if cardinality(help)+cardinality(talk)=0 then raise exception 'escolha ao menos um assunto';end if;
 todas:=array(select jsonb_array_elements_text(coalesce(p->'areas','[]')));
 sit:=coalesce(nullif(p->>'situacao',''),public.mvp_situacao_de(p->>'moment'));
 principal:=coalesce(nullif(p->>'area_principal',''),todas[1]);
 inter:=case when p ? 'interesses' then array(select distinct jsonb_array_elements_text(p->'interesses')) else todas[1:5] end;
 if sit is null or principal is null then raise exception 'conte sua situação e sua área';end if;
 -- areas (legado) = área principal + interesses, sem repetir
 todas:=array(select distinct x from unnest(array[principal]||inter) x);
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),'perfil profissional','estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,situacao,area_principal,interesses,themes,intentions,can_help,want_talk,channels,slots,ai_consent,available)
 values(uid,nullif(btrim(p->>'occupation'),''),nullif(p->>'moment',''),todas,sit,principal,inter,
  array(select distinct x from unnest(help||talk) x),
  array_remove(array[case when cardinality(talk)>0 then 'buscar' end,case when cardinality(help)>0 then 'compartilhar' end],null),
  help,talk,array(select jsonb_array_elements_text(coalesce(p->'channels','[]'))),array(select jsonb_array_elements_text(coalesce(p->'slots','[]'))),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=coalesce(excluded.occupation,professional_profiles.occupation),moment=coalesce(excluded.moment,professional_profiles.moment),areas=excluded.areas,situacao=excluded.situacao,area_principal=excluded.area_principal,interesses=excluded.interesses,themes=excluded.themes,intentions=excluded.intentions,can_help=excluded.can_help,want_talk=excluded.want_talk,channels=excluded.channels,
  slots=case when p ? 'slots' then excluded.slots else professional_profiles.slots end,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet,nome_completo)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''),nullif(btrim(c->>'nome_completo'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,
  meet=case when c ? 'meet' then excluded.meet else professional_contacts.meet end,
  nome_completo=case when c ? 'nome_completo' then excluded.nome_completo else professional_contacts.nome_completo end;
end;$$;

-- 4. Indicação: canal em comum obrigatório; pontuação pela área e pelos interesses.
-- Mantém da 018: menos convites recebidos em 14 dias → sorteio; fora quem tem 2+ pendentes.
create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and p.can_help @> array[goal]
 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by (case when p.area_principal<>'decidindo' and (p.area_principal=any(mine.interesses) or p.area_principal=mine.area_principal) then 4 else 0 end
  + case when p.interesses && mine.interesses then 2 else 0 end) desc,
  (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days') asc,
  random()
 limit 1;
$$;

-- 5. Cartões: situação e área no lugar do texto livre.
create or replace function public.mvp_cards() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',case when public.mvp_text_safe(p.apelido) then p.apelido else 'participante' end,'occupation',pp.occupation,'situacao',pp.situacao,'area_principal',pp.area_principal,'interesses',pp.interesses,'areas',pp.areas,'moment',pp.moment)), '[]')
 from public.profiles p join public.professional_profiles pp on pp.profile_id=p.id
 where auth.uid() is not null and not public.mvp_blocked(auth.uid(),p.id) and (
 exists(select 1 from public.conversation_requests r where r.owner_id=auth.uid() and r.candidate_id=p.id)
 or exists(select 1 from public.conversation_invites i where auth.uid() in(i.sender_id,i.recipient_id) and p.id in(i.sender_id,i.recipient_id)));
$$;

-- 6. IA: só categorias (situação, área principal, interesses e assuntos) e o objetivo.
create or replace function public.mvp_claim_job(request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.conversation_jobs;r public.conversation_requests;a public.professional_profiles;b public.professional_profiles;
begin
 select * into r from public.conversation_requests where id=request;
 if not found then return null;end if;
 select * into j from public.conversation_jobs where request_id=request and state='pendente' and candidate_id is not distinct from r.candidate_id order by created_at desc limit 1 for update skip locked;
 if not found then return null;end if;
 select * into a from public.professional_profiles where profile_id=r.owner_id;
 select * into b from public.professional_profiles where profile_id=r.candidate_id;
 if a.ai_consent is distinct from true or b.ai_consent is distinct from true or public.mvp_blocked(r.owner_id,r.candidate_id) or not a.available or not b.available or (select count(*) from public.profiles where id in(r.owner_id,r.candidate_id) and status='aprovado')<>2 then
 update public.conversation_jobs set state='sem_consentimento',finished_at=now() where id=j.id;return null;end if;
 perform pg_advisory_xact_lock(726041);
 if (select count(*) from public.conversation_jobs where state<>'pendente' and created_at>now()-interval '24 hours')>=30 then
 update public.conversation_jobs set state='falha',error_code='limite_global',finished_at=now() where id=j.id;return null;end if;
 update public.conversation_jobs set state='executando' where id=j.id;
 return jsonb_build_object('job_id',j.id,'goal',r.goal,
  'a',jsonb_build_object('situacao',a.situacao,'area_principal',a.area_principal,'interesses',a.interesses,'themes',a.want_talk),
  'b',jsonb_build_object('situacao',b.situacao,'area_principal',b.area_principal,'interesses',b.interesses,'themes',b.can_help));
end;$$;

revoke all on function public.mvp_situacao_de(text) from public,anon,authenticated;
grant execute on function public.mvp_situacao_de(text) to service_role;
