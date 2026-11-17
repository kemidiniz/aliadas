-- 032 · Motivo opcional da revisão humana. Nenhuma alteração de papéis.
alter table public.profiles add column review_reason text check(review_reason is null or char_length(review_reason)<=500);
create function public.mvp_admin_review_with_reason(target uuid,new_status text,reason text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if char_length(coalesce(reason,''))>500 then raise exception 'motivo tem até 500 caracteres';end if;
 perform public.mvp_admin_review(target,new_status);
 update public.profiles set review_reason=case when new_status='reprovado' then nullif(btrim(reason),'') end where id=target;
end;$$;
revoke all on function public.mvp_admin_review_with_reason(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mvp_admin_review_with_reason(uuid,text,text) to authenticated,service_role;
