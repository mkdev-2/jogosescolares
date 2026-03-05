import { apiFetch } from '../config/api'

const BUCKET = 'jogosescolares'
const FOTOS_PATH = 'estudantes'

/**
 * Faz upload de arquivo de imagem para o storage (MinIO).
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} URL pública do arquivo
 */
export async function uploadFotoEstudante(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${FOTOS_PATH}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)
  formData.append('bucket', BUCKET)
  formData.append('contentType', file.type || 'image/jpeg')

  const res = await apiFetch('/api/storage/upload', {
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
