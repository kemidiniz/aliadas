import { Link } from 'react-router-dom'
import { Pagina, Titulo, Leitura } from '../components/Pagina'

const p = 'mt-4'
const h2 = 'mt-10 scroll-mt-24 text-2xl font-bold text-destaque'

export function TermoDeConduta() {
  return (
    <Pagina titulo="Termos de uso">
      <Leitura>
      <Titulo>Termos de uso</Titulo>
      <p className={p}>A aliadas é para mulheres cis e trans e pessoas não binárias de todas as áreas. Para ficar bom para todo mundo, combinamos:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>Respeito sempre. Nada de assédio, preconceito, transfobia, racismo, capacitismo ou qualquer discriminação.</li>
        <li>Conte sua trajetória com verdade. Não invente cargos, empresas ou conquistas.</li>
        <li>Não use a aliadas para vender cursos, serviços ou pedir dinheiro.</li>
        <li>O contato de alguém é dela. Não compartilhe sem permissão.</li>
        <li>Respeite o "agora não". Ninguém é obrigada a aceitar um convite.</li>
        <li>Não compartilhe dados sensíveis nem informações confidenciais de empresas. A plataforma facilita conversas profissionais; não oferece terapia nem mentoria formal.</li>
      </ul>
      <p className={p}>Quem descumprir pode ter o perfil pausado ou removido pela curadoria. Viu algo errado? Use "Denunciar" no menu da conversa.</p>
    </Leitura>
    </Pagina>
  )
}

export function Privacidade() {
  return (
    <Pagina titulo="Privacidade">
      <Leitura>
      <Titulo>Privacidade</Titulo>
      <p className={p}>Guardamos só o necessário, e você manda nos seus dados (LGPD).</p>
      <h2 className={h2}>O que guardamos</h2>
      <p className={p}>Como quer ser chamada, nome completo (opcional), sua situação hoje, área de atuação ou estudo, áreas de interesse, assuntos com que pode ajudar e sobre os quais quer conversar, foto opcional, contatos que você escolheu e consentimentos. O e-mail de login fica separado dos contatos que você decide compartilhar.</p>
      <h2 className={h2}>Quem vê o quê</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>Como quer ser chamada, situação e áreas: a pessoa para quem você foi indicada ou com quem tem um convite, e a curadoria.</li>
        <li>Contatos e nome completo: só você e, depois do aceite mútuo, a outra participante. O bloqueio interrompe o acesso; contatos já vistos não podem ser recuperados.</li>
        <li>Fotos ficam num armazenamento privado e só abrem por links temporários.</li>
      </ul>
      <h2 id="ia" className={h2}>A inteligência artificial</h2>
      <p className={p}>A indicação usa regras fixas: o objetivo da conversa precisa estar entre os assuntos com que a outra pessoa pode ajudar, e vocês precisam ter um canal em comum. Não há IA nessa escolha.</p>
      <p className={p}>Só quando as duas autorizam, o Gemini (Google) recebe o objetivo e categorias de situação, áreas e assuntos para sugerir uma justificativa, duas perguntas e um rascunho de mensagem. Nunca enviamos nomes, nome completo, contatos, links ou textos que você escreve, como o objetivo em "Outro".</p>
      <p className={p}>Usamos o plano gratuito do Gemini. Nos termos desse plano, o Google pode usar o conteúdo enviado para melhorar seus modelos. Por isso enviamos só categorias. Você pode retirar a autorização no seu perfil a qualquer momento; sem ela, a indicação continua, sem texto gerado.</p>
      <p className={p}>Nada é enviado automaticamente à outra participante: você revisa e decide se manda o convite.</p>
      <h2 className={h2}>Feedback</h2>
      <p className={p}>O e-mail que você informa no formulário de feedback é opcional e usado só para responder a sua mensagem. Ele passa pelo Make, que avisa a curadoria, e pelo Gmail, de onde sai a resposta.</p>
      <h2 className={h2}>Seus direitos</h2>
      <p className={p}>Você pode editar, pausar ou excluir tudo quando quiser em <Link to="/meu-perfil#conta" className="text-destaque underline underline-offset-4">Meu perfil</Link>. Excluir apaga perfil, foto, contatos, consentimentos e conversas. O registro de uso da IA fica só como contagem, sem o conteúdo.</p>
    </Leitura>
    </Pagina>
  )
}
