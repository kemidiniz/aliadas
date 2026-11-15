# Finalização do Aliadas — relatório objetivo

Data da revisão: 15/11/2026. Entrega informada: **18/11/2026, às 12h (Brasília)**.

**Situação na entrega local:** alterações preparadas sem publicação ou mudanças de papéis. A titular posteriormente autorizou expressamente o deploy completo, incluindo a migration 015 e a identificação da conta principal (registro abaixo). A versão publicada anterior continua no ar. Consultas de diagnóstico em produção foram somente de leitura.

## 1. Melhorias visuais

Landing institucional completa, com o hero e os textos solicitados, desenho vetorial próprio sobre conexões, duas estatísticas exatamente delimitadas (27% Brasil/2020 e 97% das economias/2024), links clicáveis e notas de contexto. As fontes foram fornecidas pela titular; a consulta independente aos sites foi bloqueada pela rede, sem inventar verificação.

Inter auto-hospedada substituiu Quicksand/Nunito na interface ativa. Paleta vinho/coral/off-white preservada, com temas claro e escuro. Botões, campos, títulos, largura, margens, estados e mensagens padronizados; retirada a transformação global para minúsculas. Conteúdo aparece legível desde o primeiro frame, sem transição de opacidade de página. Visitantes veem Como funciona, Quem somos e Entrar; autenticadas mantêm Início, Minhas conversas e Meu perfil.

## 2. Jornada simplificada ou corrigida

Perfil permanece em uma página, organizado em informações profissionais, experiências/temas, preferências, contatos, disponibilidade e privacidade. Campos adicionais ficam em seções expansíveis. Recuperação de senha foi preservada e corrigida para manter a confirmação visível.

Indicação mostra ocupação e áreas relevantes, justificativa, duas perguntas quando realmente geradas e mensagem editável. Estados distinguem busca, processamento, indicação pronta, fallback e ausência de candidata. Polling é limitado a oito consultas por ciclo e pausa se a página estiver oculta. Resultado assíncrono não sobrescreve uma mensagem que a usuária já editou.

Conversas distinguem envio/recebimento, espera por aceite, combinação de horário, horário confirmado, realização confirmada por feedback salvo e recusa. Selecionar “sim” sem salvar não marca realização. Não foram restaurados fórum, feed, busca complexa, catálogo, pitch ou ranking.

## 3. Situação real do Gemini

Secrets presentes, sem exposição de valores: GEMINI_API_KEY, GEMINI_MODEL e GEMINI_FREE_TIER_CONFIRMED. Modelo identificado por metadados: gemini-2.5-flash-lite. Flag gratuita verdadeira; a titular confirmou projeto sem faturamento habilitado. Acesso gratuito efetivo, validade da chave e resposta do modelo ainda não foram comprovados por uma geração real.

Diagnóstico atual: **0 perfis profissionais, 0 solicitações, 0 jobs, 0 tokens registrados nessa jornada**. pg_net, função ACTIVE (JWT automático desligado, autenticação interna por segredo) e os dois secrets internos do Vault existem. A cadeia não foi executada por falta de uma dupla profissional elegível e de solicitação; não há evidência de falha ou sucesso real no Gemini. Nenhuma chave adicional foi solicitada.

Código preparado melhora classificação de limite/acesso/modelo/truncamento, validação de JSON e registro de tokens de raciocínio quando informados. Esse código não foi implantado. Os testes simulados não substituem a resposta real do provedor.

## 4. Embaixadoras

Migration `20261116000015_administracao_e_estado.sql` e script separado `supabase/admin/bootstrap-principal.sql` preparados, **não aplicados**. UUID da principal conferido pela titular e ligado à conta Auth/papel legado; nomes, e-mails e metadados editáveis não concedem administração.

Preserva roles/curadora e o acesso existente durante a transição. Após bootstrap, só a principal delega/revoga. Embaixadoras recebem Avaliar perfis e/ou Tratar denúncias, sem gerir permissões, acessar indicadores sensíveis ou receber contatos privados por esse papel. Nova seção Embaixadoras permite consultar participantes, conferir ID, revisar ação, conceder, consultar e revogar; cada ação fica auditada. Revogação vale imediatamente no banco e a interface atualiza o acesso ao retomar foco.

## 5. Gaps e segurança

Corrigidos localmente: menus públicos inadequados, ausência de landing institucional, formulário visualmente longo, falta de estado assíncrono, sobrescrita de rascunho durante atualização, risco de tela protegida carregar antes do estado Auth mais recente e falta de separação de atribuições administrativas.

