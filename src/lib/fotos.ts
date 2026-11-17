import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const MAX_ORIGINAL = 15 * 1024 * 1024 // arquivo escolhido: até 15 MB
export const MAX_FOTO = 2 * 1024 * 1024 // arquivo final (reduzido): até 2 MB
export const LADO_FOTO = 640
export const ERRO_ABRIR = 'Não conseguimos abrir essa foto. Tente uma JPG ou PNG.'

// Aceita qualquer imagem que o navegador consiga abrir (inclui HEIC onde houver suporte).
export function validarFoto(f: Blob): string | null {
  if (f.type && f.type !== 'application/octet-stream' && !f.type.startsWith('image/')) return ERRO_ABRIR
  if (f.size > MAX_ORIGINAL) return 'A foto precisa ter até 15 MB.'
  return null
}

export type FotoAberta = ImageBitmap | HTMLImageElement
export async function abrirFoto(f: Blob): Promise<FotoAberta> {
  const erro = validarFoto(f)
  if (erro) throw new Error(erro)
  try { return await createImageBitmap(f) } catch { /* Alguns celulares só decodificam via <img>. */ }
  const url = URL.createObjectURL(f)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => img.naturalWidth > 0 ? resolve() : reject(Error(ERRO_ABRIR))
      img.onerror = () => reject(Error(ERRO_ABRIR))
      img.src = url
    })
    return img
  } finally { URL.revokeObjectURL(url) }
}

// Recorte quadrado: zoom (1 = a imagem inteira cabe no lado menor) e posição
// (-1 a 1 em cada eixo). Redesenhar no canvas reduz para 640px e APAGA os
// metadados (EXIF), que podem conter localização e modelo do celular.
export type Enquadramento = { zoom: number; x: number; y: number }
export function areaDoRecorte(w: number, h: number, e: Enquadramento) {
  const lado = Math.min(w, h) / e.zoom
  const sx = (w - lado) / 2 + (e.x * (w - lado)) / 2
  const sy = (h - lado) / 2 + (e.y * (h - lado)) / 2
  return { sx, sy, lado }
}
export async function recortarFoto(img: FotoAberta, e: Enquadramento): Promise<Blob> {
  const { sx, sy, lado } = areaDoRecorte(img.width, img.height, e)
  const saida = Math.min(LADO_FOTO, Math.round(lado))
  const canvas = document.createElement('canvas')
  canvas.width = saida
  canvas.height = saida
  canvas.getContext('2d')!.drawImage(img, sx, sy, lado, lado, 0, 0, saida, saida)
  // Safari antigo não gera WebP (devolve PNG): nesse caso, JPEG.
  for (const tipo of ['image/webp', 'image/jpeg']) {
    for (const q of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, q))
      if (!blob || blob.type !== tipo) break
      if (blob.size <= MAX_FOTO) return blob
    }
  }
  throw new Error('Não conseguimos reduzir essa foto. Tente outra.')
}

export async function enviarFoto(uid: string, foto: Blob): Promise<string> {
  if (foto.size > MAX_FOTO) throw new Error('Foto grande demais')
  const jpeg = foto.type === 'image/jpeg'
  const caminho = `${uid}/${crypto.randomUUID()}.${jpeg ? 'jpg' : 'webp'}`
  const { error } = await supabase.storage.from('fotos').upload(caminho, foto, {
    contentType: jpeg ? 'image/jpeg' : 'image/webp',
    upsert: false,
  })
  if (error) throw error
  return caminho
}

export async function apagarFoto(caminho: string) {
  await supabase.storage.from('fotos').remove([caminho])
}

// Cache apenas em memória e por 45s; não persiste URLs privadas no navegador.
// Trocar de conta ou sair invalida também requisições antigas em andamento.
type Assinada = { url: string; ate: number };
const fotosAssinadas = new Map<string, Assinada>();
const fotosEmCurso = new Map<string, Promise<string | null>>();
let contaFotos: string | undefined;
let versaoFotos = 0;
supabase.auth.onAuthStateChange((evento, sessao) => {
  const conta = sessao?.user.id ?? "";
  if (evento === "SIGNED_OUT" || (contaFotos !== undefined && contaFotos !== conta)) {
    fotosAssinadas.clear(); fotosEmCurso.clear(); versaoFotos++;
  }
  contaFotos = conta;
});
function fotoEmCache(caminho: string) {
  const foto = fotosAssinadas.get(`${contaFotos ?? ""}:${caminho}`);
  return foto && foto.ate > Date.now() ? foto.url : null;
}
async function assinarFoto(caminho: string) {
  const anterior = fotoEmCache(caminho);
  if (anterior) return anterior;
  const chave = `${contaFotos ?? ""}:${caminho}`;
  const versao = versaoFotos;
  const andamento = fotosEmCurso.get(chave);
  if (andamento) return andamento;
  const requisicao = (async () => {
    try {
      const { data } = await supabase.storage.from('fotos').createSignedUrl(caminho, 3600);
      if (versao !== versaoFotos) return null;
      const url = data?.signedUrl ?? null;
      if (url) fotosAssinadas.set(chave, { url, ate: Date.now() + 45000 });
      return url;
    } finally { if (versao === versaoFotos) fotosEmCurso.delete(chave); }
  })();
  fotosEmCurso.set(chave, requisicao);
  return requisicao;
}
// O Storage continua validando RLS ao assinar; a URL expira em uma hora.
export function useFotoUrl(caminho: string | null | undefined) {
  const [foto, setFoto] = useState(() => ({ caminho, versao: versaoFotos, url: caminho ? fotoEmCache(caminho) : null }));
  const versao = versaoFotos;
  useEffect(() => {
    let ativo = true;
    setFoto({ caminho, versao, url: caminho ? fotoEmCache(caminho) : null });
    if (caminho) void assinarFoto(caminho).then(url => {
      if (ativo && versao === versaoFotos) setFoto({ caminho, versao, url });
    }).catch(() => { /* As iniciais continuam visíveis se a imagem falhar. */ });
    return () => { ativo = false; };
  }, [caminho, versao]);
  return foto.caminho === caminho && foto.versao === versaoFotos ? foto.url : null;
}
