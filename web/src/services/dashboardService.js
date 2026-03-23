/**
 * Serviço de Dashboard - estatísticas do Quadro de Resumo
 */
import { apiFetch } from '../config/api'

const BASE = '/api/dashboard'

function handleResponse(res, fallbackError = 'Erro ao carregar dados do dashboard') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    const msg = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(', ') : (data?.detail || fallbackError)
    throw new Error(msg)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const dashboardService = {
  async getStats(edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}${qs}`)
    return handleResponse(res)
  },
}
