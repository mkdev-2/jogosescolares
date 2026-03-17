import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, ImagePlus } from 'lucide-react'
import { notification } from 'antd'
import { configuracoesService } from '../../services/configuracoesService'
import { uploadLogoMidias, getStorageUrl } from '../../services/storageService'

const ACCEPT_IMAGES = 'image/png,image/jpeg,image/jpg,image/webp'

export default function Midias({ embedded }) {
  const [config, setConfig] = useState({ logo_secretaria: null, logo_jels: null, bg_credencial: null })
  const [loading, setLoading] = useState(true)
  const [uploadingSecretaria, setUploadingSecretaria] = useState(false)
  const [uploadingJels, setUploadingJels] = useState(false)
  const [uploadingBgCredencial, setUploadingBgCredencial] = useState(false)
  const inputSecretariaRef = useRef(null)
  const inputJelsRef = useRef(null)
  const inputBgCredencialRef = useRef(null)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await configuracoesService.get()
      setConfig({
        logo_secretaria: data?.logo_secretaria ?? null,
        logo_jels: data?.logo_jels ?? null,
        bg_credencial: data?.bg_credencial ?? null,
      })
    } catch (err) {
      notification.error({
        message: 'Erro ao carregar mídias',
        description: err.message || 'Não foi possível buscar as imagens configuradas.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleUpload = async (tipo, file) => {
    if (!file || !file.type.startsWith('image/')) {
      notification.warning({
        message: 'Formato inválido',
        description: 'Selecione um arquivo de imagem (PNG, JPG ou WebP).',
      })
      return
    }
    let setUploading = setUploadingSecretaria
    if (tipo === 'logo_jels') setUploading = setUploadingJels
    if (tipo === 'bg_credencial') setUploading = setUploadingBgCredencial

    setUploading(true)
    try {
      const path = await uploadLogoMidias(file, tipo)
      await configuracoesService.updateLogos({ [tipo]: path })
      setConfig((prev) => ({ ...prev, [tipo]: path }))
      
      let msg = 'Arte de fundo atualizada com sucesso.'
      if (tipo === 'logo_secretaria') msg = 'Logo da Secretaria atualizada.'
      if (tipo === 'logo_jels') msg = 'Logo do JELS atualizada.'
      
      notification.success({
        message: 'Upload concluído',
        description: msg,
      })
    } catch (err) {
      notification.error({
        message: 'Erro no upload',
        description: err.message || 'Ocorreu um problema ao enviar o arquivo.',
      })
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
        <p className="m-0 mt-4 font-medium italic">Sincronizando mídias...</p>
      </div>
    )
  }

  return (
    <div className={embedded ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : 'p-4 sm:p-6 lg:px-12 animate-in fade-in duration-500'}>
      {!embedded && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#042f2e] m-0 tracking-tight flex items-center gap-2">
            🎨 Identidade Visual
          </h2>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {/* Helper function to avoid repeat code */}
        {[
          { 
            label: 'Logo Secretaria', 
            tipo: 'logo_secretaria', 
            ref: inputSecretariaRef, 
            uploading: uploadingSecretaria, 
            value: config.logo_secretaria 
          },
          { 
            label: 'Logo JELS', 
            tipo: 'logo_jels', 
            ref: inputJelsRef, 
            uploading: uploadingJels, 
            value: config.logo_jels 
          },
          { 
            label: 'Fundo Credencial', 
            tipo: 'bg_credencial', 
            ref: inputBgCredencialRef, 
            uploading: uploadingBgCredencial, 
            value: config.bg_credencial 
          }
        ].map((item) => (
          <div key={item.tipo} className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm flex flex-col items-center group">
            <h3 className="text-sm font-bold text-[#1e293b] mb-3 w-full text-center truncate uppercase tracking-wider opacity-70">
              {item.label}
            </h3>
            
            <div className="w-full h-32 bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex items-center justify-center overflow-hidden mb-4 relative">
              {item.value ? (
                <img
                  src={getStorageUrl(item.value)}
                  alt={item.label}
                  className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105 duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-30">
                  <ImagePlus className="w-8 h-8" />
                </div>
              )}
            </div>

            <input
              ref={item.ref}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => handleFileChange(item.tipo, e)}
            />
            <button
              type="button"
              disabled={item.uploading}
              onClick={() => item.ref.current?.click()}
              className="w-full py-2 rounded-lg text-xs font-bold bg-[#0f766e] text-white hover:bg-[#0d6961] transition-all disabled:opacity-60 shadow-sm"
            >
              {item.uploading ? '...' : item.value ? 'Alterar' : 'Enviar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