Security Advisor: 25 avisos de função SECURITY DEFINER executável por authenticated e 1 aviso de proteção contra senhas vazadas. As funções foram revisadas individualmente; não houve revogação em massa. Ledger e guardas: [AUDITORIA-SEGURANCA.md](AUDITORIA-SEGURANCA.md). Proteção de senhas vazadas permanece desativada e exige verificação de disponibilidade/configuração no plano atual, sem contratar upgrade.

## 6. Reprograma: comprovado e pendente

Implementação local e segurança têm evidências automatizadas. **Continuam pendentes:** entrevistas/linha de base com usuárias, três execuções reais da automação com Gemini, vinte casos reais higienizados/autorizados, três avaliadoras além da desenvolvedora, duas rodadas, benefícios mensurados e gravação/ensaio.

A tabela completa `Requisito | Implementado | Comprovado | Pendente | Próxima ação`, diagrama, critérios prévios e roteiros de pitch/demo estão em [VALIDACAO.md](VALIDACAO.md). Não há dados, resultados ou fontes inventados. Custos medidos e hipóteses 10× estão separados em [CUSTOS.md](CUSTOS.md).

## 7. Configurações e ações necessárias

1. Revisar e autorizar explicitamente a migration administrativa 015 e o bootstrap da principal. Não reaplicar migrations anteriores.
2. Só após isso, autorizar atualização da função e frontend. A nova interface administrativa e o estado do job dependem da migration.
3. Duas participantes reais devem completar seus próprios perfis, disponibilidades e consentimentos. Aprovar quando necessário; escolher intenções/objetivos/canais compatíveis.
4. Registrar solicitações reais, acompanhar job/pg_net, saída validada e consumo, sem compartilhar dados pessoais com o provedor. Coletar três execuções distintas e revisão humana.
5. Verificar termos/cotas atuais do Gemini e a proteção contra senhas vazadas. Não habilitar billing nem contratar planos.
6. Executar as duas rodadas humanas e preencher a planilha de casos vazia apenas com registros reais autorizados.

## 8. Testes e limites

- Build Vite/TypeScript aprovado; permanece aviso de tamanho de bundle, sem falha de build.
- 207 verificações SQL locais aprovadas, incluindo testes administrativos, contatos, consentimento, auditoria e revogação.
- 5 testes Node de minimização, injeção, JSON, consumo e códigos de erro aprovados.
- Typecheck Deno aprovado; worker real executado localmente com banco HTTP simulado e rede externa proibida, sem tokens ou geração externa.
- Fluxo no navegador com Auth/API simulados aprovado; cobre mensagem revisada, processamento, polling limitado, contatos, feedback e recuperação de senha.
- Testes administrativos de UI aprovados: participante sem acesso, atribuições separadas, concessão/revogação pela principal e remoção do acesso após revogação.
- Landing e telas internas testadas em **375, 390, 768 e 1440px**, claro e escuro, sem overflow ou erros JavaScript. Contrastes principais de texto, texto secundário e botões >=4,5:1; links e navegação por seções testados. Isso não é certificação completa de acessibilidade.

Não foi realizado teste real de geração, de entrega de e-mail ou de encontro profissional. O build, os mocks e os jobs sintéticos locais não são prova de uso real.

## Ativação posteriormente autorizada

A titular autorizou expressamente: “Autorizo o deploy completo, incluindo a migration 015 e minha conta como administradora principal.”

Migration 015 aplicada em produção em uma transação, registrada no histórico de migrations, seguida do bootstrap da conta já conferida. O papel legado foi preservado, as três tabelas administrativas têm RLS e o bootstrap foi auditado. Zero embaixadoras foram criadas e nenhuma outra conta foi promovida. Contagens existentes preservadas: 3 contas Auth, 2 perfis e 2 contatos.

A identidade principal e suas atribuições foram verificadas no banco em contexto autenticado; participantes não podem executar o bootstrap e acesso anônimo à delegação não é permitido. A função conversa-ia foi atualizada (versão 7) e segue exigindo segredo interno. Não houve geração fictícia ou habilitação de cobrança.

Esta revisão é a versão autorizada para publicação no endereço https://aliadas-indol.vercel.app. Os resultados de validação humana e de geração real continuam pendentes; a configuração de secrets não substitui uma execução real.
