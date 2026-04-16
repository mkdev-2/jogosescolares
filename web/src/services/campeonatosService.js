import { apiFetch } from '../config/api'

const BASE = '/api/campeonatos'

function handleResponse(res, fallbackError = 'Erro ao processar requisição de campeonatos') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const campeonatosService = {
  async list({ edicaoId = null, esporteVarianteId = null } = {}) {
    const params = new URLSearchParams()
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    if (esporteVarianteId) params.set('esporte_variante_id', String(esporteVarianteId))
    const qs = params.toString()
    const res = await apiFetch(`${BASE}${qs ? `?${qs}` : ''}`)
    const data = await handleResponse(res, 'Erro ao listar campeonatos')
    return Array.isArray(data) ? data : []
  },

  async create(payload) {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar campeonato')
  },

  async autorizarGeracao(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/autorizar-geracao${qs}`, { method: 'POST' })
    return handleResponse(res, 'Erro ao autorizar geração')
  },

  async revogarAutorizacao(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/revogar-autorizacao${qs}`, { method: 'POST' })
    return handleResponse(res, 'Erro ao revogar autorização')
  },

  async gerarEstrutura(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/gerar-estrutura${qs}`, { method: 'POST' })
    return handleResponse(res, 'Erro ao gerar estrutura')
  },

  async getEstrutura(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/estrutura${qs}`)
    return handleResponse(res, 'Erro ao consultar estrutura')
  },

  async getEquipesDaVariante(esporteVarianteId, edicaoId = null) {
    const params = new URLSearchParams({ esporte_variante_id: String(esporteVarianteId) })
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    const res = await apiFetch(`${BASE}/equipes-da-variante?${params}`)
    const data = await handleResponse(res, 'Erro ao buscar equipes da variante')
    return Array.isArray(data) ? data : []
  },

  async criarComSorteio(payload) {
    const res = await apiFetch(`${BASE}/criar-com-sorteio`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar campeonato')
  },

  async getConfigPontuacao(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/config-pontuacao${qs}`)
    return handleResponse(res, 'Erro ao buscar configuração de pontuação')
  },

  async registrarResultado(campeonatoId, partidaId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/partidas/${partidaId}/resultado${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao registrar resultado')
  },
}
