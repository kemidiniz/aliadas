-- =====================================================================
-- aliadas · 012 · limite de envios do formulário de feedback
-- O formulário é público e cada envio com e-mail gera uma resposta
-- automática. Sem limite, alguém poderia usar o site para disparar
-- e-mails (pelo Gmail da curadoria) para pessoas que não pediram.
--   - até 3 feedbacks por e-mail a cada 24 h
--   - até 60 feedbacks por hora no total
-- =====================================================================

create or replace function public.feedback_limite_envios()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and (
    select count(*) from public.feedback
     where lower(email) = lower(new.email) and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'recebemos várias mensagens deste e-mail hoje. tente de novo amanhã.';
  end if;
  if (select count(*) from public.feedback where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'muitas mensagens agora. tente de novo daqui a pouco.';
  end if;
  return new;
end;
$$;
revoke execute on function public.feedback_limite_envios() from public, anon, authenticated;

create trigger feedback_limite_envios
  before insert on public.feedback
  for each row execute function public.feedback_limite_envios();
