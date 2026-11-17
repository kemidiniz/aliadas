import { FotoRedonda } from './FotoRedonda'
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
  return <FotoRedonda src={src} alternativa={src ? `Foto de ${apelido}` : `Iniciais de ${apelido}`} iniciais={iniciais(apelido)} tamanho={tamanho} />
}
