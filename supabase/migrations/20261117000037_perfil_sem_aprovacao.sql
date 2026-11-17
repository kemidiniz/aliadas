-- 037 · Cadastro sem aprovação prévia. Pausas/restrições e papéis são preservados.
create function public.mvp_account_active(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select uid is not null and exists(select 1 from public.profiles p where p.id=uid and p.status in ('pendente','aprovado'));
$$;
create or replace function public.mvp_pode_buscar(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.mvp_account_active(uid) and exists(select 1 from public.professional_profiles p where p.profile_id=uid and p.situacao is not null and p.area_principal is not null and cardinality(p.channels)>0);
$$;
-- Visibilidade do MVP, independente das funções legadas ainda presentes em alguns ambientes.
create or replace function public.mvp_pode_ver(alvo uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (alvo=auth.uid() or public.mvp_can_review_profiles() or public.mvp_can_handle_reports()
 or (not public.mvp_blocked(auth.uid(),alvo) and (
  exists(select 1 from public.conversation_requests r where (r.owner_id=auth.uid() and r.candidate_id=alvo) or (r.owner_id=alvo and r.candidate_id=auth.uid()))
  or exists(select 1 from public.conversation_suggestions s join public.conversation_requests r on r.id=s.request_id where (r.owner_id=auth.uid() and s.candidate_id=alvo) or (r.owner_id=alvo and s.candidate_id=auth.uid()))
  or exists(select 1 from public.conversation_invites i where (i.sender_id=auth.uid() and i.recipient_id=alvo) or (i.sender_id=alvo and i.recipient_id=auth.uid())))));
$$;
drop policy if exists "perfis: vejo quando tenho motivo" on public.profiles;
create policy "perfis: vejo quando tenho motivo" on public.profiles for select to authenticated using(public.mvp_pode_ver(id));
drop policy if exists "fotos: vejo quando posso ver o perfil" on storage.objects;
create policy "fotos: vejo quando posso ver o perfil" on storage.objects for select to authenticated using(
 bucket_id='fotos' and case when split_part(name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.mvp_pode_ver(split_part(name,'/',1)::uuid) else false end);
drop policy if exists "denúncias: denuncio quem eu vejo" on public.reports;
create policy "denúncias: denuncio quem eu vejo" on public.reports for insert to authenticated with check(denunciante_id=auth.uid() and denunciado_id<>auth.uid() and public.mvp_pode_ver(denunciado_id));

-- Foto salva separadamente: outros campos incompletos não impedem o envio.
create function public.mvp_save_photo(photo text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();begin
 if uid is null then raise exception 'Entre para salvar sua foto.';end if;
 if photo is not null and (photo !~ ('^'||uid::text||'/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') or not exists(select 1 from storage.objects where bucket_id='fotos' and name=photo)) then raise exception 'Envie a foto na sua própria conta antes de salvar.';end if;
 update public.profiles set foto_path=photo where id=uid;
 if not found then raise exception 'Crie seu perfil antes de escolher a foto.';end if;
end;$$;

create or replace function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();help text[];skills text[];intents text[];sit text;principal text;inter text[];todas text[];
begin
 if uid is null or terms is distinct from true then raise exception 'entre e aceite os termos';end if;
 if not public.mvp_text_safe(p->>'name') then raise exception 'não inclua contatos ou links no nome de apresentação';end if;
 if p ? 'can_help' then
  help:=array(select distinct jsonb_array_elements_text(coalesce(p->'can_help','[]')));
 else -- formato antigo: themes + intentions
  help:=case when p->'intentions' ? 'compartilhar' then array(select jsonb_array_elements_text(coalesce(p->'themes','[]'))) else '{}' end;
 end if;
 skills:=case when p ? 'habilidades' then array(select jsonb_array_elements_text(p->'habilidades')) else coalesce((select habilidades from public.professional_profiles where profile_id=uid),'{}') end;
 if p ? 'habilidades' and coalesce((p->>'available')::boolean,true) and cardinality(skills)=0 then raise exception 'Escolha uma habilidade para receber convites ou desative a disponibilidade.';end if;
 if not public.mvp_habilidades_valid(skills) then raise exception 'escolha até oito habilidades da lista';end if;
 intents:=array_remove(array['buscar',case when cardinality(help)+cardinality(skills)>0 then 'compartilhar' end],null);
 todas:=array(select jsonb_array_elements_text(coalesce(p->'areas','[]')));
 sit:=coalesce(nullif(p->>'situacao',''),public.mvp_situacao_de(p->>'moment'));
 principal:=coalesce(nullif(p->>'area_principal',''),todas[1]);
 inter:=case when p ? 'interesses' then array(select distinct jsonb_array_elements_text(p->'interesses')) else coalesce((select interesses from public.professional_profiles where profile_id=uid),'{}') end;
 if sit is null or principal is null then raise exception 'conte sua situação e sua área';end if;
 todas:=array(select distinct x from unnest(array[principal]||inter) x);
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),'perfil profissional','estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,situacao,area_principal,interesses,habilidades,themes,intentions,can_help,want_talk,channels,slots,ai_consent,available)
 values(uid,nullif(btrim(p->>'occupation'),''),nullif(p->>'moment',''),todas,sit,principal,inter,skills,help,intents,
  help,'{}',array(select jsonb_array_elements_text(coalesce(p->'channels','[]'))),array(select jsonb_array_elements_text(coalesce(p->'slots','[]'))),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=coalesce(excluded.occupation,professional_profiles.occupation),moment=coalesce(excluded.moment,professional_profiles.moment),areas=excluded.areas,situacao=excluded.situacao,area_principal=excluded.area_principal,interesses=excluded.interesses,
  habilidades=excluded.habilidades,themes=excluded.themes,intentions=excluded.intentions,can_help=excluded.can_help,channels=excluded.channels,
  slots=case when p ? 'slots' then excluded.slots else professional_profiles.slots end,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet,nome_completo)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''),nullif(btrim(c->>'nome_completo'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,
  meet=case when c ? 'meet' then excluded.meet else professional_contacts.meet end,
  nome_completo=case when c ? 'nome_completo' then excluded.nome_completo else professional_contacts.nome_completo end;
 if p ? 'ai_consent' then update public.professional_profiles set ai_consent_version=case when not ai_consent then 'revogado' when p->>'ai_consent_version'='habilidades-v1' then 'habilidades-v1' else ai_consent_version end where profile_id=uid;end if;
end;$$;

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

 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email','meet'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by 6 desc,7 asc,random();
$$;
create or replace function public.mvp_create_request(goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();texto text:=nullif(btrim(coalesce(description,'')),'');
begin
 if uid is null or not public.mvp_account_active(auth.uid()) or not public.mvp_pode_buscar(uid) then raise exception 'falta pouco: complete seus contatos para continuar';end if;
 if goal='outro' and texto is null then raise exception 'conte qual é o objetivo';end if;
 if texto is not null and char_length(texto)>300 then raise exception 'conte em até 300 caracteres';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,'buscar',goal,texto) returning id into result;return result;
end;$$;
create or replace function public.mvp_next_suggestion(request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;chosen uuid;skills text[];ai boolean:=false;excluded uuid[];
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) or exists(select 1 from public.conversation_invites where request_id=r.id) then raise exception 'busca indisponível';end if;
 if r.candidate_id is not null then insert into public.conversation_suggestions(request_id,candidate_id) values(r.id,r.candidate_id) on conflict do nothing;end if;
 excluded:=array(select candidate_id from public.conversation_suggestions where request_id=r.id);
 if r.mode='ia' then
  select p.candidate_id,p.habilidades_que_ajudam into chosen,skills from public.conversation_recommendation_pool p join public.mvp_eligible_candidates(r.owner_id,r.goal,excluded) e on e.candidate=p.candidate_id
   where p.request_id=r.id and p.posicao is not null and e.ai_consent and p.habilidades_que_ajudam <@ e.habilidades order by p.posicao limit 1;
  ai:=chosen is not null;
 end if;
 if chosen is null then chosen:=public.mvp_pick_candidate(r.owner_id,r.goal,excluded);skills:=public.mvp_candidate_skills(chosen,r.goal);end if;
 update public.conversation_jobs set state='falha',error_code='revisao_iniciada',finished_at=now() where request_id=r.id and state in ('pendente','executando');
 update public.conversation_requests set candidate_id=chosen,state=case when chosen is null then 'sem_candidata' else 'pronta' end,mode=case when ai then 'ia' else 'regra' end,
  habilidades_que_ajudam=coalesce(skills,'{}'),habilidades_necessarias=case when ai then habilidades_necessarias else public.mvp_goal_skills(r.goal) end,next_count=next_count+1,fallback_locked=true where id=r.id;
 return chosen;
end;$$;
create or replace function public.mvp_invite(request uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;result uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) or not exists(select 1 from public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') e where candidate=r.candidate_id) then raise exception 'convite indisponível';end if;
 update public.conversation_requests set fallback_locked=true where id=r.id;
 insert into public.conversation_invites(request_id,sender_id,recipient_id,message,goal) values(r.id,r.owner_id,r.candidate_id,message,r.goal) returning id into result;return result;
end;$$;
create or replace function public.mvp_respond(invite uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.conversation_invites set state=case when accept then 'aceita' else 'recusada' end,responded_at=now()
 where id=invite and recipient_id=auth.uid() and state='pendente' and not public.mvp_blocked(sender_id,recipient_id) and public.mvp_account_active(auth.uid()) and exists(select 1 from public.profiles p where p.id=sender_id and p.status in ('pendente','aprovado'));
 if not found then raise exception 'convite indisponível';end if;
end;$$;

revoke all on function public.mvp_pode_ver(uuid) from public,anon;
revoke all on function public.mvp_account_active(uuid),public.mvp_save_photo(text) from public,anon,authenticated;
grant execute on function public.mvp_account_active(uuid) to service_role;
grant execute on function public.mvp_save_photo(text),public.mvp_pode_ver(uuid) to authenticated,service_role;
