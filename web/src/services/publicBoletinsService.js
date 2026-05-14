import { apiFetch } from '../config/api'

const BASE = '/api/boletins'

function handleResponse(res, fallbackError = 'Erro ao carregar boletins') {
  if (res.ok) {
    return res.json().catch(() => ({ items: [], total: 0 }))
  }
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

/** @param {unknown} data */
function normalizeListPayload(data) {
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return { items: data.items, total: Number(data.total) || 0 }
  }
  if (Array.isArray(data)) {
    return { items: data, total: data.length }
  }
  return { items: [], total: 0 }
}

export const publicBoletinsService = {
  /**
   * Lista boletins publicados (sem autenticação). Retorna { items, total }.
   * @param {{ limit?: number, skip?: number, q?: string }} opts
   */
  async list(opts = {}) {
    const limit = opts.limit ?? 50
    const skip = opts.skip ?? 0
    const search = opts.q != null ? String(opts.q).trim() : ''
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('skip', String(skip))
    if (search) params.set('q', search)
    const res = await apiFetch(`${BASE}?${params.toString()}`)
    const data = await handleResponse(res, 'Erro ao listar boletins')
    return normalizeListPayload(data)
  },
}
