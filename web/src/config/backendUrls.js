/**
 * Resolve URLs do backend (auth, PostgREST, MinIO).
 * Em dev: proxy relativo no Vite (/api-service, etc.).
 * Em produção: VITE_* do build; se vazio, infere pelo host (auth-jels.{domínio}, …).
 */

function trimUrl(value) {
  return (value || '').trim().replace(/\/$/, '')
}

/**
 * Convenção Traefik (docker-compose.prod.yml): auth-${DOMAIN}, api-${DOMAIN}, storage-${DOMAIN}
 * com frontend em jels.{DOMAIN} → auth-jels.{DOMAIN}, api-jels.{DOMAIN}, storage-jels.{DOMAIN}.
 */
export function inferBackendUrlsFromHostname(hostname) {
  const host = (hostname || '').toLowerCase()
  if (!host.startsWith('jels.')) return null

  const rest = host.slice(5)
  if (!rest) return null

  return {
    apiService: `https://auth-jels.${rest}`,
    postgrest: `https://api-jels.${rest}`,
    minio: `https://storage-jels.${rest}`,
  }
}

function resolveUrl(envValue, devProxyPath, inferredKey) {
  const fromEnv = trimUrl(envValue)
  if (fromEnv) return fromEnv

  if (import.meta.env.DEV) return devProxyPath

  if (typeof window !== 'undefined') {
    const inferred = inferBackendUrlsFromHostname(window.location.hostname)
    if (inferred?.[inferredKey]) return inferred[inferredKey]
  }

  return ''
}

export function resolveApiServiceUrl() {
  return resolveUrl(import.meta.env.VITE_API_SERVICE_URL, '/api-service', 'apiService')
}

export function resolvePostgrestUrl() {
  return resolveUrl(import.meta.env.VITE_POSTGREST_URL, '/api-postgrest', 'postgrest')
}

export function resolveMinioPublicUrl() {
  return resolveUrl(import.meta.env.VITE_MINIO_URL, '', 'minio')
}
