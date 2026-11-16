import { BotaoLink } from '../components/Botao'
import { Pagina, Titulo } from '../components/Pagina'

export default function NaoEncontrada() {
  return (
    <Pagina titulo="Página não encontrada">
      <Titulo sub="Esse endereço não existe (ou mudou de lugar).">Página não encontrada</Titulo>
      <BotaoLink to="/">Voltar para o início</BotaoLink>
    </Pagina>
  )
}
