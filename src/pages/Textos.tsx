import { Link } from "react-router-dom";
import { Pagina, Titulo, Leitura } from "../components/Pagina";
const p = "mt-4";
const h2 = "mt-8 scroll-mt-24 text-xl font-bold text-destaque";
export function TermosEPrivacidade() {
 return <Pagina titulo="Termos e privacidade"><Leitura>
  <Titulo>Termos e privacidade</Titulo>
  <nav aria-label="Índice desta página" className="mb-8 flex flex-wrap gap-x-5 gap-y-3 text-sm">
   <a href="#sobre" className="text-link">Sobre a aliadas</a><a href="#termos" className="text-link">Termos de uso</a><a href="#privacidade" className="text-link">Privacidade</a>
  </nav>
  <section id="sobre" className="scroll-mt-24"><h2 className="text-2xl text-destaque">Sobre a aliadas</h2>
   <p className={p}>A aliadas nasceu na formação em IA Aplicada da {"{reprograma}"}, criada por Kemily Diniz. A {"{reprograma}"} não administra nem patrocina a plataforma.</p>
  </section>
  <section id="termos" className="mt-10 scroll-mt-24"><h2 className="text-2xl text-destaque">Termos de uso</h2>
      <p className={p}>A aliadas é para mulheres cis e trans e pessoas não binárias de todas as áreas. Para ficar bom para todo mundo, combinamos:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>Respeito sempre. Nada de assédio, preconceito, transfobia, racismo, capacitismo ou qualquer discriminação.</li>
        <li>Conte sua trajetória com verdade. Não invente cargos, empresas ou conquistas.</li>
        <li>Não use a aliadas para vender cursos, serviços ou pedir dinheiro.</li>
        <li>O contato de alguém é dela. Não compartilhe sem permissão.</li>
        <li>Respeite o "agora não". Ninguém é obrigada a aceitar um convite.</li>
        <li>Não compartilhe dados sensíveis nem informações confidenciais de empresas. A plataforma facilita conversas profissionais; não oferece terapia nem mentoria formal.</li>
      </ul>
      <p className={p}>Quem descumprir pode ter o perfil pausado ou removido pelas embaixadoras. Viu algo errado? Use "Denunciar" no menu da conversa.</p>
  </section>
  <section id="privacidade" className="mt-10 scroll-mt-24"><h2 className="text-2xl text-destaque">Privacidade</h2>
      <p className={p}>Guardamos só o necessário, e você manda nos seus dados (LGPD).</p>
      <h3 className={h2}>O que guardamos</h3>
      <p className={p}>Como quer ser chamada, nome completo (opcional), sua situação hoje, área de atuação ou estudo, áreas de interesse, habilidades que pode compartilhar e objetivos de conversa, foto opcional, contatos que você escolheu e consentimentos. O e-mail de login fica separado dos contatos que você decide compartilhar.</p>
      <h3 className={h2}>Quem vê o quê</h3>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>Como quer ser chamada, situação e áreas: a pessoa para quem você foi indicada ou com quem tem um convite, e as embaixadoras com acesso ao painel.</li>
        <li>Contatos e nome completo: só você e, depois do aceite mútuo, a outra participante. O bloqueio interrompe o acesso; contatos já vistos não podem ser recuperados.</li>
        <li>Fotos ficam num armazenamento privado e só abrem por links temporários.</li>
      </ul>
      <h3 id="ia" className={h2}>A inteligência artificial</h3>
      <p className={p}>A IA recomenda até três aliadas pelas habilidades que podem ajudar no seu objetivo. A plataforma filtra antes perfis aprovados, disponíveis, com canal em comum e sem bloqueios. Você revisa uma indicação por vez e decide enviar o convite.</p>
      <p className={p}>Só se você autorizar e, mesmo assim, ela recebe apenas categorias de situação, área, interesses, objetivo e habilidades. Cada candidata recebe um código temporário. Nunca enviamos nomes, contatos, foto ou ids reais. Do texto de apoio extraímos apenas expressões do catálogo profissional, depois de retirar e-mails, telefones, URLs e documentos; o texto original não é enviado ao Google nem guardado nos logs.</p>
      <p className={p}>No plano gratuito do Gemini, o Google pode usar os dados enviados para melhorar seus produtos, conforme a <a className="text-link" href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">página oficial de preços</a> e os <a className="text-link" href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">termos do Gemini</a>. Você pode retirar a autorização no perfil. Sem consentimento, cota ou disponibilidade da IA, a indicação usa o mapa fixo de habilidades, sem IA generativa. A nova finalidade exige confirmação do consentimento ao salvar o perfil.</p>
      <p className={p}>E-mails, telefones e links colados no apoio ficam ocultos para a destinatária. Só os canais autorizados no perfil são liberados após aceite mútuo, incluindo Google Meet.</p>
      <p className={p}>Nada é enviado automaticamente à outra participante: você revisa e decide se manda o convite.</p>
      <h3 className={h2}>Feedback</h3>
      <p className={p}>O e-mail que você informa no formulário de feedback é opcional e usado só para responder a sua mensagem. Ele passa pelo Make, que avisa as embaixadoras, e pelo Gmail, de onde sai a resposta.</p>
      <h3 className={h2}>Seus direitos</h3>
      <p className={p}>Você pode editar, pausar ou excluir tudo quando quiser em <Link to="/meu-perfil#conta" className="text-destaque underline underline-offset-4">Meu perfil</Link>. Excluir apaga perfil, foto, contatos, consentimentos e conversas. O registro de uso da IA fica só como contagem, sem o conteúdo.</p>
  </section>
 </Leitura></Pagina>;
}
