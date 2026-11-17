import { useEffect } from "react";
import { Pagina, Titulo } from "../components/Pagina";
import { FONTE_LINKEDIN } from "../lib/fontes";

// Texto opcional da titular. Enquanto for null, o bloco não aparece.
const POR_QUE_CRIEI: string | null = null;

export default function QuemSomos() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const antes = meta?.getAttribute("content");
    meta?.setAttribute("content", "Por que a aliadas existe, para quem é, como funciona e quem faz.");
    return () => {
      if (antes) meta?.setAttribute("content", antes);
    };
  }, []);
  const h2 = "mt-10 text-destaque";
  const p = "mt-3 text-suave";
  return (
    <Pagina titulo="Quem somos" largura="texto">
      <Titulo>Quem somos</Titulo>
      <h2 className={h2.replace("mt-10 ", "")}>O problema</h2>
      <p className={p}>
        Conexões também fazem parte de uma carreira, mas o acesso a elas ainda é
        desigual. No Brasil, mulheres tinham 27% menos chance de ter uma rede
        profissional forte que os homens (
        <a className="text-link" href={FONTE_LINKEDIN} target="_blank" rel="noopener noreferrer">
          LinkedIn, 2020
        </a>
        ).
      </p>
      <h2 className={h2}>Para quem é</h2>
      <p className={p}>
        Para mulheres cis e trans e pessoas não binárias, de qualquer área, que
        querem conversar sobre um passo da carreira ou ajudar outra pessoa com o
        que já viveram. Dá para estar dos dois lados.
      </p>
      <h2 className={h2}>Como funciona</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-suave">
        <li>Você escolhe o objetivo da conversa.</li>
        <li>
          Regras simples encontram alguém que disse que pode ajudar com isso. A
          IA explica a indicação, sugere duas perguntas e um rascunho de convite.
        </li>
        <li>
          Você revisa e decide se envia. A outra pessoa decide se aceita. Só
          depois do aceite os contatos aparecem.
        </li>
      </ol>
      <h2 className={h2}>Quem faz</h2>
      <p className={p}>
        A aliadas nasceu na formação em IA Aplicada da {"{reprograma}"}, criada
        por [NOME]. A {"{reprograma}"} não administra nem patrocina a plataforma.
      </p>
      {POR_QUE_CRIEI && (
        <>
          <h2 className={h2}>Por que criei a aliadas</h2>
          <p className={p}>{POR_QUE_CRIEI}</p>
        </>
      )}
    </Pagina>
  );
}
