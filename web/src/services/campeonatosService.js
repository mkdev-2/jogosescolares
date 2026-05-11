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

  async criarManual(payload) {
    const res = await apiFetch(`${BASE}/manual`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar campeonato manual')
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

  async getById(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}${qs}`)
    return handleResponse(res, 'Erro ao buscar campeonato')
  },

  async getManual(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/manual${qs}`)
    return handleResponse(res, 'Erro ao buscar dados manuais')
  },

  async criarManualConfronto(campeonatoId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/confrontos${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar confronto')
  },

  async atualizarManualConfronto(campeonatoId, confrontoId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/confrontos/${confrontoId}${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar confronto')
  },

  async excluirManualConfronto(campeonatoId, confrontoId, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/confrontos/${confrontoId}${qs}`, { method: 'DELETE' })
    return handleResponse(res, 'Erro ao excluir confronto')
  },

  async criarManualClassificacao(campeonatoId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/classificacao${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar classificação')
  },

  async atualizarManualClassificacao(campeonatoId, classificacaoId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/classificacao/${classificacaoId}${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar classificação')
  },

  async excluirManualClassificacao(campeonatoId, classificacaoId, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/manual/classificacao/${classificacaoId}${qs}`, { method: 'DELETE' })
    return handleResponse(res, 'Erro ao excluir classificação')
  },

  async getEquipesDaVariante(esporteVarianteId, edicaoId = null) {
    const params = new URLSearchParams({ esporte_variante_id: String(esporteVarianteId) })
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    const res = await apiFetch(`${BASE}/equipes-da-variante?${params}`)
    const data = await handleResponse(res, 'Erro ao buscar equipes da variante')
    return Array.isArray(data) ? data : []
  },

  async getEstruturaGruposPreview(esporteVarianteId, edicaoId = null, totalEquipes = null) {
    const params = new URLSearchParams({ esporte_variante_id: String(esporteVarianteId) })
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    if (totalEquipes != null) params.set('total_equipes', String(totalEquipes))
    const res = await apiFetch(`${BASE}/estrutura-grupos-preview?${params}`)
    return handleResponse(res, 'Erro ao calcular estrutura de grupos')
  },

  async criarComSorteio(payload) {
    const res = await apiFetch(`${BASE}/criar-com-sorteio`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar campeonato')
  },

  async criarAutomatico(payload) {
    const res = await apiFetch(`${BASE}/criar-automatico`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao criar campeonato')
  },

  async cancelar(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}/cancelar${qs}`, { method: 'POST' })
    return handleResponse(res, 'Erro ao cancelar campeonato')
  },

  async excluir(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${id}${qs}`, { method: 'DELETE' })
    return handleResponse(res, 'Erro ao excluir campeonato')
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

  async agendarPartida(campeonatoId, partidaId, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/partidas/${partidaId}/agendamento${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao agendar partida')
  },

  async getClassificacaoGrupo(campeonatoId, grupoId, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`${BASE}/${campeonatoId}/grupos/${grupoId}/classificacao${qs}`)
    const data = await handleResponse(res, 'Erro ao buscar classificação do grupo')
    return Array.isArray(data) ? data : []
  },
}
