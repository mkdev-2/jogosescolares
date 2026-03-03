/**
 * Serviço de Usuários - CRUD via API (apenas SUPER_ADMIN/ADMIN)
 */
import { apiFetch } from '../config/api'

const BASE = '/api/users'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    const msg = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(', ') : (data?.detail || fallbackError)
    throw new Error(msg)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

function formatCpf(cpf) {
  if (!cpf) return ''
  const s = String(cpf).replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const usersService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    const data = await handleResponse(res, 'Erro ao listar usuários')
    return Array.isArray(data) ? data : []
  },

  async getById(id) {
    const res = await apiFetch(`${BASE}/${id}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar usuário')
  },

  async create(data) {
    const cpf = (data.cpf || '').replace(/\D/g, '')
    const payload = {
      cpf,
      nome: data.nome?.trim() || '',
      email: data.email?.trim() || null,
      password: data.password || '',
      role: data.role || 'ADMIN',
      escola_id: data.escola_id ?? null,
      ativo: data.ativo !== undefined ? data.ativo : true,
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar usuário')
  },

  async update(id, data) {
    const payload = {}
    if (data.nome !== undefined) payload.nome = data.nome?.trim() ?? ''
    if (data.email !== undefined) payload.email = data.email?.trim() || null
    if (data.role !== undefined) payload.role = data.role
    if (data.escola_id !== undefined) payload.escola_id = data.escola_id
    if (data.ativo !== undefined) payload.ativo = data.ativo
    if (data.password?.trim()) payload.password = data.password.trim()

    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar usuário')
  },

  async delete(id) {
    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'DELETE',
    })
    if (res.status === 204) return true
    await handleResponse(res, 'Erro ao excluir usuário')
    return true
  },

  formatCpf,
}
