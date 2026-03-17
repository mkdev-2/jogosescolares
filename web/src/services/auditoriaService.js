import { apiFetch } from '../config/api'

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

const auditoriaService = {
  getLogs: async (filters = {}) => {
    // Converter filtros para query string
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    })
    
    const query = params.toString()
    const url = `/auditoria${query ? `?${query}` : ''}`
    
    const res = await apiFetch(url)
    return handleResponse(res, 'Erro ao buscar logs de auditoria.')
  }
}

export default auditoriaService
