-- Incorpora o histórico remoto sem reaproveitar aprovação automática por LinkedIn.
-- Links existentes e demais registros permanecem preservados.
drop trigger if exists contacts_aprova_com_linkedin on public.contacts;
