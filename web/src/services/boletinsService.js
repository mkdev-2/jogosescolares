import { apiFetch } from '../config/api'

const BASE = '/api/boletins'

function handleResponse(res, fallbackError = 'Erro ao processar boletins') {
  if (res.status === 204) return null
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const boletinsService = {
  async listManage() {
    const res = await apiFetch(`${BASE}/manage`)
    const data = await handleResponse(res, 'Erro ao listar boletins')
    return Array.isArray(data) ? data : []
  },

  async create(payload) {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar boletim')
  },

  async update(id, payload) {
    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar boletim')
  },

  async remove(id) {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })
    return handleResponse(res, 'Erro ao excluir boletim')
  },
}
