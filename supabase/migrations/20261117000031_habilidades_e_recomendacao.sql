-- 031 · Habilidades padronizadas e recomendação. Migration aditiva; histórico preservado.
create table public.habilidades_referencia (
 id text primary key, nome text not null, grupo text not null, descricao text not null, sinonimos text[] not null
);
alter table public.habilidades_referencia enable row level security;
revoke all on public.habilidades_referencia from public, anon, authenticated;
grant select on public.habilidades_referencia to anon, authenticated;
grant all on public.habilidades_referencia to service_role;
create policy "catálogo público" on public.habilidades_referencia for select to anon, authenticated using(true);
insert into public.habilidades_referencia values
('entrevistas','Preparação para entrevistas','Carreira','Preparar respostas e etapas de processos seletivos.',array['processo seletivo','dinâmica','case','entrevista']),
('curriculo_linkedin','Currículo e LinkedIn','Carreira','Organizar currículo e apresentação profissional no LinkedIn.',array['currículo','cv','linkedin']),
('transicao_carreira','Transição de carreira','Carreira','Planejar mudanças de área ou de atuação profissional.',array['mudar de área','recolocação','transição']),
('planejamento_carreira','Planejamento de carreira','Carreira','Definir próximos passos e objetivos de carreira.',array['plano de carreira','objetivos','desenvolvimento']),
('negociacao_salarial','Negociação salarial','Carreira','Preparar conversas sobre salário e remuneração.',array['salário','remuneração','aumento']),
('networking','Networking','Carreira','Construir e manter conexões profissionais.',array['rede de contatos','conexões','networking']),
('apresentacoes','Apresentações e falar em público','Comunicação','Organizar ideias e praticar apresentações.',array['oratória','apresentação','pitch','falar em público']),
('escrita_profissional','Escrita profissional','Comunicação','Escrever textos claros para o trabalho.',array['redação','comunicação escrita','escrita']),
('feedback_conversas','Feedback e conversas difíceis','Comunicação','Preparar feedbacks e conversas profissionais delicadas.',array['feedback','conflito','conversa difícil']),
('negociacao','Negociação','Comunicação','Preparar acordos e negociar interesses profissionais.',array['acordo','negociar','negociação']),
('lideranca','Liderança de equipes','Gestão e liderança','Compartilhar práticas de liderança e gestão de pessoas.',array['liderança','gestão de pessoas','equipes']),
('gestao_projetos','Gestão de projetos','Gestão e liderança','Planejar e acompanhar entregas de projetos.',array['projetos','cronograma','scrum','kanban']),
('organizacao_produtividade','Organização e produtividade','Gestão e liderança','Organizar prioridades e rotinas de trabalho.',array['produtividade','prioridades','gestão do tempo']),
('tomada_decisao','Tomada de decisão','Gestão e liderança','Estruturar opções e critérios para decisões.',array['decidir','decisão','priorização']),
('programacao','Programação','Tecnologia e dados','Compartilhar conhecimentos de desenvolvimento de software.',array['código','software','python','javascript','programação']),
('analise_dados','Análise de dados','Tecnologia e dados','Interpretar dados e construir análises.',array['planilhas','sql','estatística','dados']),
('ia_trabalho','IA no trabalho','Tecnologia e dados','Aplicar ferramentas de IA em atividades profissionais.',array['inteligência artificial','gemini','prompt','ia']),
('nocode','Ferramentas sem código','Tecnologia e dados','Criar soluções e automações sem programar.',array['no code','nocode','make','automação']),
('ux_produto','UX e design de produto','Tecnologia e dados','Pesquisar necessidades e desenhar experiências de uso.',array['ux','ui','design','produto','usabilidade']),
('empreendedorismo','Empreendedorismo','Negócios','Estruturar ideias e atividades de um negócio.',array['empreender','negócio','empreendedorismo']),
('marketing_digital','Marketing digital e redes sociais','Negócios','Planejar comunicação e presença digital.',array['marketing','redes sociais','conteúdo']),
('vendas_atendimento','Vendas e atendimento','Negócios','Aprimorar vendas e relacionamento com clientes.',array['vendas','atendimento','clientes']),
('financas_precificacao','Finanças e precificação','Negócios','Organizar finanças e definir preços.',array['finanças','preço','precificação','orçamento']),
('portfolio','Montar portfólio','Estudos e projetos','Selecionar e apresentar trabalhos em um portfólio.',array['portfólio','portfolio','trabalhos']),
('rotina_estudos','Rotina de estudos','Estudos e projetos','Organizar estudos e aprendizagem.',array['estudos','aprendizagem','estudar']),
('projetos_pessoais','Projetos pessoais','Estudos e projetos','Tirar projetos profissionais próprios do papel.',array['projeto pessoal','projeto autoral','iniciativa']);
create function public.mvp_habilidades_valid(h text[]) returns boolean language sql immutable set search_path='' as $$
 select h is not null and cardinality(h)<=8 and h <@ array['entrevistas','curriculo_linkedin','transicao_carreira','planejamento_carreira','negociacao_salarial','networking','apresentacoes','escrita_profissional','feedback_conversas','negociacao','lideranca','gestao_projetos','organizacao_produtividade','tomada_decisao','programacao','analise_dados','ia_trabalho','nocode','ux_produto','empreendedorismo','marketing_digital','vendas_atendimento','financas_precificacao','portfolio','rotina_estudos','projetos_pessoais'] and cardinality(h)=(select count(distinct x) from unnest(h) x);
