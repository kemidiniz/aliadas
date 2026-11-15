import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

const caixa =
  "w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-texto placeholder:text-suave/80 focus:border-destaque focus:outline-none";

function Envelope({
  id,
  rotulo,
  ajuda,
  erro,
  children,
  contador,
}: {
  id: string;
  rotulo: ReactNode;
  ajuda?: ReactNode;
  erro?: string;
  children: ReactNode;
  contador?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-titulo text-lg font-semibold text-texto"
      >
        {rotulo}
      </label>
      {ajuda && (
        <p id={`${id}-ajuda`} className="text-sm text-suave">
          {ajuda}
        </p>
      )}
      {children}
      <div className="flex justify-between gap-4 text-sm">
        <span id={`${id}-erro`} className="text-erro" aria-live="polite">
          {erro}
        </span>
        {contador}
      </div>
    </div>
  );
}

type Base = { rotulo: ReactNode; ajuda?: ReactNode; erro?: string };

export function CampoTexto({
  rotulo,
  ajuda,
  erro,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Envelope id={id} rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <input
        id={id}
        className={caixa}
        aria-invalid={Boolean(erro) || undefined}
        aria-describedby={`${ajuda ? `${id}-ajuda ` : ""}${id}-erro`}
        {...props}
      />
    </Envelope>
  );
}

export function CampoArea({
  rotulo,
  ajuda,
  erro,
  maxLength,
  value,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const n = typeof value === "string" ? value.length : 0;
  return (
    <Envelope
      id={id}
      rotulo={rotulo}
      ajuda={ajuda}
      erro={erro}
      contador={
        maxLength ? (
          <span className="text-suave" aria-hidden>
            {n}/{maxLength}
          </span>
        ) : undefined
      }
    >
      <textarea
        id={id}
        rows={4}
        maxLength={maxLength}
        value={value}
        className={`${caixa} resize-y`}
        aria-invalid={Boolean(erro) || undefined}
        aria-describedby={`${ajuda ? `${id}-ajuda ` : ""}${id}-erro`}
        {...props}
      />
    </Envelope>
  );
}

export function Escolha<T extends string>({
  rotulo,
  ajuda,
  erro,
  opcoes,
  valor,
  aoMudar,
  nome,
}: Base & {
  opcoes: { valor: T; rotulo: string; detalhe?: string }[];
  valor: T | "" | undefined;
  aoMudar: (v: T) => void;
  nome: string;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-3" aria-describedby={`${id}-erro`}>
      <legend className="mb-2 font-titulo text-lg font-semibold text-texto">
        {rotulo}
      </legend>
      {ajuda && <p className="text-sm text-suave">{ajuda}</p>}
      {opcoes.map((o) => {
        const marcado = valor === o.valor;
        return (
          <label
            key={o.valor}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
              marcado
                ? "border-destaque bg-superficie"
                : "border-campo hover:border-destaque"
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={marcado}
              onChange={() => aoMudar(o.valor)}
              className="mt-1 h-4 w-4 accent-[var(--destaque)]"
            />
            <span>
              <span className="font-semibold">{o.rotulo}</span>
              {o.detalhe && (
                <span className="block text-sm text-suave">{o.detalhe}</span>
              )}
            </span>
          </label>
        );
      })}
      <p id={`${id}-erro`} className="text-sm text-erro" aria-live="polite">
        {erro}
      </p>
    </fieldset>
  );
}

export function Caixinha({
  marcado,
  aoMudar,
  children,
  obrigatoria,
}: {
  marcado: boolean;
  aoMudar: (v: boolean) => void;
  children: ReactNode;
  obrigatoria?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 ${marcado ? "border-destaque bg-superficie" : "border-campo"}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--destaque)]"
        aria-required={obrigatoria || undefined}
      />
      <label htmlFor={id} className="cursor-pointer">
        {children}
        {obrigatoria ? (
          <span className="sr-only"> (obrigatória)</span>
        ) : (
          <span className="ml-1 text-sm text-suave">(opcional)</span>
        )}
      </label>
    </div>
  );
}

// várias opções ao mesmo tempo (caixinhas com cara de botão)
export function MultiEscolha<T extends string>({
  rotulo,
  ajuda,
  erro,
  opcoes,
  valores,
  aoMudar,
}: Base & {
  opcoes: { valor: T; rotulo: string }[];
  valores: T[];
  aoMudar: (v: T[]) => void;
}) {
  const id = useId();
  const alternar = (v: T) =>
    aoMudar(
      valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v],
    );
  return (
    <fieldset className="space-y-3" aria-describedby={`${id}-erro`}>
      <legend className="mb-2 font-titulo text-lg font-semibold text-texto">
        {rotulo}
      </legend>
      {ajuda && <p className="text-sm text-suave">{ajuda}</p>}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const marcado = valores.includes(o.valor);
          return (
            <label
              key={o.valor}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 transition-colors focus-within:outline focus-within:outline-3 focus-within:outline-offset-3 ${
                marcado
                  ? "border-destaque bg-destaque text-sobre-destaque"
                  : "border-campo text-texto hover:border-destaque"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={marcado}
                onChange={() => alternar(o.valor)}
              />
              <span aria-hidden className="font-bold">
                {marcado ? "✓" : "+"}
              </span>
              {o.rotulo}
            </label>
          );
        })}
      </div>
      <p id={`${id}-erro`} className="text-sm text-erro" aria-live="polite">
        {erro}
      </p>
    </fieldset>
  );
}
