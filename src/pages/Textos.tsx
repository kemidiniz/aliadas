import { Link } from 'react-router-dom'
import { Pagina, Titulo } from '../components/Pagina'

const p = 'mt-4 text-lg leading-relaxed'
const h2 = 'mt-10 font-titulo text-2xl font-bold text-destaque'

export function TermoDeConduta() {
  return (
    <Pagina titulo="termo de conduta">
      <Titulo>termo de conduta</Titulo>
      <p className={p}>a aliadas é um espaço para mulheres cis e trans e pessoas não binárias universitárias e profissionais de todas as áreas. para ficar bom pra todo mundo, combinamos:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-lg">
        <li>respeito sempre. nada de assédio, preconceito, transfobia, racismo, capacitismo ou qualquer discriminação.</li>
        <li>conte sua trajetória com verdade. não invente cargos, empresas ou conquistas.</li>
        <li>não use a aliadas para vender cursos, serviços ou pedir dinheiro.</li>
        <li>o contato de alguém é dela. não compartilhe sem permissão.</li>
        <li>respeite o "agora não". ninguém é obrigada a aceitar uma conexão.</li>
        <li>não compartilhe dados sensíveis nem informações confidenciais de empresas. a plataforma facilita trocas profissionais; não oferece terapia ou mentoria formal.</li>
      </ul>
      <p className={p}>quem descumprir pode ter o perfil pausado ou removido pela curadoria. viu algo errado? use "denunciar perfil".</p>
    </Pagina>
  )
}

export function Privacidade() {
  return (
    <Pagina titulo="privacidade">
      <Titulo>privacidade</Titulo>
      <p className={p}>a gente guarda só o necessário, e você manda nos seus dados (LGPD).</p>
      <h2 className={h2}>o que guardamos</h2>
      <p className={p}>seu perfil profissional, categorias de experiência e interesses, objetivos de conversa, disponibilidade, foto opcional e consentimentos. o e-mail de autenticação fica separado dos contatos que você decide compartilhar.</p>
      <h2 className={h2}>quem vê o quê</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-lg">
        <li>sua trajetória e foto: só pessoas aprovadas para quem você foi recomendada ou com quem tem um pedido de conexão, e a curadoria.</li>
        <li>contatos da nova jornada: somente você e, após o aceite mútuo, a outra participante, nos canais que você autorizou. o bloqueio interrompe o acesso. contatos já vistos não podem ser recuperados.</li>
        <li>fotos ficam num armazenamento privado e só abrem por links temporários.</li>
      </ul>
      <h2 className={h2}>a inteligência artificial</h2>
      <p className={p}>a compatibilidade básica usa regras de objetivo, áreas, disponibilidade e canais, sem IA externa. somente com consentimento das duas, o Gemini poderá receber categorias de áreas, temas e momento profissional para justificar a sugestão, propor duas perguntas e preparar um rascunho. não enviamos nomes, contatos, links, ocupação ou descrições livres. os termos gratuitos do provedor podem permitir uso dos dados para melhoria dos modelos. a integração depende de confirmação desses termos e do acesso gratuito. nada é enviado automaticamente à outra participante.</p>
      <h2 className={h2}>seus direitos</h2>
      <p className={p}>você pode editar, pausar ou excluir tudo quando quiser em <Link to="/minha-conta" className="text-destaque underline underline-offset-4">minha conta</Link>. excluir apaga perfil, foto, contatos, consentimentos e conexões. o registro de uso da IA fica só como contagem, sem o conteúdo.</p>
    </Pagina>
  )
}
