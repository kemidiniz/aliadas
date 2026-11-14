import { Link } from 'react-router-dom'
import { Pagina, Titulo } from '../components/Pagina'

const p = 'mt-4 text-lg leading-relaxed'
const h2 = 'mt-10 font-titulo text-2xl font-bold text-destaque'

export function TermoDeConduta() {
  return (
    <Pagina titulo="termo de conduta">
      <Titulo>termo de conduta</Titulo>
      <p className={p}>a aliadas é um espaço para mulheres cis e trans e pessoas não binárias que estão começando em tecnologia. para ficar bom pra todo mundo, combinamos:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-lg">
        <li>respeito sempre. nada de assédio, preconceito, transfobia, racismo, capacitismo ou qualquer discriminação.</li>
        <li>conte sua trajetória com verdade. não invente cargos, empresas ou conquistas.</li>
        <li>não use a aliadas para vender cursos, serviços ou pedir dinheiro.</li>
        <li>o contato de alguém é dela. não compartilhe sem permissão.</li>
        <li>respeite o "agora não". ninguém é obrigada a aceitar uma conexão.</li>
        <li>encontro presencial? lugar público e avise alguém.</li>
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
      <p className={p}>sua trajetória (apelido, de onde vem, onde está, área, objetivo, conquista), foto opcional, e-mail e linkedin, e quais consentimentos você deu.</p>
      <h2 className={h2}>quem vê o quê</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-lg">
        <li>sua trajetória e foto: só pessoas aprovadas para quem você foi recomendada ou com quem tem um pedido de conexão, e a curadoria.</li>
        <li>seu e-mail e linkedin: a curadoria (para conferir o perfil) e, depois do aceite das duas, a pessoa da conexão. mais ninguém.</li>
        <li>fotos ficam num armazenamento privado e só abrem por links temporários.</li>
      </ul>
      <h2 className={h2}>a inteligência artificial</h2>
      <p className={p}>para sugerir aliadas, mandamos para a IA (Claude, da Anthropic) só a trajetória com um código, como P017. nunca nome, apelido, e-mail, linkedin ou foto. se você escrever um e-mail, link ou telefone no texto, a gente apaga antes de enviar.</p>
      <h2 className={h2}>seus direitos</h2>
      <p className={p}>você pode editar, pausar ou excluir tudo quando quiser em <Link to="/minha-conta" className="text-destaque underline underline-offset-4">minha conta</Link>. excluir apaga perfil, foto, contatos, consentimentos e conexões. o registro de uso da IA fica só como contagem, sem o conteúdo.</p>
    </Pagina>
  )
}
