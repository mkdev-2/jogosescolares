/**
 * Serviço de Relatórios - busca de dados para relatórios gerenciais.
 */
import { apiFetch } from '../config/api'

const BASE = '/api/relatorios'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    throw new Error(data?.detail || fallbackError)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const relatoriosService = {
  /**
   * Retorna informações da escola + alunos inscritos em uma modalidade específica.
   */
  async getEscolaModalidadeAlunos(escolaId, varianteId, edicaoId = null) {
    const params = new URLSearchParams({ escola_id: escolaId, variante_id: varianteId })
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    const res = await apiFetch(`${BASE}/escola-modalidade-alunos?${params.toString()}`)
    return handleResponse(res, 'Erro ao buscar alunos da escola')
  },

  /**
   * Retorna escolas agrupadas por modalidade (esporte_variante) para uma edição.
   * @param {number|null} edicaoId - ID da edição; usa a ativa se omitido.
   * @param {string|null} esporteId - UUID do esporte para filtrar (opcional).
   */
  async getEscolasPorModalidade(edicaoId = null, esporteId = null) {
    const params = new URLSearchParams()
    if (edicaoId) params.set('edicao_id', String(edicaoId))
    if (esporteId) params.set('esporte_id', String(esporteId))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await apiFetch(`${BASE}/escolas-por-modalidade${qs}`)
    const data = await handleResponse(res, 'Erro ao buscar escolas por modalidade')
    return Array.isArray(data) ? data : []
  },
}
