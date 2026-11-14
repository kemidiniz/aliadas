import { BotaoLink } from '../components/Botao'
import { Pagina, Titulo } from '../components/Pagina'

export default function NaoEncontrada() {
  return (
    <Pagina titulo="página não encontrada">
      <Titulo sub="esse endereço não existe (ou mudou de lugar).">página não encontrada</Titulo>
      <BotaoLink to="/">voltar para o início</BotaoLink>
    </Pagina>
  )
}
