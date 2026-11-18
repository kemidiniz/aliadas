-- 044 · Dois avisos independentes por convite: recebimento e aceite.
-- Mantém os registros anteriores como 'convite'. Nenhum aceite antigo é reenviado.
alter table public.conversation_email_notifications
 add column event text not null default 'convite' check(event in ('convite','aceite'));
alter table public.conversation_email_notifications drop constraint conversation_email_notifications_pkey;
alter table public.conversation_email_notifications add primary key(invite_id,event);

create function public.mvp_dispatch_invite_email(invite uuid,notification_event text) returns void language plpgsql security definer set search_path='' as $$
declare target text;secret text;begin
 if coalesce((select decrypted_secret from vault.decrypted_secrets where name='mvp_invite_email_enabled'),'false')<>'true' then return;end if;
 if not exists(select 1 from public.conversation_email_notifications where invite_id=invite and event=notification_event and state='pendente' and dispatch_attempts<3) then return;end if;
 select replace(decrypted_secret,'/conversa-ia','/aviso-convite') into target from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if target is null or target !~ '^https://[^/]+/functions/v1/aviso-convite$' or secret is null then
  update public.conversation_email_notifications set state='falha',error_code='configuracao_email',finished_at=now() where invite_id=invite and event=notification_event;return;
 end if;
 update public.conversation_email_notifications set dispatch_attempts=dispatch_attempts+1,dispatched_at=now() where invite_id=invite and event=notification_event;
 begin
  perform net.http_post(url:=target,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('invite_id',invite,'notification_event',notification_event),timeout_milliseconds:=20000);
 exception when others then
  update public.conversation_email_notifications set error_code='fila_indisponivel' where invite_id=invite and event=notification_event;
 end;
end;$$;
create function public.mvp_claim_invite_email(invite uuid,notification_event text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.conversation_email_notifications;i public.conversation_invites;destinataria text;destino uuid;code text;begin
 if notification_event not in ('convite','aceite') then raise exception 'Tipo de aviso inválido.';end if;
 select * into n from public.conversation_email_notifications where invite_id=invite and event=notification_event for update;
 if not found or n.state<>'pendente' then return null;end if;
 select * into i from public.conversation_invites where id=invite;
 destino:=case when notification_event='aceite' then i.sender_id else i.recipient_id end;
 if i.id is null or i.state is distinct from (case when notification_event='aceite' then 'aceita' else 'pendente' end) or not public.mvp_account_active(i.sender_id) or not public.mvp_account_active(i.recipient_id) or public.mvp_blocked(i.sender_id,i.recipient_id) then code:='convite_indisponivel';
 elsif not coalesce((select invite_email_notifications from public.professional_profiles where profile_id=destino),false) then code:='avisos_desativados';end if;
 select email into destinataria from auth.users where id=destino and email_confirmed_at is not null;
 if code is null and destinataria is null then code:='destinataria_indisponivel';end if;
 if code is not null then
  update public.conversation_email_notifications set state='ignorado',error_code=code,finished_at=now() where invite_id=invite and event=notification_event;return null;
 end if;
 perform pg_advisory_xact_lock(6261143);
 if (select count(*) from public.conversation_email_notifications where started_at>now()-interval '24 hours' and state in('processando','enviado'))>=100 then
  update public.conversation_email_notifications set state='falha',error_code='limite_diario',finished_at=now() where invite_id=invite and event=notification_event;return null;
 end if;
 update public.conversation_email_notifications set state='processando',started_at=now(),error_code=null where invite_id=invite and event=notification_event;
 return jsonb_build_object('invite_id',invite,'email',destinataria,'event',notification_event);
end;$$;
create function public.mvp_finish_invite_email(invite uuid,ok boolean,error_code text,notification_event text) returns void language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 update public.conversation_email_notifications set state=case when ok then 'enviado' else 'falha' end,
  error_code=case when ok then null when error_code in ('configuracao_email','falha_smtp','tempo_esgotado','destinataria_indisponivel') then error_code else 'falha_smtp' end,finished_at=now()
 where invite_id=invite and event=notification_event and state='processando';
end;$$;
create or replace function public.mvp_retry_pending_invite_emails() returns void language plpgsql security definer set search_path='' as $$
declare pending record;begin
 update public.conversation_email_notifications set state='falha',error_code='envio_indeterminado',finished_at=now() where state='processando' and started_at<now()-interval '10 minutes';
 update public.conversation_email_notifications set state='falha',error_code='fila_indisponivel',finished_at=now() where state='pendente' and dispatch_attempts>=3 and dispatched_at<now()-interval '5 minutes';
 for pending in select invite_id,event from public.conversation_email_notifications where state='pendente' and dispatch_attempts<3 and (dispatched_at is null or dispatched_at<now()-interval '5 minutes') order by created_at limit 10 loop
  perform public.mvp_dispatch_invite_email(pending.invite_id,pending.event);
 end loop;
end;$$;

-- Compatibilidade com chamadas e workers anteriores: sempre se referem ao recebimento.
create or replace function public.mvp_dispatch_invite_email(invite uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.mvp_dispatch_invite_email(invite,'convite');end;$$;
create or replace function public.mvp_claim_invite_email(invite uuid) returns jsonb language sql security definer set search_path='' as $$
 select public.mvp_claim_invite_email(invite,'convite');
$$;
create or replace function public.mvp_finish_invite_email(invite uuid,ok boolean,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
begin perform public.mvp_finish_invite_email(invite,ok,error_code,'convite');end;$$;

create function public.mvp_queue_accepted_invite_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.conversation_email_notifications(invite_id,event) values(new.id,'aceite') on conflict(invite_id,event) do nothing;
 perform public.mvp_dispatch_invite_email(new.id,'aceite');
 return new;
end;$$;
create trigger invitation_accepted_email after update of state on public.conversation_invites
 for each row when(old.state='pendente' and new.state='aceita') execute function public.mvp_queue_accepted_invite_email();

revoke all on function public.mvp_dispatch_invite_email(uuid,text),public.mvp_claim_invite_email(uuid,text),public.mvp_finish_invite_email(uuid,boolean,text,text),public.mvp_queue_accepted_invite_email() from public,anon,authenticated;
grant execute on function public.mvp_dispatch_invite_email(uuid,text),public.mvp_claim_invite_email(uuid,text),public.mvp_finish_invite_email(uuid,boolean,text,text) to service_role;
