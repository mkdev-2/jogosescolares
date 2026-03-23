import { apiFetch } from '../config/api'

const BASE = '/api/edicoes'

function handleResponse(res, fallbackError = 'Erro ao processar requisição de edições') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const edicoesService = {
  async list() {
    const res = await apiFetch(BASE)
    const data = await handleResponse(res, 'Erro ao listar edições')
    return Array.isArray(data) ? data : []
  },

  async create(payload) {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar edição')
  },

  async ativar(id) {
    const res = await apiFetch(`${BASE}/${id}/ativar`, { method: 'POST' })
    return handleResponse(res, 'Erro ao ativar edição')
  },

  async encerrar(id) {
    const res = await apiFetch(`${BASE}/${id}/encerrar`, { method: 'POST' })
    return handleResponse(res, 'Erro ao encerrar edição')
  },
}
