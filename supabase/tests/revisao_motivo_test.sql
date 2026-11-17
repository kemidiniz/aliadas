\echo '--- Revisão com motivo opcional'
reset role;
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select tst.bloqueia(format('select public.mvp_admin_review_with_reason(%L,%L,%L)', :'u2','reprovado','teste'), 'participante não reprova perfil nem grava motivo');
select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_admin_review_with_reason(:'u3','reprovado','Complete suas informações profissionais.');
reset role;
select tst.ok((select status='reprovado' and review_reason='Complete suas informações profissionais.' from public.profiles where id=:'u3'), 'responsável autorizada grava motivo opcional');
set role authenticated;select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_admin_review_with_reason(:'u3','aprovado','');
reset role;
select tst.ok((select review_reason is null from public.profiles where id=:'u3'), 'aprovação remove motivo anterior');
