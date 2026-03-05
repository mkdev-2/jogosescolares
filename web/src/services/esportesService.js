/**
 * Serviço de Esportes - CRUD via API
 */
import { apiFetch } from '../config/api'

const BASE = '/api/esportes'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const esportesService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    const data = await handleResponse(res, 'Erro ao listar esportes')
    return Array.isArray(data) ? data : []
  },

  async getById(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar esporte')
  },

  async create(data) {
    const payload = {
      nome: data.nome?.trim() || '',
      descricao: data.descricao?.trim() || '',
      icone: data.icone || 'Zap',
      requisitos: data.requisitos?.trim() || '',
      limite_atletas: data.limite_atletas != null ? Number(data.limite_atletas) : 3,
      ativa: data.ativa !== undefined ? data.ativa : true,
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar esporte')
  },

  async update(id, data) {
    const payload = {}
    if (data.nome !== undefined) payload.nome = data.nome?.trim() ?? ''
    if (data.descricao !== undefined) payload.descricao = data.descricao?.trim() ?? ''
    if (data.icone !== undefined) payload.icone = data.icone || 'Zap'
    if (data.requisitos !== undefined) payload.requisitos = data.requisitos?.trim() ?? ''
    if (data.limite_atletas !== undefined) payload.limite_atletas = Number(data.limite_atletas) ?? 3
    if (data.ativa !== undefined) payload.ativa = data.ativa

    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar esporte')
  },

  async delete(id) {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.status === 204) return true
    await handleResponse(res, 'Erro ao excluir esporte')
    return true
  },
}
