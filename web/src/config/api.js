/**
 * Configuração de API e cliente HTTP.
 * Em desenvolvimento: sempre usa proxy (/api-service, /api-postgrest) para evitar CORS.
 * O target do proxy é definido no setupProxy.js via VITE_API_SERVICE_URL, VITE_POSTGREST_URL.
 * Em produção: usa URLs diretas das variáveis de ambiente.
 */
const isDev = import.meta.env.DEV

const API_SERVICE_URL = isDev
  ? '/api-service'
  : (import.meta.env.VITE_API_SERVICE_URL || '')
const POSTGREST_URL = isDev
  ? '/api-postgrest'
  : (import.meta.env.VITE_POSTGREST_URL || '')

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

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res = await fetch(fullUrl, { ...options, headers })

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`
      res = await fetch(fullUrl, { ...options, headers })
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
