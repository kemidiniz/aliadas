-- 035 · O clique aprova a pessoa vista, mesmo com finalização assíncrona simultânea.
-- Mantém a RPC antiga para clientes já abertos; a interface nova usa a versão vinculada.
create function public.mvp_invite_reviewed(request uuid,candidate uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or candidate is null or r.candidate_id is distinct from candidate then raise exception 'Indicação atualizada. Confira novamente antes de enviar.';end if;
 return public.mvp_invite(request,message);
end;$$;
revoke all on function public.mvp_invite_reviewed(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.mvp_invite_reviewed(uuid,uuid,text) to authenticated,service_role;
