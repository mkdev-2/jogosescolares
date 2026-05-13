import { apiFetch } from '../config/api'

const BASE = '/api/public/locais'

function handleResponse(res, fallbackError = 'Erro ao carregar locais') {
  if (res.ok) return res.json().catch(() => [])
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const publicLocaisService = {
  /**
   * Lista locais da edição ativa (ou da edição informada).
   * @param {number|null|undefined} edicaoId
   */
  async list(edicaoId = null) {
    const q = edicaoId != null ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}${q}`)
    const data = await handleResponse(res, 'Erro ao listar locais')
    return Array.isArray(data) ? data : []
  },
}
