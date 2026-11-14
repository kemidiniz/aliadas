-- =====================================================================
-- aliadas · 003 · fotos (bucket PRIVADO)
-- Caminho do arquivo: fotos/<id-da-dona>/<nome>.<jpg|png|webp>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "fotos: envio só na minha pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "fotos: troco só a minha" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "fotos: apago só a minha" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ver (e gerar URL assinada): dona, curadoria, ou usuária aprovada
-- vendo alguém aprovado com quem tem recomendação/conexão
create policy "fotos: vejo quando posso ver o perfil" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and public.pode_ver_foto(name));
