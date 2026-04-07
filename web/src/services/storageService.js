import { apiFetch, API_SERVICE_URL } from '../config/api'

const BUCKET = 'jogosescolares'
const STORAGE_PUBLIC_BASE = (import.meta.env.VITE_MINIO_URL || '').trim().replace(/\/$/, '')

function buildStorageFileUrl(relativePath) {
  const clean = String(relativePath || '').trim().replace(/^\/+/, '')
  if (!clean) return ''
  const base = API_SERVICE_URL.replace(/\/$/, '')
  const prefix = base ? `${base}/api/storage/file` : '/api/storage/file'
  return `${prefix}/${clean}`
}

function buildDirectStorageUrl(relativePath) {
  const clean = String(relativePath || '').trim().replace(/^\/+/, '')
  if (!clean || !STORAGE_PUBLIC_BASE) return ''
  return `${STORAGE_PUBLIC_BASE}/${clean}`
}
const FOTOS_PATH = 'estudantes'
const DOCUMENTACAO_PATH = 'estudantes/documentacao'
const DOCUMENTACAO_RG_PATH = 'estudantes/documentacao-rg'
const DOCUMENTACAO_PROFESSORES_PATH = 'professores/documentacao'
const PERFIL_PATH = 'perfil'
const NOTICIAS_PATH = 'noticias'
const MIDIAS_PATH = 'midias'

/**
 * Faz upload para o MinIO via backend. bucket e path na query; body só o file.
 * Retorna path relativo (bucket/path) para usar em getStorageUrl.
 */
async function uploadToStorage(file, bucket, path) {
  const formData = new FormData()
  formData.append('file', file)
  const url = `${API_SERVICE_URL}/api/storage/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
  const res = await apiFetch(url, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || data.message || `Erro ${res.status} no upload`)
  }
  const data = await res.json()
  return data.url || ''
}

/**
 * Faz upload público para caminhos autorizados (ex: termo de adesão).
 */
async function uploadToStoragePublic(file, bucket, path) {
  const formData = new FormData()
  formData.append('file', file)
  const url = `${API_SERVICE_URL}/api/storage/upload/public?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || data.message || `Erro ${res.status} no upload`)
  }
  const data = await res.json()
  return data.url || ''
}

/**
 * Retorna URL para exibir arquivo do storage (via GET /api/storage/file/).
 * path pode ser relativo (bucket/path) ou URL absoluta (API ou MinIO); sempre
 * normaliza para o endpoint atual (proxy em dev) para buckets privados.
 */
