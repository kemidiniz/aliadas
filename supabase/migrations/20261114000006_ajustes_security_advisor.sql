-- =====================================================================
-- aliadas · 006 · ajustes pedidos pelo Security Advisor do Supabase
-- =====================================================================
-- pg_net fora do schema public (as funções continuam em net.*)
drop extension if exists pg_net;
create extension pg_net with schema extensions;

-- visitante anônimo não precisa executar is_curadora()
drop policy "programas: todo mundo vê os ativos" on public.programs;
create policy "programas: visitantes veem os ativos" on public.programs
  for select to anon using (ativo);
create policy "programas: logadas veem ativos; curadoria vê todos" on public.programs
  for select to authenticated using (ativo or public.is_curadora());
revoke execute on function public.is_curadora() from anon;
