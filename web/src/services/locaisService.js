import { apiFetch } from '../config/api'

const BASE = '/api/locais'

function handleResponse(res, fallbackError = 'Erro ao processar locais') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

function qsEdicao(edicaoId) {
  return edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
}

export const locaisService = {
  async list(edicaoId = null) {
    const res = await apiFetch(`${BASE}${qsEdicao(edicaoId)}`)
    const data = await handleResponse(res, 'Erro ao listar locais')
    return Array.isArray(data) ? data : []
  },

  async create(payload, edicaoId = null) {
    const res = await apiFetch(`${BASE}${qsEdicao(edicaoId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar local')
  },

  async update(id, payload, edicaoId = null) {
    const res = await apiFetch(`${BASE}/${id}${qsEdicao(edicaoId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar local')
  },

  async remove(id, edicaoId = null) {
    const res = await apiFetch(`${BASE}/${id}${qsEdicao(edicaoId)}`, { method: 'DELETE' })
    if (!res.ok) {
      await handleResponse(res, 'Erro ao excluir local')
    }
  },
}
