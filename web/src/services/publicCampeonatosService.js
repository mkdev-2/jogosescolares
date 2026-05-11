import { apiFetch } from '../config/api'

const BASE = '/api/public/campeonatos'

function handleResponse(res, fallback = 'Erro') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallback)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallback)
  })
}

export const publicCampeonatosService = {
  async list(edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${edicaoId}` : ''
    const res = await apiFetch(`${BASE}${qs}`)
    const data = await handleResponse(res, 'Erro ao listar campeonatos')
    return Array.isArray(data) ? data : []
  },

  async getById(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${edicaoId}` : ''
    const res = await apiFetch(`${BASE}/${id}${qs}`)
    return handleResponse(res, 'Erro ao buscar campeonato')
  },

  async getClassificacaoGrupo(campeonatoId, grupoId, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${edicaoId}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/grupos/${grupoId}/classificacao${qs}`)
    const data = await handleResponse(res, 'Erro ao buscar classificação')
    return Array.isArray(data) ? data : []
  },

  async getEsportesComCampeonatos(edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${edicaoId}` : ''
    const res = await apiFetch(`${BASE}/esportes-com-campeonatos${qs}`)
    const data = await handleResponse(res, 'Erro ao carregar esportes')
    return Array.isArray(data) ? data : []
  },

  async getProximosConfrontos(edicaoId = null, limite = 10, campeonatoId = null) {
    const params = new URLSearchParams()
    if (edicaoId) params.set('edicao_id', edicaoId)
    if (limite !== 10) params.set('limite', limite)
    if (campeonatoId) params.set('campeonato_id', campeonatoId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await apiFetch(`${BASE}/proximos-confrontos${qs}`)
    const data = await handleResponse(res, 'Erro ao carregar próximos confrontos')
    return Array.isArray(data) ? data : []
  },
}
