// Mensagens amigáveis: nunca mostramos erro técnico para a usuária.
type ErroLike = { message?: string; code?: string } | null | undefined

export function mensagemAmigavel(e: unknown, padrao = 'Algo não funcionou agora. Tente de novo em instantes.'): string {
  const err = e as ErroLike
  if (!err) return padrao
  // exceções que nós mesmas escrevemos no banco (raise exception) já vêm em português
  if (err.code === 'P0001' && err.message) return err.message
  if (err.message?.includes('Failed to fetch')) return 'Parece que a conexão caiu. Confira sua internet e tente de novo.'
  if (err.message?.toLowerCase().includes('rate limit')) return 'Muitas tentativas seguidas. Espere um minutinho e tente de novo.'
  return padrao
}
