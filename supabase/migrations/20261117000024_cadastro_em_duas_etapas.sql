-- 024 · Cadastro em duas etapas.
-- No primeiro acesso a pessoa informa só nome, situação, área e como quer
-- participar. Assuntos, interesses e contatos vêm depois ("Falta pouco").
-- A disposição fica em intentions (buscar = "Quero uma conversa",
-- compartilhar = "Topo ajudar alguém"). Nada é apagado.
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.professional_profiles'::regclass and contype='c'
  and (conname='professional_profiles_algum_objetivo'
   or pg_get_constraintdef(oid) ilike '%cardinality(themes) >= 1%'
   or pg_get_constraintdef(oid) ilike '%cardinality(channels) >= 1%') loop
  execute format('alter table public.professional_profiles drop constraint %I',c.conname);
 end loop;
end;$$;
alter table public.professional_profiles
 add constraint professional_profiles_temas_lista check(cardinality(themes)<=8 and themes <@ array['situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro']),
 add constraint professional_profiles_canais_lista check(cardinality(channels)<=4 and channels <@ array['linkedin','whatsapp','email','meet']);
-- intentions continua exigindo 1 ou 2 itens (pelo menos uma forma de participar).

-- Perfil completo para buscar: pelo menos um contato e, para quem quer conversa, um assunto.
create function public.mvp_pode_buscar(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.professional_profiles p where p.profile_id=uid and p.available
  and exists(select 1 from unnest(p.channels) ch where ch in ('linkedin','whatsapp','email'))
  and cardinality(p.interesses)>0);
$$;

create or replace function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();help text[];talk text[];intents text[];sit text;principal text;inter text[];todas text[];
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
 -- "Como quer participar agora?" (modos) define a disposição; sem modos, vale o que as listas dizem
 if p ? 'modos' then
  intents:=array_remove(array[case when p->'modos' ? 'conversa' then 'buscar' end,case when p->'modos' ? 'ajudar' then 'compartilhar' end],null);
  if not p->'modos' ? 'ajudar' then help:='{}';end if;
  if not p->'modos' ? 'conversa' then talk:='{}';end if;
 else
  intents:=array_remove(array[case when cardinality(talk)>0 then 'buscar' end,case when cardinality(help)>0 then 'compartilhar' end],null);
 end if;
 if cardinality(intents)=0 then raise exception 'escolha como quer participar';end if;
 todas:=array(select jsonb_array_elements_text(coalesce(p->'areas','[]')));
 sit:=coalesce(nullif(p->>'situacao',''),public.mvp_situacao_de(p->>'moment'));
 principal:=coalesce(nullif(p->>'area_principal',''),todas[1]);
 inter:=case when p ? 'interesses' then array(select distinct jsonb_array_elements_text(p->'interesses')) else todas[1:5] end;
 if sit is null or principal is null then raise exception 'conte sua situação e sua área';end if;
 todas:=array(select distinct x from unnest(array[principal]||inter) x);
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),'perfil profissional','estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,situacao,area_principal,interesses,themes,intentions,can_help,want_talk,channels,slots,ai_consent,available)
 values(uid,nullif(btrim(p->>'occupation'),''),nullif(p->>'moment',''),todas,sit,principal,inter,
  array(select distinct x from unnest(help||talk) x),intents,
  help,talk,array(select jsonb_array_elements_text(coalesce(p->'channels','[]'))),array(select jsonb_array_elements_text(coalesce(p->'slots','[]'))),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=coalesce(excluded.occupation,professional_profiles.occupation),moment=coalesce(excluded.moment,professional_profiles.moment),areas=excluded.areas,situacao=excluded.situacao,area_principal=excluded.area_principal,interesses=excluded.interesses,themes=excluded.themes,intentions=excluded.intentions,can_help=excluded.can_help,want_talk=excluded.want_talk,channels=excluded.channels,
  slots=case when p ? 'slots' then excluded.slots else professional_profiles.slots end,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet,nome_completo)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''),nullif(btrim(c->>'nome_completo'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,
  meet=case when c ? 'meet' then excluded.meet else professional_contacts.meet end,
  nome_completo=case when c ? 'nome_completo' then excluded.nome_completo else professional_contacts.nome_completo end;
end;$$;

-- Buscar exige o perfil completo (contato e interesses).
create or replace function public.mvp_create_request(goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();texto text:=nullif(btrim(coalesce(description,'')),'');
begin
 if uid is null or not public.eu_aprovada() or not exists(select 1 from public.professional_profiles where profile_id=uid and available) then raise exception 'complete o perfil e aguarde aprovação';end if;
 if not public.mvp_pode_buscar(uid) then raise exception 'falta pouco: complete seus contatos e interesses';end if;
 if goal<>'outro' then texto:=null;end if;
 if goal='outro' and texto is null then raise exception 'conte qual é o objetivo';end if;
 if texto is not null and (char_length(texto)>200 or not public.mvp_text_safe(texto)) then raise exception 'não coloque nomes nem contatos no objetivo (até 200 caracteres)';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,'buscar',goal,texto) returning id into result;return result;
end;$$;

revoke all on function public.mvp_pode_buscar(uuid) from public,anon,authenticated;
grant execute on function public.mvp_pode_buscar(uuid) to service_role;
