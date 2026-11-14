import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FOTO = 2 * 1024 * 1024 // 2 MB

export function validarFoto(f: File): string | null {
  if (!TIPOS_FOTO.includes(f.type)) return 'use uma foto JPG, PNG ou WebP'
  if (f.size > MAX_FOTO) return 'a foto precisa ter até 2 MB'
  return null
}

// Redesenha a imagem num canvas: reduz o tamanho e APAGA os metadados
// (EXIF), que podem conter localização e modelo do celular.
export async function prepararFoto(f: File): Promise<Blob> {
  const bitmap = await createImageBitmap(f)
  const lado = 640
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85))
  if (!blob || blob.size > MAX_FOTO) throw new Error('foto grande demais')
  return blob
}

export async function enviarFoto(uid: string, f: File): Promise<string> {
  const blob = await prepararFoto(f)
  const caminho = `${uid}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw error
  return caminho
}

export async function apagarFoto(caminho: string) {
  await supabase.storage.from('fotos').remove([caminho])
}

// URL assinada (expira em 1 h). O Storage só gera se o RLS permitir.
export function useFotoUrl(caminho: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    setUrl(null)
    if (!caminho) return
    supabase.storage
      .from('fotos')
      .createSignedUrl(caminho, 3600)
      .then(({ data }) => {
        if (ativo) setUrl(data?.signedUrl ?? null)
      })
    return () => {
      ativo = false
    }
  }, [caminho])
  return url
}
