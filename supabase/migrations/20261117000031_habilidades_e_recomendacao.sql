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
