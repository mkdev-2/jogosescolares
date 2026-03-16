import { useState, useEffect, useRef } from 'react'
import { Image, ImagePlus } from 'lucide-react'
import { configuracoesService } from '../../services/configuracoesService'
import { uploadLogoMidias, getStorageUrl } from '../../services/storageService'

const ACCEPT_IMAGES = 'image/png,image/jpeg,image/jpg,image/webp'

export default function Midias({ embedded }) {
  const [config, setConfig] = useState({ logo_secretaria: null, logo_jels: null, bg_credencial: null })
  const [loading, setLoading] = useState(true)
  const [uploadingSecretaria, setUploadingSecretaria] = useState(false)
  const [uploadingJels, setUploadingJels] = useState(false)
  const [uploadingBgCredencial, setUploadingBgCredencial] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const inputSecretariaRef = useRef(null)
  const inputJelsRef = useRef(null)
  const inputBgCredencialRef = useRef(null)

  const loadConfig = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await configuracoesService.get()
      setConfig({
        logo_secretaria: data?.logo_secretaria ?? null,
        logo_jels: data?.logo_jels ?? null,
        bg_credencial: data?.bg_credencial ?? null,
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao carregar configurações.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleUpload = async (tipo, file) => {
    if (!file || !file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecione um arquivo de imagem (PNG, JPG ou WebP).' })
      return
    }
    let setUploading = setUploadingSecretaria
    if (tipo === 'logo_jels') setUploading = setUploadingJels
    if (tipo === 'bg_credencial') setUploading = setUploadingBgCredencial

    setUploading(true)
    setMessage({ type: '', text: '' })
    try {
      const path = await uploadLogoMidias(file, tipo)
      await configuracoesService.updateLogos({ [tipo]: path })
      setConfig((prev) => ({ ...prev, [tipo]: path }))
      let msg = 'Arte de fundo atualizada.'
      if (tipo === 'logo_secretaria') msg = 'Logo Secretaria atualizada.'
      if (tipo === 'logo_jels') msg = 'Logo JELS atualizada.'
      setMessage({ type: 'success', text: msg })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao fazer upload.' })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (tipo, e) => {
    const file = e?.target?.files?.[0]
    if (file) handleUpload(tipo, file)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#64748b]">
        <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
        <p className="m-0 mt-4">Carregando...</p>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'p-4 sm:p-6 lg:px-12'}>
      {!embedded && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#042f2e] m-0">Mídias</h2>
          <p className="text-[#64748b] mt-1 m-0">Upload das logos utilizadas no sistema (Secretaria e JELS).</p>
        </div>
      )}

      {message.text && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${message.type === 'error' ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#f0fdf4] text-[#166534]'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {/* Logo Secretaria */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-[#0f766e]" />
            <h3 className="text-base font-semibold text-[#042f2e] m-0">Logo Secretaria</h3>
          </div>
          <div className="flex flex-col items-center gap-4">
            {config.logo_secretaria ? (
              <div className="w-full max-w-[200px] aspect-video bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-center overflow-hidden">
                <img
                  src={getStorageUrl(config.logo_secretaria)}
                  alt="Logo Secretaria"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full max-w-[200px] aspect-video bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex items-center justify-center">
                <ImagePlus className="w-10 h-10 text-[#94a3b8]" />
              </div>
            )}
            <input
              ref={inputSecretariaRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => handleFileChange('logo_secretaria', e)}
            />
            <button
              type="button"
              disabled={uploadingSecretaria}
              onClick={() => inputSecretariaRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0f766e] text-white hover:bg-[#0d6961] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadingSecretaria ? 'Enviando...' : config.logo_secretaria ? 'Alterar logo' : 'Enviar logo'}
            </button>
          </div>
        </div>

        {/* Logo JELS */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-[#0f766e]" />
            <h3 className="text-base font-semibold text-[#042f2e] m-0">Logo JELS</h3>
          </div>
          <div className="flex flex-col items-center gap-4">
            {config.logo_jels ? (
              <div className="w-full max-w-[200px] aspect-video bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-center overflow-hidden">
                <img
                  src={getStorageUrl(config.logo_jels)}
                  alt="Logo JELS"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full max-w-[200px] aspect-video bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex items-center justify-center">
                <ImagePlus className="w-10 h-10 text-[#94a3b8]" />
              </div>
            )}
            <input
              ref={inputJelsRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => handleFileChange('logo_jels', e)}
            />
            <button
              type="button"
              disabled={uploadingJels}
              onClick={() => inputJelsRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0f766e] text-white hover:bg-[#0d6961] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadingJels ? 'Enviando...' : config.logo_jels ? 'Alterar logo' : 'Enviar logo'}
            </button>
          </div>
        </div>

        {/* Fundo da Credencial */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm sm:col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-[#0f766e]" />
            <h3 className="text-base font-semibold text-[#042f2e] m-0">Fundo da Credencial</h3>
          </div>
          <div className="flex flex-col items-center gap-4">
            {config.bg_credencial ? (
              <div className="w-full max-w-[300px] aspect-[3/4] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-center overflow-hidden">
                <img
                  src={getStorageUrl(config.bg_credencial)}
                  alt="Fundo Credencial"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full max-w-[300px] aspect-[3/4] bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex flex-col items-center justify-center gap-2 text-[#94a3b8] p-4 text-center">
                <ImagePlus className="w-10 h-10" />
                <span className="text-sm">Envie a arte da credencial em branco (Orientação Retrato Aprox: 9x12cm)</span>
              </div>
            )}
            <input
              ref={inputBgCredencialRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => handleFileChange('bg_credencial', e)}
            />
            <button
              type="button"
              disabled={uploadingBgCredencial}
              onClick={() => inputBgCredencialRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0f766e] text-white hover:bg-[#0d6961] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadingBgCredencial ? 'Enviando...' : config.bg_credencial ? 'Alterar arte' : 'Enviar arte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
