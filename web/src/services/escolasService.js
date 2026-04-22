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

function formatCnpj(str) {
  if (!str) return '-'
  const v = String(str).replace(/\D/g, '')
  if (v.length < 14) return v || '-'
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
}

function formatTelefone(str) {
  if (!str) return '-'
  const v = String(str).replace(/\D/g, '')
  if (v.length <= 2) return v ? `(${v}` : str
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

export const escolasService = {
  formatCnpj,
  formatTelefone,

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

  async getDetalhes(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/detalhes${qs}`)
    if (res.status === 404) return null
    return handleResponse(res, 'Erro ao buscar detalhes da escola')
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

  async createPublico(payload) {
    const res = await apiFetch(`${BASE}/publico`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao cadastrar escola')
  },

  async listAdesoes(status = null) {
    const url = status ? `${BASE}/adesoes?status=${encodeURIComponent(status)}` : `${BASE}/adesoes`
    const res = await apiFetch(url)
    const data = await handleResponse(res, 'Erro ao listar adesões')
    return Array.isArray(data) ? data : []
  },

  async aprovarAdesao(solicitacaoId) {
    const res = await apiFetch(`${BASE}/${solicitacaoId}/aprovar`, { method: 'POST' })
    return handleResponse(res, 'Erro ao aprovar solicitação')
  },

  async negarSolicitacao(solicitacaoId) {
    const res = await apiFetch(`${BASE}/${solicitacaoId}/negar`, { method: 'POST' })
    return handleResponse(res, 'Erro ao negar solicitação')
  },

  async updateModalidades(escolaId, varianteIds, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${escolaId}/modalidades${qs}`, {
      method: 'PATCH',
      body: JSON.stringify({ variante_ids: varianteIds }),
    })
    return handleResponse(res, 'Erro ao atualizar modalidades')
  },

  /** Para o diretor: atualiza modalidades da própria escola (usa token, evita 404 por rota). */
  async updateMinhaEscolaModalidades(varianteIds, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/minha-escola/modalidades${qs}`, {
      method: 'PATCH',
      body: JSON.stringify({ variante_ids: varianteIds }),
    })
    return handleResponse(res, 'Erro ao atualizar modalidades')
  },

  async updateTermoAdesao(escolaId, termoAssinaturaUrl, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${escolaId}/termo-adesao${qs}`, {
      method: 'PATCH',
      body: JSON.stringify({ termo_assinatura_url: termoAssinaturaUrl }),
    })
    return handleResponse(res, 'Erro ao atualizar termo de adesão')
  },
}