$$;
alter table public.professional_profiles add column habilidades text[] not null default '{}' check(public.mvp_habilidades_valid(habilidades));
create function public.mvp_goal_skills(g text) returns text[] language sql immutable set search_path='' as $$
 select case g
 when 'situacao' then array['feedback_conversas','tomada_decisao','negociacao','organizacao_produtividade']
 when 'entrevista' then array['entrevistas','curriculo_linkedin','apresentacoes']
 when 'apresentacao' then array['apresentacoes','escrita_profissional','feedback_conversas']
 when 'portfolio' then array['portfolio','ux_produto','escrita_profissional']
 when 'carreira' then array['planejamento_carreira','transicao_carreira','negociacao_salarial','networking']
 when 'rede' then array['networking','apresentacoes','escrita_profissional']
 when 'projeto' then array['gestao_projetos','projetos_pessoais','tomada_decisao','empreendedorismo']
 when 'outro' then array['planejamento_carreira','tomada_decisao','projetos_pessoais'] else '{}'::text[] end;
$$;
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
 if not public.mvp_habilidades_valid(skills) then raise exception 'escolha até oito habilidades da lista';end if;
 intents:=array_remove(array['buscar',case when cardinality(help)+cardinality(skills)>0 then 'compartilhar' end],null);
 todas:=array(select jsonb_array_elements_text(coalesce(p->'areas','[]')));
 sit:=coalesce(nullif(p->>'situacao',''),public.mvp_situacao_de(p->>'moment'));
 principal:=coalesce(nullif(p->>'area_principal',''),todas[1]);
 inter:=case when p ? 'interesses' then array(select distinct jsonb_array_elements_text(p->'interesses')) else todas[1:5] end;
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
 if p ? 'ai_consent' then update public.professional_profiles set ai_consent_version=case when ai_consent then 'habilidades-v1' else 'revogado' end where profile_id=uid;end if;
end;$$;

