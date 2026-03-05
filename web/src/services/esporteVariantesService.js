/**
 * Serviço de Esporte Variantes - combinações esporte + categoria + naipe + tipo
 */
import { apiFetch } from '../config/api'

const BASE = '/api/esporte-variantes'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const esporteVariantesService = {
  async list(esporteId = null) {
    const url = esporteId ? `${BASE}?esporte_id=${encodeURIComponent(esporteId)}` : BASE
    const res = await apiFetch(url)
    const data = await handleResponse(res, 'Erro ao listar variantes')
    return Array.isArray(data) ? data : []
  },

  async create(data) {
    const payload = {
      esporte_id: data.esporte_id,
      categoria_id: data.categoria_id,
      naipe_id: data.naipe_id,
      tipo_modalidade_id: data.tipo_modalidade_id,
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar variante')
  },

  async delete(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.status === 204) return true
    await handleResponse(res, 'Erro ao excluir variante')
    return true
  },
}
