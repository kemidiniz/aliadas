// Mensagens amigáveis: nunca mostramos erro técnico para a usuária.
type ErroLike = { message?: string; code?: string } | null | undefined

export function mensagemAmigavel(e: unknown, padrao = 'algo não funcionou agora. tente de novo em instantes.'): string {
  const err = e as ErroLike
  if (!err) return padrao
  // exceções que nós mesmas escrevemos no banco (raise exception) já vêm em português
  if (err.code === 'P0001' && err.message) return err.message
  if (err.message?.includes('Failed to fetch')) return 'parece que a conexão caiu. confira sua internet e tente de novo.'
  if (err.message?.toLowerCase().includes('rate limit')) return 'muitas tentativas seguidas. espere um minutinho e tente de novo.'
  return padrao
}
