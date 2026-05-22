/**
 * Verifica se o prazo de "Adesão das Escolas" (cadastro_data_limite) já passou.
 * @param {string|null|undefined} cadastroDataLimite YYYY-MM-DD ou null (sem limite)
 */
export function isCadastroEscolaEncerrado(cadastroDataLimite) {
  if (!cadastroDataLimite) return false
  const limit = String(cadastroDataLimite).trim().slice(0, 10)
  if (!limit) return false
  const parts = limit.split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return false
  const [y, m, d] = parts
  const deadline = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today > deadline
}
