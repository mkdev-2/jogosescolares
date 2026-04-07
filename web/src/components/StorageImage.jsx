import { useState, useEffect } from 'react'
import { getStorageUrl, getDirectStorageUrl } from '../services/storageService'

/**
 * Exibe imagem do MinIO via API com token — evita 401/403 em gateways que exigem JWT
 * em GET /api/storage/file/... (tag <img> não envia Authorization).
 */
export default function StorageImage({ path, alt, className, loadingClassName, ...rest }) {
  const [src, setSrc] = useState('')
  const [triedDirect, setTriedDirect] = useState(false)
  const [failed, setFailed] = useState(false)
  const apiUrl = getStorageUrl(path)
  const directUrl = getDirectStorageUrl(path)

  useEffect(() => {
    if (!path) {
      setSrc('')
      setTriedDirect(false)
      setFailed(false)
      return
    }
    setSrc(apiUrl || directUrl || '')
    setTriedDirect(false)
    setFailed(false)
  }, [path, apiUrl, directUrl])

  const handleError = () => {
    if (!triedDirect && directUrl && src !== directUrl) {
      setSrc(directUrl)
      setTriedDirect(true)
      return
    }
    setFailed(true)
  }

  if (!path) return null
  if (!src || failed) {
    if (failed) {
      return (
        <div
          className={loadingClassName || `${className || ''} bg-slate-100`.trim()}
          aria-label="Falha ao carregar imagem"
          title="Falha ao carregar imagem"
        />
      )
    }
    return (
      <div
        className={loadingClassName || `${className || ''} bg-slate-100 animate-pulse`.trim()}
        aria-hidden
      />
    )
  }
  return <img src={src} alt={alt || ''} className={className} onError={handleError} {...rest} />
}
