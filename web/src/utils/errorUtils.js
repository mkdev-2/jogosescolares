/**
 * Utilitários para tratamento de erros de API.
 * Remove mensagens técnicas do banco (CONTEXT, PL/pgSQL) e loga no console.
 */

const PADRAO_RAW_DB = /CONTEXT:|PL\/pgSQL|at RAISE|line \d+/

/**
 * Retorna mensagem amigável para o usuário e loga o erro bruto no console se parecer técnico.
 * @param {string} rawMessage - Mensagem original do erro
 * @param {string} fallback - Mensagem padrão quando a original for técnica
 * @returns {string} Mensagem sanitizada para exibir na UI
 */
export function sanitizeErrorMessage(rawMessage, fallback = 'Ocorreu um erro. Tente novamente.') {
  const msg = String(rawMessage || '').trim()
  if (!msg) return fallback

  if (PADRAO_RAW_DB.test(msg)) {
    console.warn('[Erro API]', msg)
    const limpa = msg.split(' CONTEXT:')[0].split(' at RAISE')[0].trim()
    return limpa || fallback
  }

  return msg
}
