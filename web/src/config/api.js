/**
 * Configuração de API e cliente HTTP.
 * Em desenvolvimento: proxy (/api-service, /api-postgrest) via vite.config.js.
 * Em produção: VITE_* no build ou inferência a partir do host (jels.* → auth-jels.*, …).
 */
import { resolveApiServiceUrl, resolvePostgrestUrl } from './backendUrls'

const API_SERVICE_URL = resolveApiServiceUrl()
const POSTGREST_URL = resolvePostgrestUrl()

const TOKEN_KEY = 'jogos-escolares-access-token'
const REFRESH_TOKEN_KEY = 'jogos-escolares-refresh-token'

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Faz requisição autenticada com retry de refresh token em 401.
 */
export async function apiFetch(url, options = {}) {
  const baseUrl = url.startsWith('/api-service') || url.startsWith('/api-postgrest') ? '' : API_SERVICE_URL
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`

  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  // Para FormData, o browser deve definir Content-Type com boundary automaticamente
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }
  // GET/HEAD sem body: não enviar Content-Type JSON (alguns gateways tratam melhor arquivos/binários)
  if ((method === 'GET' || method === 'HEAD') && !options.body) {
    delete headers['Content-Type']
  }

  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res = await fetch(fullUrl, { ...options, headers, referrerPolicy: 'no-referrer' })

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`
      res = await fetch(fullUrl, { ...options, headers, referrerPolicy: 'no-referrer' })
    }
  }

  return res
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const baseUrl = API_SERVICE_URL
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      referrerPolicy: 'no-referrer',
    })

    if (!res.ok) {
      clearTokens()
      return false
    }

    const data = await res.json()
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export { API_SERVICE_URL, POSTGREST_URL, TOKEN_KEY, REFRESH_TOKEN_KEY }
