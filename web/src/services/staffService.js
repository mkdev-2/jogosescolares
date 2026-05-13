import { apiFetch, API_SERVICE_URL } from '../config/api'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    const msg = Array.isArray(data?.detail)
      ? data.detail.map((d) => d.msg).join(', ')
      : data?.detail || fallbackError
    throw new Error(msg)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const staffService = {
  listarCargosPublicos: () =>
    fetch(`${API_SERVICE_URL}/api/public/staff/cargos`, { referrerPolicy: 'no-referrer' })
      .then((res) => handleResponse(res, 'Erro ao listar cargos')),

  cadastrar: (data) =>
    fetch(`${API_SERVICE_URL}/api/public/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      referrerPolicy: 'no-referrer',
    }).then((res) => handleResponse(res, 'Erro ao cadastrar staff')),

  listar: () =>
    apiFetch('/api/staff').then((res) => handleResponse(res, 'Erro ao listar staff')),

  listarCargos: () =>
    apiFetch('/api/staff/cargos').then((res) => handleResponse(res, 'Erro ao listar cargos')),

  criarCargo: (data) =>
    apiFetch('/api/staff/cargos', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 'Erro ao criar cargo')),

  atualizarCargo: (id, data) =>
    apiFetch(`/api/staff/cargos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 'Erro ao atualizar cargo')),

  deletarCargo: (id) =>
    apiFetch(`/api/staff/cargos/${id}`, { method: 'DELETE' })
      .then((res) => { if (!res.ok && res.status !== 204) return handleResponse(res, 'Erro ao remover cargo') }),

  atualizar: (id, data) =>
    apiFetch(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 'Erro ao atualizar staff')),

  deletar: (id) =>
    apiFetch(`/api/staff/${id}`, { method: 'DELETE' })
      .then((res) => { if (!res.ok && res.status !== 204) return handleResponse(res, 'Erro ao excluir staff') }),
}
