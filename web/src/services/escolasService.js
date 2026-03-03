/**
 * Serviço de Escolas - CRUD via API
 */
import { apiFetch } from '../config/api'

const BASE = '/api/escolas'

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

export const escolasService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    const data = await handleResponse(res, 'Erro ao listar escolas')
    return Array.isArray(data) ? data : []
  },

  async getById(id) {
    const res = await apiFetch(`${BASE}/${id}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar escola')
  },

  async create(data) {
    const inep = (data.inep || '').replace(/\D/g, '')
    const cnpj = (data.cnpj || '').replace(/\D/g, '')
    const payload = {
      nome_escola: data.nome_escola?.trim() || '',
      inep,
      cnpj,
      endereco: data.endereco?.trim() || '',
      cidade: data.cidade?.trim() || '',
      uf: (data.uf || '').trim().toUpperCase(),
      email: data.email?.trim() || '',
      telefone: data.telefone?.trim() || '',
    }
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar escola')
  },

  async createPublico(data) {
    const inep = (data.inep || '').replace(/\D/g, '')
    const cnpj = (data.cnpj || '').replace(/\D/g, '')
    const payload = {
      nome_escola: data.nome_escola?.trim() || data.nomeRazaoSocial?.trim() || '',
      inep,
      cnpj,
      endereco: data.endereco?.trim() || '',
      cidade: data.cidade?.trim() || '',
      uf: (data.uf || '').trim().toUpperCase(),
      email: data.email?.trim() || '',
      telefone: data.telefone?.trim() || '',
    }
    const res = await apiFetch(`${BASE}/publico`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao cadastrar escola')
  },
}
