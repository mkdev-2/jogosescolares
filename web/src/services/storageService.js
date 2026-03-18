import { apiFetch, API_SERVICE_URL } from '../config/api'

const BUCKET = 'jogosescolares'
const FOTOS_PATH = 'estudantes'
const DOCUMENTACAO_PATH = 'estudantes/documentacao'
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
 * Retorna URL para exibir arquivo do storage (via GET /api/storage/file/).
 * path pode ser relativo (bucket/path) ou URL absoluta (retornada como está).
 */
export function getStorageUrl(path) {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const base = API_SERVICE_URL.replace(/\/$/, '')
  const prefix = base ? `${base}/api/storage/file` : '/api/storage/file'
  const clean = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  return `${prefix}/${clean}`
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
 * Upload do termo de adesão da escola assinado pelo diretor (PDF ou imagem).
 * @param {File} file - Arquivo (PDF, JPG, PNG)
 * @returns {Promise<string>} Path relativo para uso com getStorageUrl
 */
export async function uploadTermoAdesao(file) {
  const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf').replace(/[^a-z0-9]/g, '')
  const path = `escolas/termo-adesao/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadToStorage(file, BUCKET, path)
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
