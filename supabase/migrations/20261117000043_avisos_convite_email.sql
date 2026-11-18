-- 043 · Avisos transacionais de novos convites pelo SMTP existente.
-- Sem reenvio de convites antigos, sem contatos ou conteúdo profissional no e-mail.
alter table public.professional_profiles add column invite_email_notifications boolean not null default true;

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
  if p ? 'invite_email_notifications' then
    update public.professional_profiles set invite_email_notifications=(p->>'invite_email_notifications')::boolean where profile_id=uid;
  end if;
end;$$;

create table public.conversation_email_notifications (
 invite_id uuid primary key references public.conversation_invites(id) on delete cascade,
 state text not null default 'pendente' check(state in ('pendente','processando','enviado','ignorado','falha')),
 created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
 dispatched_at timestamptz, dispatch_attempts integer not null default 0 check(dispatch_attempts between 0 and 3),
 error_code text check(error_code in ('configuracao_email','falha_smtp','tempo_esgotado','limite_diario','destinataria_indisponivel','convite_indisponivel','avisos_desativados','fila_indisponivel','envio_indeterminado'))
);
alter table public.conversation_email_notifications enable row level security;
revoke all on public.conversation_email_notifications from public,anon,authenticated;
grant all on public.conversation_email_notifications to service_role;
create index conversation_email_notifications_pending on public.conversation_email_notifications(created_at) where state='pendente';

create function public.mvp_dispatch_invite_email(invite uuid) returns void language plpgsql security definer set search_path='' as $$
declare target text;secret text;begin
 if coalesce((select decrypted_secret from vault.decrypted_secrets where name='mvp_invite_email_enabled'),'false')<>'true' then return;end if;
 if not exists(select 1 from public.conversation_email_notifications where invite_id=invite and state='pendente' and dispatch_attempts<3) then return;end if;
 select replace(decrypted_secret,'/conversa-ia','/aviso-convite') into target from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if target is null or target !~ '^https://[^/]+/functions/v1/aviso-convite$' or secret is null then
  update public.conversation_email_notifications set state='falha',error_code='configuracao_email',finished_at=now() where invite_id=invite;return;
 end if;
 update public.conversation_email_notifications set dispatch_attempts=dispatch_attempts+1,dispatched_at=now() where invite_id=invite;
 begin
  perform net.http_post(url:=target,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('invite_id',invite),timeout_milliseconds:=20000);
 exception when others then
  update public.conversation_email_notifications set error_code='fila_indisponivel' where invite_id=invite;
 end;
end;$$;
create function public.mvp_queue_invite_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state='pendente' then
  insert into public.conversation_email_notifications(invite_id) values(new.id) on conflict do nothing;
  perform public.mvp_dispatch_invite_email(new.id);
 end if;
 return new;
end;$$;
create trigger invitation_email after insert on public.conversation_invites for each row execute function public.mvp_queue_invite_email();

create function public.mvp_claim_invite_email(invite uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.conversation_email_notifications;i public.conversation_invites;destinataria text;code text;begin
 select * into n from public.conversation_email_notifications where invite_id=invite for update;
 if not found or n.state<>'pendente' then return null;end if;
 select * into i from public.conversation_invites where id=invite;
 if i.id is null or i.state<>'pendente' or not public.mvp_account_active(i.sender_id) or not public.mvp_account_active(i.recipient_id) or public.mvp_blocked(i.sender_id,i.recipient_id) then code:='convite_indisponivel';
 elsif not coalesce((select invite_email_notifications from public.professional_profiles where profile_id=i.recipient_id),false) then code:='avisos_desativados';end if;
 select email into destinataria from auth.users where id=i.recipient_id and email_confirmed_at is not null;
 if code is null and destinataria is null then code:='destinataria_indisponivel';end if;
 if code is not null then
  update public.conversation_email_notifications set state='ignorado',error_code=code,finished_at=now() where invite_id=invite;return null;
 end if;
 perform pg_advisory_xact_lock(6261143);
 if (select count(*) from public.conversation_email_notifications where started_at>now()-interval '24 hours' and state in('processando','enviado'))>=100 then
  update public.conversation_email_notifications set state='falha',error_code='limite_diario',finished_at=now() where invite_id=invite;return null;
 end if;
 update public.conversation_email_notifications set state='processando',started_at=now(),error_code=null where invite_id=invite;
 return jsonb_build_object('invite_id',invite,'email',destinataria);
end;$$;
create function public.mvp_finish_invite_email(invite uuid,ok boolean,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 update public.conversation_email_notifications set state=case when ok then 'enviado' else 'falha' end,
  error_code=case when ok then null when error_code in ('configuracao_email','falha_smtp','tempo_esgotado','destinataria_indisponivel') then error_code else 'falha_smtp' end,finished_at=now()
 where invite_id=invite and state='processando';
end;$$;
create function public.mvp_retry_pending_invite_emails() returns void language plpgsql security definer set search_path='' as $$
declare pending record;begin
 update public.conversation_email_notifications set state='falha',error_code='envio_indeterminado',finished_at=now() where state='processando' and started_at<now()-interval '10 minutes';
 update public.conversation_email_notifications set state='falha',error_code='fila_indisponivel',finished_at=now() where state='pendente' and dispatch_attempts>=3 and dispatched_at<now()-interval '5 minutes';
 for pending in select invite_id from public.conversation_email_notifications where state='pendente' and dispatch_attempts<3 and (dispatched_at is null or dispatched_at<now()-interval '5 minutes') order by created_at limit 10 loop
  perform public.mvp_dispatch_invite_email(pending.invite_id);
 end loop;
end;$$;
select cron.schedule('aliadas-avisos-convite','*/5 * * * *','select public.mvp_retry_pending_invite_emails();');

revoke all on function public.mvp_dispatch_invite_email(uuid),public.mvp_queue_invite_email(),public.mvp_claim_invite_email(uuid),public.mvp_finish_invite_email(uuid,boolean,text),public.mvp_retry_pending_invite_emails() from public,anon,authenticated;
grant execute on function public.mvp_dispatch_invite_email(uuid),public.mvp_claim_invite_email(uuid),public.mvp_finish_invite_email(uuid,boolean,text),public.mvp_retry_pending_invite_emails() to service_role;
revoke all on function public.mvp_save_profile(jsonb,jsonb,boolean) from public,anon;
grant execute on function public.mvp_save_profile(jsonb,jsonb,boolean) to authenticated,service_role;
