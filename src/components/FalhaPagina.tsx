import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pagina, Titulo } from "./Pagina";
import { Botao } from "./Botao";

export function TelaFalhaPagina() {
  return <Pagina titulo="Não foi possível abrir a página">
    <div role="alert">
      <Titulo>Não conseguimos abrir esta página</Titulo>
      <p className="text-suave">Houve uma falha no carregamento. Confira sua conexão e atualize a página para tentar novamente.</p>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <Botao onClick={() => window.location.reload()}>Atualizar página</Botao>
        <Link to="/" className="text-link">Voltar à página inicial</Link>
      </div>
    </div>
  </Pagina>;
}

// Mantém a navegação disponível e não exibe mensagens técnicas nem dados do erro.
export class FalhaPagina extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() { return this.state.falhou ? <TelaFalhaPagina /> : this.props.children; }
}
