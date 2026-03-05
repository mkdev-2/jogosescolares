/**
 * Serviço de Categorias - CRUD via API
 */
import { apiFetch } from '../config/api'

const BASE = '/api/categorias'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const categoriasService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    const data = await handleResponse(res, 'Erro ao listar categorias')
    return Array.isArray(data) ? data : []
  },

  async getById(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar categoria')
  },

  async create(data) {
    const payload = {
      nome: data.nome?.trim() || '',
      idade_min: Number(data.idade_min) ?? 0,
      idade_max: Number(data.idade_max) ?? 0,
      ativa: data.ativa !== undefined ? data.ativa : true,
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar categoria')
  },

  async update(id, data) {
    const payload = {}
    if (data.nome !== undefined) payload.nome = data.nome?.trim() ?? ''
    if (data.idade_min !== undefined) payload.idade_min = Number(data.idade_min)
    if (data.idade_max !== undefined) payload.idade_max = Number(data.idade_max)
    if (data.ativa !== undefined) payload.ativa = data.ativa

    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar categoria')
  },

  async delete(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.status === 204) return true
    await handleResponse(res, 'Erro ao excluir categoria')
    return true
  },
}