export function getStorageUrl(path) {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  const trimmed = path.trim()
  const marker = '/api/storage/file/'

  const extractAfterMarker = (value) => {
    const i = value.indexOf(marker)
    if (i < 0) return null
    return value.slice(i + marker.length).split(/[?#]/)[0].replace(/^\/+/, '')
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const fromApi = extractAfterMarker(trimmed)
    if (fromApi) return buildStorageFileUrl(fromApi)

    try {
      const u = new URL(trimmed)
      // URL direta do MinIO/S3: /jogosescolares/chave/do/objeto → servir via API (bucket privado).
      if (u.pathname.startsWith(`/${BUCKET}/`)) {
        return buildStorageFileUrl(u.pathname.replace(/^\//, ''))
      }
    } catch {
      return trimmed
    }
    // URL externa genuína (ex.: CDN de terceiros)
    return trimmed
  }

  let rel = extractAfterMarker(trimmed) ?? trimmed.replace(/^\/+/, '')
  rel = rel.split(/[?#]/)[0].replace(/^\/+/, '')
  if (!rel) return ''

  // Legado: chave sem prefixo do bucket (ex.: só "midias/..." ou "hero/...")
  if (!rel.startsWith(`${BUCKET}/`)) {
    const legacyPrefixes = ['midias/', 'hero/', 'estudantes/', 'noticias/', 'perfil/', 'escolas/']
    if (legacyPrefixes.some((p) => rel.startsWith(p))) {
      rel = `${BUCKET}/${rel}`
    }
  }

  return buildStorageFileUrl(rel)
}

function getStorageRelativePath(path) {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  const marker = '/api/storage/file/'
  const extractAfterMarker = (value) => {
    const i = value.indexOf(marker)
    if (i < 0) return null
    return value.slice(i + marker.length).split(/[?#]/)[0].replace(/^\/+/, '')
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const fromApi = extractAfterMarker(trimmed)
    if (fromApi) return fromApi
    try {
      const u = new URL(trimmed)
      if (u.pathname.startsWith(`/${BUCKET}/`)) {
        return u.pathname.replace(/^\//, '')
      }
      return ''
    } catch {
      return ''
    }
  }

  let rel = extractAfterMarker(trimmed) ?? trimmed.replace(/^\/+/, '')
  rel = rel.split(/[?#]/)[0].replace(/^\/+/, '')
  if (!rel) return ''
  if (!rel.startsWith(`${BUCKET}/`)) {
    const legacyPrefixes = ['midias/', 'hero/', 'estudantes/', 'noticias/', 'perfil/', 'escolas/']
    if (legacyPrefixes.some((p) => rel.startsWith(p))) {
      rel = `${BUCKET}/${rel}`
    }
  }
  return rel
}

export function getDirectStorageUrl(path) {
  const rel = getStorageRelativePath(path)
  if (!rel) return ''
  return buildDirectStorageUrl(rel)
}

/**
 * Baixa o arquivo do storage com Authorization (Bearer) — necessário quando o gateway
 * exige JWT em /api/storage/file/...; `<img src>` não envia cabeçalhos.
 * Aceita path relativo (bucket/chave) ou o mesmo valor aceito por getStorageUrl.
 */
export async function fetchStorageBlob(path) {
  const rel = getStorageRelativePath(path)
  const url = rel ? buildStorageFileUrl(rel) : getStorageUrl(path)
  if (!url) throw new Error('Caminho inválido')
  // 1) Tenta sem Authorization (rota de arquivo costuma ser pública).
  // 2) Se o gateway bloquear (401/403), tenta autenticado via apiFetch.
  const direct = await fetch(url, { referrerPolicy: 'no-referrer' })
  if (direct.ok) {
    const ct = (direct.headers.get('content-type') || '').toLowerCase()
    // Proteção: evita usar HTML de fallback como imagem.
    if (!ct.includes('text/html')) {
      return direct.blob()
    }
  }

  const authRes = await apiFetch(url)
  if (!authRes.ok) {
    // Fallback para leitura direta do host de storage (quando /api/storage/file
    // é bloqueado por regra de gateway em alguns ambientes).
    const directUrl = rel ? buildDirectStorageUrl(rel) : ''
    if (directUrl) {
      const directPublic = await fetch(directUrl, { referrerPolicy: 'no-referrer' })
      if (directPublic.ok) {
        const ct = (directPublic.headers.get('content-type') || '').toLowerCase()
        if (!ct.includes('text/html')) return directPublic.blob()
      }
    }
    throw new Error(`Erro ${authRes.status} ao carregar arquivo`)
  }
  const authCt = (authRes.headers.get('content-type') || '').toLowerCase()
  if (authCt.includes('text/html')) {
    throw new Error('Resposta inesperada HTML no endpoint de arquivo')
  }
  return authRes.blob()
}

/**
 * Faz upload de arquivo de imagem para o storage (MinIO).
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadFotoEstudante(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${FOTOS_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload da documentação assinada do estudante-atleta (PDF ou imagem).
 * @param {File} file - Arquivo (PDF, JPG, PNG)
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadDocumentacaoAssinada(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf').replace(/[^a-z0-9]/g, '')
  const path = `${DOCUMENTACAO_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload da documentação de identidade (RG) do estudante-atleta (PDF ou imagem).
 * @param {File} file - Arquivo (PDF, JPG, PNG)
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadDocumentacaoRg(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf').replace(/[^a-z0-9]/g, '')
  const path = `${DOCUMENTACAO_RG_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload da documentação do professor-técnico (PDF ou imagem).
 * @param {File} file - Arquivo (PDF, JPG, PNG)
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadDocumentacaoProfessor(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf').replace(/[^a-z0-9]/g, '')
  const path = `${DOCUMENTACAO_PROFESSORES_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload do termo de adesão da escola assinado pelo diretor (PDF ou imagem).
 * @param {File} file - Arquivo (PDF, JPG, PNG)
 * @returns {Promise<string>} Path relativo para uso com getStorageUrl
 */
export async function uploadTermoAdesao(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf').replace(/[^a-z0-9]/g, '')
  const path = `escolas/termo-adesao/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStoragePublic(file, BUCKET, path)
}

/**
 * Upload de foto de perfil do usuário (minha conta).
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadFotoPerfil(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${PERFIL_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload de imagem para notícias (destaque ou galeria).
 * @param {File} file - Arquivo de imagem
 * @param {string} [subPath] - Ex: 'destaque' ou 'galeria'
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadImagemNoticia(file, subPath = 'destaque') {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${NOTICIAS_PATH}/${subPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload de logo para mídias (secretaria ou JELS).
 * @param {File} file - Arquivo de imagem (PNG, JPG, etc.)
 * @param {'logo_secretaria'|'logo_jels'} tipo - Qual logo atualizar
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
/**
 * Upload de banner para o carrossel da Home (Hero).
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadLogoMidias(file, tipo) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'png').replace(/[^a-z0-9]/g, '')
  const path = `${MIDIAS_PATH}/${tipo}-${Date.now()}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}

/**
 * Upload de banner para o carrossel da Home (Hero).
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} Path relativo (bucket/path) para uso com getStorageUrl
 */
export async function uploadBannerHero(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'jpg').replace(/[^a-z0-9]/g, '')
  const path = `hero/banner-${Date.now()}.${ext}`
  return uploadToStorage(file, BUCKET, path)
}
