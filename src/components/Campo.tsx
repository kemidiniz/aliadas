import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// Uma caixa e um rótulo para todos os campos. Controles de linha têm a mesma
// altura (h-12); ajuda, erro e contador ficam ABAIXO do campo, para campos
// lado a lado começarem sempre na mesma altura.
export const caixa =
  "w-full rounded-xl border-2 border-campo bg-fundo px-4 text-texto placeholder:text-suave/80 transition-colors focus:border-destaque focus:outline-none aria-[invalid=true]:border-erro";
export const rotuloCampo = "block text-sm font-semibold text-texto";

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
      <label htmlFor={id} className={rotuloCampo}>
        {rotulo}
      </label>
      {children}
      {(ajuda || erro || contador) && (
        <div className="flex justify-between gap-4 text-sm">
          <div className="min-w-0">
            {erro ? (
              <p id={`${id}-erro`} className="text-erro" role="alert">
                {erro}
              </p>
            ) : (
              ajuda && (
                <p id={`${id}-ajuda`} className="text-suave">
                  {ajuda}
                </p>
              )
            )}
          </div>
          {contador}
        </div>
      )}
    </div>
  );
}

type Base = { rotulo: ReactNode; ajuda?: ReactNode; erro?: string };
const descricao = (id: string, ajuda?: ReactNode, erro?: string) =>
  erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined;

export function CampoTexto({
  rotulo,
  ajuda,
  erro,
  className,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Envelope id={id} rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <input
        id={id}
        className={className ?? `${caixa} h-12`}
        aria-invalid={Boolean(erro) || undefined}
        aria-describedby={descricao(id, ajuda, erro)}
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
          <span className="shrink-0 text-suave" aria-hidden>
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
        className={`${caixa} resize-y py-3`}
        aria-invalid={Boolean(erro) || undefined}
        aria-describedby={descricao(id, ajuda, erro)}
        {...props}
      />
    </Envelope>
  );
}

export function CampoSelect({
  rotulo,
  ajuda,
  erro,
  opcoes,
  ...props
}: Base &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opcoes: { valor: string; rotulo: string; disabled?: boolean; hidden?: boolean }[];
  }) {
  const id = useId();
  return (
    <Envelope id={id} rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <div className="relative">
        <select
          id={id}
          className={`${caixa} h-12 appearance-none pr-11`}
          aria-invalid={Boolean(erro) || undefined}
          aria-describedby={descricao(id, ajuda, erro)}
          {...props}
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor} disabled={o.disabled} hidden={o.hidden}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-suave"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
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
    <fieldset className="space-y-2" aria-describedby={`${id}-info`}>
      <legend className={`${rotuloCampo} mb-2`}>{rotulo}</legend>
      <div className="space-y-2">
        {opcoes.map((o) => {
          const marcado = valor === o.valor;
          return (
            <label
              key={o.valor}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
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
      </div>
      <p
        id={`${id}-info`}
        className={`text-sm ${erro ? "text-erro" : "text-suave"}`}
        aria-live="polite"
      >
        {erro ?? ajuda}
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
      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${marcado ? "border-destaque bg-superficie" : "border-campo"}`}
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
        {obrigatoria && <span className="sr-only"> (obrigatória)</span>}
      </label>
    </div>
  );
}

// Chips: seleção múltipla em pílulas (teclado: Tab + Espaço)
export function MultiEscolha<T extends string>({
  rotulo,
  ajuda,
  erro,
  opcoes,
  valores,
  aoMudar,
  max,
}: Base & {
  opcoes: { valor: T; rotulo: string }[];
  valores: T[];
  aoMudar: (v: T[]) => void;
  max?: number;
}) {
  const id = useId();
  const alternar = (v: T) => {
    if (valores.includes(v)) return aoMudar(valores.filter((x) => x !== v));
    if (max && valores.length >= max) return;
    aoMudar([...valores, v]);
  };
  return (
    <fieldset className="space-y-2" aria-describedby={`${id}-info`}>
      <legend className={`${rotuloCampo} mb-2`}>{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const marcado = valores.includes(o.valor);
          return (
            <label
              key={o.valor}
              className={`chip ${marcado ? "chip-marcado" : ""}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={marcado}
                onChange={() => alternar(o.valor)}
              />
              <span aria-hidden className="chip-marca">
                {marcado ? "✓" : "+"}
              </span>
              {o.rotulo}
            </label>
          );
        })}
      </div>
      {(erro || ajuda) && (
        <p
          id={`${id}-info`}
          className={`text-sm ${erro ? "text-erro" : "text-suave"}`}
          aria-live="polite"
        >
          {erro ?? ajuda}
        </p>
      )}
    </fieldset>
  );
}

// Escolha única em pílulas (ex.: "Sim / Não", resultado da conversa)
export function EscolhaChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  nome,
}: {
  rotulo: ReactNode;
  opcoes: { valor: T; rotulo: string }[];
  valor: T | "";
  aoMudar: (v: T) => void;
  nome: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={`${rotuloCampo} mb-2`}>{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={`chip ${valor === o.valor ? "chip-marcado" : ""}`}
          >
            <input
              type="radio"
              name={nome}
              className="sr-only"
              checked={valor === o.valor}
              onChange={() => aoMudar(o.valor)}
            />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Nota de 1 a 5 em botões
export function Nota1a5({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: ReactNode;
  valor: number | null;
  aoMudar: (n: number) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={`${rotuloCampo} mb-2`}>{rotulo}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={valor === n}
            onClick={() => aoMudar(n)}
            className={`h-12 w-12 rounded-xl border-2 font-semibold transition-colors ${
              valor === n
                ? "border-destaque bg-destaque text-sobre-destaque"
                : "border-campo hover:border-destaque"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="flex justify-between text-xs text-suave" aria-hidden>
        <span>Pouco</span>
        <span>Muito</span>
      </p>
    </fieldset>
  );
}
