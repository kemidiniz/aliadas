-- =====================================================================
-- aliadas · seed de DESENVOLVIMENTO
-- Somente pessoas FICTÍCIAS. E-mails no domínio .invalid (não existem).
-- Rode no SQL Editor de um projeto de teste/demo. Não rode em produção
-- com usuárias reais.
-- =====================================================================

do $$
declare
  pessoas jsonb := '[
    {"apelido":"bia","de":"fui professora de matemática na rede pública por 6 anos e comecei a estudar programação à noite","onde":"ate_2_anos","areas":["dados","inteligência artificial"]},
    {"apelido":"jô","de":"trabalhei 8 anos no atendimento de telemarketing e migrei para suporte técnico","onde":"ate_2_anos","areas":["infraestrutura e nuvem"]},
    {"apelido":"nina","de":"me formei em design gráfico e trabalhava como freelancer","onde":"primeira_vaga","areas":["ux design","produto"]},
    {"apelido":"rô","de":"sou mãe solo, trabalhei no comércio e fiz um bootcamp gratuito de desenvolvimento web","onde":"ate_2_anos","areas":["desenvolvimento front-end"]},
    {"apelido":"lu","de":"cursei administração, trabalhei em banco e migrei para product owner","onde":"ate_2_anos","areas":["produto","inteligência artificial"]},
    {"apelido":"dani","de":"vim do interior, fiz técnico em informática em escola pública","onde":"estudando","areas":["desenvolvimento back-end"]},
    {"apelido":"cacau","de":"sou pessoa não binária, trabalhava com produção de eventos e hoje trabalho com testes de software","onde":"ate_2_anos","areas":["qualidade de software"]},
    {"apelido":"mari","de":"fui enfermeira por 5 anos e estou estudando análise de dados para trabalhar com saúde","onde":"primeira_vaga","areas":["dados","inteligência artificial"]}
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

    insert into public.profiles (id, apelido, de_onde_vem, onde_esta, areas, formas_conexao, status, aprovado_em)
    values (novo, p->>'apelido', p->>'de', p->>'onde',
            array(select jsonb_array_elements_text(p->'areas')),
            case i % 3 when 0 then array['chamada','mensagem'] when 1 then array['chamada']
                       else array['mensagem','encontro'] end,
            'aprovado', now());

    insert into public.consents (profile_id, autodeclaracao, aceita_ser_recomendada,
                                 entende_contato_pos_aceite, sabe_que_pode_apagar, aceita_termo_conduta)
    values (novo, true, true, true, true, true);

    insert into public.contacts (profile_id, email, linkedin_url)
    values (novo, format('ficticia%s@exemplo.invalid', lpad(i::text, 2, '0')),
            format('https://www.linkedin.com/in/perfil-ficticio-%s', i));
  end loop;
end $$;
