-- =====================================================================
-- aliadas · seed de DESENVOLVIMENTO
-- Somente pessoas FICTÍCIAS. E-mails no domínio .invalid (não existem).
-- Rode no SQL Editor de um projeto de teste/demo. Não rode em produção
-- com usuárias reais.
-- =====================================================================

do $$
declare
  pessoas jsonb := '[
    {"apelido":"bia","de":"fui professora de matemática na rede pública por 6 anos e comecei a estudar programação à noite","onde":"ate_2_anos","area":"dados","obj":"virar analista de dados pleno","conq":"automatizei a planilha de notas da escola e economizei horas de trabalho por semana"},
    {"apelido":"jô","de":"trabalhei 8 anos no atendimento de telemarketing e migrei para suporte técnico","onde":"ate_2_anos","area":"suporte e infraestrutura","obj":"conseguir uma certificação de nuvem","conq":"fui promovida de suporte nível 1 para nível 2 em 10 meses"},
    {"apelido":"nina","de":"me formei em design gráfico e trabalhava como freelancer","onde":"primeira_vaga","area":"ux design","obj":"conseguir minha primeira vaga como ux designer","conq":"montei um portfólio com 3 estudos de caso de projetos voluntários"},
    {"apelido":"rô","de":"sou mãe solo, trabalhei no comércio e fiz um bootcamp gratuito de desenvolvimento web","onde":"ate_2_anos","area":"desenvolvimento front-end","obj":"chegar a desenvolvedora pleno","conq":"consegui minha primeira vaga de dev júnior depois de 7 meses estudando"},
    {"apelido":"lu","de":"cursei administração e trabalhei em banco","onde":"ate_2_anos","area":"produto","obj":"virar product manager","conq":"migrei de analista de negócios para product owner"},
    {"apelido":"dani","de":"vim do interior, fiz técnico em informática em escola pública","onde":"estudando","area":"desenvolvimento back-end","obj":"conseguir um estágio em desenvolvimento","conq":null},
    {"apelido":"cacau","de":"sou pessoa não binária, trabalhava com produção de eventos e comecei a estudar testes de software","onde":"ate_2_anos","area":"qualidade de software","obj":"liderar a área de qa do meu time","conq":"criei a primeira suíte de testes automatizados da empresa"},
    {"apelido":"mari","de":"fui enfermeira por 5 anos e estou estudando análise de dados para trabalhar com saúde","onde":"primeira_vaga","area":"dados","obj":"trabalhar com dados na área da saúde","conq":"terminei um curso de sql e python e fiz um projeto com dados públicos do sus"}
  ]';
  p jsonb;
  i int := 0;
  novo uuid;
begin
  for p in select * from jsonb_array_elements(pessoas) loop
    i := i + 1;
    novo := gen_random_uuid();

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', novo, 'authenticated', 'authenticated',
            format('ficticia%s@exemplo.invalid', lpad(i::text, 2, '0')), '', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

    insert into public.profiles (id, apelido, de_onde_vem, onde_esta, area_interesse,
                                 objetivo_12_meses, conquista, forma_conexao, status, aprovado_em)
    values (novo, p->>'apelido', p->>'de', p->>'onde', p->>'area', p->>'obj', p->>'conq',
            (array['chamada','mensagem','encontro'])[1 + (i % 3)], 'aprovado', now());

    insert into public.consents (profile_id, autodeclaracao, aceita_ser_recomendada,
                                 entende_contato_pos_aceite, sabe_que_pode_apagar, aceita_termo_conduta)
    values (novo, true, true, true, true, true);

    insert into public.contacts (profile_id, email, linkedin_url)
    values (novo, format('ficticia%s@exemplo.invalid', lpad(i::text, 2, '0')),
            format('https://www.linkedin.com/in/perfil-ficticio-%s', i));
  end loop;
end $$;