create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and (p.habilidades && public.mvp_goal_skills(goal) or (cardinality(p.habilidades)=0 and p.can_help @> array[goal]))
 and cardinality(p.interesses)>0
 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id
  where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by (case when p.area_principal<>'decidindo' and (p.area_principal=any(mine.interesses) or p.area_principal=mine.area_principal) then 4 else 0 end
  + case when p.interesses && mine.interesses then 2 else 0 end) desc,
  (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days') asc,
  random()
 limit 1;
$$;

revoke all on function public.mvp_habilidades_valid(text[]), public.mvp_goal_skills(text) from public,anon,authenticated;
grant execute on function public.mvp_habilidades_valid(text[]), public.mvp_goal_skills(text) to service_role;

-- Dados de recomendação novos. Colunas de justificativa/perguntas/rascunho antigas preservadas.
alter table public.conversation_requests
 add column habilidades_necessarias text[] not null default '{}',
 add column habilidades_que_ajudam text[] not null default '{}',
 add column next_count integer not null default 0 check(next_count>=0),
 add column fallback_locked boolean not null default false,
 add column recommendation_version text not null default 'legado';
do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.conversation_requests'::regclass and contype='c' and pg_get_constraintdef(oid) like '%mode%' loop
 execute format('alter table public.conversation_requests drop constraint %I',c.conname);end loop;
end;$$;
alter table public.conversation_requests add constraint conversation_requests_mode_031 check(mode in ('basica','generativa','ia','regra'));
alter table public.professional_profiles add column ai_consent_version text not null default 'legado';
alter table public.conversation_jobs add column started_at timestamptz;
-- O novo consentimento acompanha a finalidade nova, sem fabricar consentimentos antigos.
create function public.mvp_skill_consent() returns trigger language plpgsql set search_path='' as $$
begin
 if new.ai_consent and (tg_op='INSERT' or new.habilidades is distinct from old.habilidades or new.ai_consent is distinct from old.ai_consent) then
  new.ai_consent_version:='habilidades-v1';
 end if;
 return new;
end;$$;
create trigger professional_skills_consent before insert or update on public.professional_profiles for each row execute function public.mvp_skill_consent();
-- O RPC de salvar define a versão mesmo quando as habilidades não mudaram.
-- Função privada registra pool e ordem sem expor ids reais no payload externo ou em SELECT de pedidos.
create table public.conversation_recommendation_pool (
 request_id uuid not null references public.conversation_requests(id) on delete cascade,
 codigo text not null check(codigo ~ '^C([1-9]|1[0-5])$'),
 candidate_id uuid not null references public.profiles(id) on delete cascade,
 habilidades text[] not null,
 posicao integer,
 habilidades_que_ajudam text[] not null default '{}',
 primary key(request_id,codigo),unique(request_id,candidate_id)
);
alter table public.conversation_recommendation_pool enable row level security;
revoke all on public.conversation_recommendation_pool from public,anon,authenticated;
grant all on public.conversation_recommendation_pool to service_role;
-- O contexto livre só pode ser lido pela dona; a destinatária usa RPC autorizada do convite.
drop policy if exists "solicitações: dona ou curadoria" on public.conversation_requests;
create policy "solicitações: somente dona" on public.conversation_requests for select to authenticated using(owner_id=auth.uid());

create function public.mvp_eligible_candidates(owner uuid,goal text,exclude uuid[] default '{}')
returns table(candidate uuid, habilidades text[], ai_consent boolean, situacao text, area_principal text, matches integer, recent bigint, legacy boolean)
language sql volatile security definer set search_path='' as $$
 select p.profile_id,p.habilidades,(p.ai_consent and p.ai_consent_version='habilidades-v1'),p.situacao,p.area_principal,
 (select count(*)::integer from unnest(p.habilidades) h where h=any(public.mvp_goal_skills(goal))),
 (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days'),
 (cardinality(p.habilidades)=0 and p.can_help @> array[goal])
 from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner join public.profiles me on me.id=mine.profile_id
 where me.status='aprovado' and mine.available and p.profile_id<>owner and p.available and pr.status='aprovado'
 and (cardinality(p.habilidades)>0 or cardinality(p.can_help)>0)
 and p.profile_id<>all(coalesce(exclude,'{}')) and not public.mvp_blocked(owner,p.profile_id)
 and cardinality(p.interesses)>0
 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email','meet'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by 6 desc,7 asc,random();
$$;
create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select candidate from public.mvp_eligible_candidates(owner,goal,exclude) where matches>0 or legacy limit 1;
$$;
create function public.mvp_candidate_skills(candidate uuid,goal text) returns text[] language sql stable security definer set search_path='' as $$
 select coalesce(array(select h from public.professional_profiles p,unnest(p.habilidades) h where p.profile_id=candidate and h=any(public.mvp_goal_skills(goal))), '{}');
$$;
create or replace function public.mvp_match_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.candidate_id:=public.mvp_pick_candidate(new.owner_id,new.goal,'{}');
 new.state:=case when new.candidate_id is null then 'sem_candidata' else 'pronta' end;
 new.mode:='regra';new.recommendation_version:='habilidades-v1';
 new.habilidades_necessarias:=public.mvp_goal_skills(new.goal);
 new.habilidades_que_ajudam:=public.mvp_candidate_skills(new.candidate_id,new.goal);
 return new;
end;$$;
create or replace function public.mvp_create_request(goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();texto text:=nullif(btrim(coalesce(description,'')),'');
begin
 if uid is null or not public.eu_aprovada() or not public.mvp_pode_buscar(uid) then raise exception 'falta pouco: complete seus contatos e interesses e aguarde aprovação';end if;
 if goal='outro' and texto is null then raise exception 'conte qual é o objetivo';end if;
 if texto is not null and char_length(texto)>300 then raise exception 'conte em até 300 caracteres';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,'buscar',goal,texto) returning id into result;return result;
end;$$;
create or replace function public.mvp_queue_job(request uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;url text;secret text;
begin
 select * into r from public.conversation_requests where id=request;
 if not exists(select 1 from public.professional_profiles where profile_id=r.owner_id and ai_consent and ai_consent_version='habilidades-v1') or exists(select 1 from public.conversation_jobs where request_id=r.id) then return;end if;
 insert into public.conversation_recommendation_pool(request_id,codigo,candidate_id,habilidades)
 select r.id,'C'||row_number() over(),e.candidate,e.habilidades from
 (select * from public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') where ai_consent and cardinality(habilidades)>0 limit 15) e;
 if not found then return;end if;
 insert into public.conversation_jobs(request_id,candidate_id) values(r.id,r.candidate_id);
 select decrypted_secret into url from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if url is null or secret is null then
  update public.conversation_jobs set state='falha',error_code='ia_nao_configurada',finished_at=now() where request_id=r.id;return;
 end if;
 begin
  perform net.http_post(url:=url,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('request_id',r.id),timeout_milliseconds:=20000);
 exception when others then update public.conversation_jobs set state='falha',error_code='fila_indisponivel',finished_at=now() where request_id=r.id;end;
end;$$;
create or replace function public.mvp_claim_job(request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.conversation_jobs;r public.conversation_requests;a public.professional_profiles;pool jsonb;
begin
 select * into r from public.conversation_requests where id=request for update;
 if not found or r.fallback_locked or r.next_count>0 or exists(select 1 from public.conversation_invites where request_id=r.id) then return null;end if;
 select * into j from public.conversation_jobs where request_id=request and state='pendente' order by created_at desc limit 1 for update skip locked;
 if not found then return null;end if;
 select * into a from public.professional_profiles where profile_id=r.owner_id;
 if not a.ai_consent or a.ai_consent_version<>'habilidades-v1' or not public.mvp_pode_buscar(r.owner_id) then
 update public.conversation_jobs set state='sem_consentimento',finished_at=now() where id=j.id;return null;end if;
 -- Reconfere consentimentos e elegibilidade na hora da chamada.
 select jsonb_agg(jsonb_build_object('codigo',p.codigo,'habilidades',e.habilidades,'situacao',e.situacao,'area_principal',e.area_principal,'ai_consent',true) order by substring(p.codigo from 2)::int) into pool
 from public.conversation_recommendation_pool p join public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') e on e.candidate=p.candidate_id where p.request_id=r.id and e.ai_consent and cardinality(e.habilidades)>0;
 if pool is null then update public.conversation_jobs set state='sem_consentimento',finished_at=now() where id=j.id;return null;end if;
 perform pg_advisory_xact_lock(726041);
 if (select count(*) from public.conversation_jobs where started_at>now()-interval '24 hours' or (started_at is null and created_at>now()-interval '24 hours' and (state in ('executando','concluida') or coalesce(input_tokens,0)+coalesce(output_tokens,0)>0)))>=30 then
 update public.conversation_jobs set state='falha',error_code='limite_global',finished_at=now() where id=j.id;return null;end if;
 update public.conversation_jobs set state='executando',started_at=now() where id=j.id;
 return jsonb_build_object('job_id',j.id,'goal',r.goal,'description',r.description,
 'a',jsonb_build_object('situacao',a.situacao,'area_principal',a.area_principal,'interesses',a.interesses,'ai_consent',true),'candidates',pool);
end;$$;
create or replace function public.mvp_finish_job(job uuid,result jsonb,model text,input_tokens integer,output_tokens integer,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;j public.conversation_jobs;needs text[];item jsonb;skills text[];codes text[]:='{}';code text;target uuid;ordered_ids uuid[]:='{}';chosen uuid;pos integer:=0;
begin
 select cr.* into r from public.conversation_requests cr join public.conversation_jobs jj on jj.request_id=cr.id where jj.id=job for update of cr;
 select * into j from public.conversation_jobs where id=job for update;
 if r.id is null or j.started_at is null then raise exception 'execução indisponível';end if;
 if j.state not in ('executando','falha') then return;end if;
 if r.fallback_locked or r.next_count>0 or exists(select 1 from public.conversation_invites where request_id=r.id) then error_code:=coalesce(error_code,'revisao_iniciada');end if;
 if error_code is null and not exists(select 1 from public.professional_profiles where profile_id=r.owner_id and ai_consent and ai_consent_version='habilidades-v1') then error_code:='consentimento_revogado';end if;
 if error_code is null then
  begin
   if result is null or jsonb_typeof(result->'habilidades_necessarias') is distinct from 'array' or jsonb_typeof(result->'recomendadas') is distinct from 'array' or (select count(*) from jsonb_object_keys(result))<>2 then raise exception 'inválida';end if;
   needs:=array(select jsonb_array_elements_text(result->'habilidades_necessarias'));
   if cardinality(needs) not between 1 and 3 or not public.mvp_habilidades_valid(needs) or jsonb_array_length(result->'recomendadas')>3 then raise exception 'inválida';end if;
   for item in select * from jsonb_array_elements(result->'recomendadas') loop
    code:=item->>'codigo';skills:=array(select jsonb_array_elements_text(item->'habilidades_que_ajudam'));
    if jsonb_typeof(item->'codigo') is distinct from 'string' or jsonb_typeof(item->'habilidades_que_ajudam') is distinct from 'array' or (select count(*) from jsonb_object_keys(item))<>2 or code=any(codes) or cardinality(skills) not between 1 and 3 or not public.mvp_habilidades_valid(skills) or not skills <@ needs then raise exception 'inválida';end if;
    select p.candidate_id into target from public.conversation_recommendation_pool p join public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') e on e.candidate=p.candidate_id
     where p.request_id=r.id and p.codigo=code and e.ai_consent and skills <@ e.habilidades and skills <@ p.habilidades;
    if target is null then raise exception 'inválida';end if;
    codes:=array_append(codes,code);ordered_ids:=array_append(ordered_ids,target);
   end loop;
  exception when others then error_code:='saida_invalida';end;
 end if;
 if error_code is null then
  update public.conversation_recommendation_pool set posicao=null where request_id=r.id;
  for item in select * from jsonb_array_elements(result->'recomendadas') loop
   pos:=pos+1;
   update public.conversation_recommendation_pool set posicao=pos,habilidades_que_ajudam=array(select jsonb_array_elements_text(item->'habilidades_que_ajudam')) where request_id=r.id and codigo=item->>'codigo';
  end loop;
  chosen:=ordered_ids[1];
  update public.conversation_requests set mode='ia',candidate_id=chosen,state=case when chosen is null then 'sem_candidata' else 'pronta' end,habilidades_necessarias=needs,
   habilidades_que_ajudam=coalesce((select p.habilidades_que_ajudam from public.conversation_recommendation_pool p where p.request_id=r.id and candidate_id=chosen),'{}') where id=r.id;
 end if;
 update public.conversation_jobs set state=case when mvp_finish_job.error_code is null then 'concluida' else 'falha' end,
  error_code=left(mvp_finish_job.error_code,60),model=left(mvp_finish_job.model,80),input_tokens=greatest(mvp_finish_job.input_tokens,0),output_tokens=greatest(mvp_finish_job.output_tokens,0),finished_at=now() where id=job;
end;$$;
create or replace function public.mvp_next_suggestion(request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;chosen uuid;skills text[];ai boolean:=false;excluded uuid[];
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.eu_aprovada() or exists(select 1 from public.conversation_invites where request_id=r.id) then raise exception 'busca indisponível';end if;
 if r.candidate_id is not null then insert into public.conversation_suggestions(request_id,candidate_id) values(r.id,r.candidate_id) on conflict do nothing;end if;
 excluded:=array(select candidate_id from public.conversation_suggestions where request_id=r.id);
 if r.mode='ia' then
  select p.candidate_id,p.habilidades_que_ajudam into chosen,skills from public.conversation_recommendation_pool p join public.mvp_eligible_candidates(r.owner_id,r.goal,excluded) e on e.candidate=p.candidate_id
   where p.request_id=r.id and p.posicao is not null and e.ai_consent and p.habilidades_que_ajudam <@ e.habilidades order by p.posicao limit 1;
  ai:=chosen is not null;
 end if;
 if chosen is null then chosen:=public.mvp_pick_candidate(r.owner_id,r.goal,excluded);skills:=public.mvp_candidate_skills(chosen,r.goal);end if;
 update public.conversation_jobs set state='falha',error_code='revisao_iniciada',finished_at=now() where request_id=r.id and state in ('pendente','executando');
 update public.conversation_requests set candidate_id=chosen,state=case when chosen is null then 'sem_candidata' else 'pronta' end,mode=case when ai then 'ia' else 'regra' end,
  habilidades_que_ajudam=coalesce(skills,'{}'),habilidades_necessarias=case when ai then habilidades_necessarias else public.mvp_goal_skills(r.goal) end,next_count=next_count+1,fallback_locked=true where id=r.id;
 return chosen;
end;$$;
create function public.mvp_use_fallback(request uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found then raise exception 'pedido indisponível';end if;
 if exists(select 1 from public.conversation_jobs where request_id=request and state in ('pendente','executando') and created_at<=now()-interval '15 seconds') then
 update public.conversation_requests set fallback_locked=true where id=request;
 update public.conversation_jobs set state='falha',error_code='tempo_esgotado',finished_at=now() where request_id=request and state in ('pendente','executando');end if;
end;$$;
create or replace function public.mvp_invite(request uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;result uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.eu_aprovada() or not exists(select 1 from public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') e where candidate=r.candidate_id) then raise exception 'convite indisponível';end if;
 update public.conversation_requests set fallback_locked=true where id=r.id;
 insert into public.conversation_invites(request_id,sender_id,recipient_id,message,goal) values(r.id,r.owner_id,r.candidate_id,message,r.goal) returning id into result;return result;
end;$$;
create function public.mvp_invite_context(invite uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i public.conversation_invites;
begin
 select * into i from public.conversation_invites where id=invite and auth.uid() in(sender_id,recipient_id) and not public.mvp_blocked(sender_id,recipient_id);
 if not found then raise exception 'convite indisponível';end if;
 return (select jsonb_build_object('description',description,'habilidades',habilidades_que_ajudam) from public.conversation_requests where id=i.request_id);
end;$$;
create function public.mvp_skill_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.mvp_permissao('ver_ia_automacoes') and not public.mvp_permissao('ver_visao_geral') then raise exception 'sem permissão';end if;
 return jsonb_build_object(
 'first_choice_rate',(select count(*) filter(where r.next_count=0)::numeric/nullif(count(*),0) from public.conversation_invites i join public.conversation_requests r on r.id=i.request_id where r.recommendation_version='habilidades-v1'),
 'ia',(select count(*) from public.conversation_requests where recommendation_version='habilidades-v1' and mode='ia' and not exists(select 1 from public.conversation_jobs j where j.request_id=conversation_requests.id and j.state in ('pendente','executando'))),
 'regra',(select count(*) from public.conversation_requests where recommendation_version='habilidades-v1' and mode='regra' and not exists(select 1 from public.conversation_jobs j where j.request_id=conversation_requests.id and j.state in ('pendente','executando'))),
 'sem_compativel',(select count(*) from public.conversation_requests where recommendation_version='habilidades-v1' and state='sem_candidata'),
 'habilidades',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'nome',h.nome,
 'pedidas',(select count(*) from public.conversation_requests r where h.id=any(r.habilidades_necessarias)),
 'oferecidas',(select count(*) from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id where h.id=any(p.habilidades) and p.available and pr.status='aprovado')) order by h.grupo,h.nome),'[]') from public.habilidades_referencia h));
end;$$;
revoke all on function public.mvp_skill_consent(),public.mvp_eligible_candidates(uuid,text,uuid[]),public.mvp_candidate_skills(uuid,text),public.mvp_use_fallback(uuid),public.mvp_invite_context(uuid),public.mvp_skill_metrics() from public,anon,authenticated;
grant execute on function public.mvp_skill_consent(),public.mvp_eligible_candidates(uuid,text,uuid[]),public.mvp_candidate_skills(uuid,text) to service_role;
grant execute on function public.mvp_use_fallback(uuid),public.mvp_invite_context(uuid),public.mvp_skill_metrics() to authenticated,service_role;
create or replace function public.mvp_pode_buscar(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.professional_profiles p where p.profile_id=uid and p.available and p.situacao is not null and p.area_principal is not null and cardinality(p.interesses)>0 and cardinality(p.channels)>0);
$$;

create or replace function public.mvp_cards() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',case when public.mvp_text_safe(p.apelido) then p.apelido else 'participante' end,
  'foto_path',p.foto_path,'occupation',pp.occupation,'situacao',pp.situacao,'area_principal',pp.area_principal,'interesses',pp.interesses,'areas',pp.areas,'moment',pp.moment,
  'conversas',(select count(distinct i.id) from public.conversation_invites i where p.id in(i.sender_id,i.recipient_id) and exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened)),
  'marcas',coalesce((select jsonb_agg(m) from (select m from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id cross join unnest(f.marcas) m
    where p.id in(i.sender_id,i.recipient_id) and f.author_id<>p.id group by m order by count(*) desc,m limit 3) t),'[]'::jsonb))), '[]')
 from public.profiles p join public.professional_profiles pp on pp.profile_id=p.id
 where auth.uid() is not null and not public.mvp_blocked(auth.uid(),p.id) and (
 exists(select 1 from public.conversation_requests r where r.owner_id=auth.uid() and r.candidate_id=p.id)
 or exists(select 1 from public.conversation_invites i where auth.uid() in(i.sender_id,i.recipient_id) and p.id in(i.sender_id,i.recipient_id)));
$$;

