import { useFotoUrl } from '../lib/fotos'

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? '?').slice(0, 2)
  return letras.toLowerCase()
}

// Sem foto: iniciais num círculo vinho com borda coral.
export function Avatar({ apelido, fotoPath, previa, tamanho = 64 }: { apelido: string; fotoPath?: string | null; previa?: string | null; tamanho?: number }) {
  const url = useFotoUrl(previa ? null : fotoPath)
  const src = previa ?? url
  const estilo = { width: tamanho, height: tamanho }
  if (src) {
    return <img src={src} alt={`foto de ${apelido}`} style={estilo} className="shrink-0 rounded-full border-2 border-coral object-cover" />
  }
  return (
    <span
      role="img"
      aria-label={`iniciais de ${apelido}`}
      style={{ ...estilo, fontSize: tamanho * 0.36 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-coral bg-vinho font-titulo font-semibold text-off-white"
    >
      {iniciais(apelido)}
    </span>
  )
}
