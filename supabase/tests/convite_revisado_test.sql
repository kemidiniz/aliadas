\echo '--- Convite vinculado à indicação revisada'
reset role;
set role authenticated;select set_config('request.jwt.claim.sub', :'h4', false);
select tst.bloqueia(format('select public.mvp_invite_reviewed(%L,%L,%L)', :'skillr', :'h1','Olá, podemos conversar?'), 'candidata diferente da exibida não recebe convite');
select set_config('request.jwt.claim.sub', :'h1', false);
select tst.bloqueia(format('select public.mvp_invite_reviewed(%L,%L,%L)', :'skillr', :'h2','Ataque'), 'pedido de outra pessoa não pode ser convidado');
select set_config('request.jwt.claim.sub', :'h4', false);
select public.mvp_next_suggestion(:'skillr') as revisada \gset
select public.mvp_invite_reviewed(:'skillr',:'revisada','Oi, vamos conversar?') as convite_revisado \gset
select tst.ok((select recipient_id=:'revisada' from public.conversation_invites where id=:'convite_revisado'), 'convite vai exatamente para a pessoa revisada');
reset role;
