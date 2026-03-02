/**
 * Serviço de Modalidades - CRUD via API
 */
import { apiFetch } from '../config/api'

const BASE = '/api/modalidades'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const modalidadesService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    const data = await handleResponse(res, 'Erro ao listar modalidades')
    return Array.isArray(data) ? data : []
  },

  async getById(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar modalidade')
  },

  async create(data) {
    const payload = {
      nome: data.nome?.trim() || '',
      descricao: data.descricao?.trim() || '',
      categoria: data.categoria || 'Coletiva',
      requisitos: data.requisitos?.trim() || '',
      ativa: data.ativa !== undefined ? data.ativa : true,
    }
    if (data.id?.trim()) {
      payload.id = data.id.trim().toUpperCase().replace(/\s/g, '_')
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar modalidade')
  },

  async update(id, data) {
    const payload = {}
    if (data.nome !== undefined) payload.nome = data.nome?.trim() ?? ''
    if (data.descricao !== undefined) payload.descricao = data.descricao?.trim() ?? ''
    if (data.categoria !== undefined) payload.categoria = data.categoria
    if (data.requisitos !== undefined) payload.requisitos = data.requisitos?.trim() ?? ''
    if (data.ativa !== undefined) payload.ativa = data.ativa

    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar modalidade')
  },

  async delete(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.status === 204) return true
    await handleResponse(res, 'Erro ao excluir modalidade')
    return true
  },
}
