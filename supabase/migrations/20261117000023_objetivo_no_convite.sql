-- 023 · O convite leva o objetivo (e o texto de "Outro").
-- Quem recebe não lê o pedido (RLS só da dona); por isso o objetivo é copiado
-- para o convite. O texto de "Outro" fica no pedido e no convite e nunca vai
-- para a IA (mvp_claim_job não o lê).
alter table public.conversation_invites
 add column goal text check(goal in ('situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro')),
 add column goal_text text check(goal_text is null or (char_length(btrim(goal_text)) between 1 and 200 and public.mvp_text_safe(goal_text)));
update public.conversation_invites i set goal=r.goal,goal_text=case when r.goal='outro' then left(nullif(btrim(r.description),''),200) end
 from public.conversation_requests r where r.id=i.request_id and i.goal is null and (r.goal<>'outro' or r.description is null or public.mvp_text_safe(left(r.description,200)));

-- Busca: texto só para "Outro" (até 200, sem contatos); nos outros objetivos não há contexto.
create or replace function public.mvp_create_request(goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();texto text:=nullif(btrim(coalesce(description,'')),'');
begin
 if uid is null or not public.eu_aprovada() or not exists(select 1 from public.professional_profiles where profile_id=uid and available) then raise exception 'complete o perfil e aguarde aprovação';end if;
 if goal<>'outro' then texto:=null;end if;
 if goal='outro' and texto is null then raise exception 'conte qual é o objetivo';end if;
 if texto is not null and (char_length(texto)>200 or not public.mvp_text_safe(texto)) then raise exception 'não coloque nomes nem contatos no objetivo (até 200 caracteres)';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,'buscar',goal,texto) returning id into result;return result;
end;$$;

create or replace function public.mvp_invite(request uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;result uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or r.candidate_id is null or public.mvp_blocked(r.owner_id,r.candidate_id) or not public.eu_aprovada() or not exists(select 1 from public.profiles where id=r.candidate_id and status='aprovado') or not exists(select 1 from public.professional_profiles where profile_id=r.candidate_id and available) then raise exception 'convite indisponível';end if;
 insert into public.conversation_invites(request_id,sender_id,recipient_id,message,goal,goal_text)
 values(r.id,r.owner_id,r.candidate_id,message,r.goal,case when r.goal='outro' then r.description end) returning id into result;return result;
end;$$;
