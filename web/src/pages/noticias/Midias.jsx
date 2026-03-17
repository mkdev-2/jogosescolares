import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, ImagePlus, Trash2, Plus } from 'lucide-react'
import { notification, Modal, Empty } from 'antd'
import { configuracoesService } from '../../services/configuracoesService'
import { uploadLogoMidias, uploadBannerHero, getStorageUrl } from '../../services/storageService'

const ACCEPT_IMAGES = 'image/png,image/jpeg,image/jpg,image/webp'

export default function Midias({ embedded }) {
  const [config, setConfig] = useState({ 
    logo_secretaria: null, 
    logo_jels: null, 
    bg_credencial: null,
    banners_hero: [] 
  })
  const [loading, setLoading] = useState(true)
  const [uploadingSecretaria, setUploadingSecretaria] = useState(false)
  const [uploadingJels, setUploadingJels] = useState(false)
  const [uploadingBgCredencial, setUploadingBgCredencial] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  
  const inputSecretariaRef = useRef(null)
  const inputJelsRef = useRef(null)
  const inputBgCredencialRef = useRef(null)
  const inputBannerRef = useRef(null)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await configuracoesService.get()
      // Banners são armazenados como string separada por vírgula no banco
      const bannersStr = data?.banners_hero || ''
      const banners = bannersStr.split(',').filter(b => !!b.trim())
      
      setConfig({
        logo_secretaria: data?.logo_secretaria ?? null,
        logo_jels: data?.logo_jels ?? null,
        bg_credencial: data?.bg_credencial ?? null,
        banners_hero: banners,
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

    if (tipo === 'banners_hero') {
      setUploadingBanner(true)
      try {
        const path = await uploadBannerHero(file)
        const newBanners = [...config.banners_hero, path]
        await configuracoesService.updateLogos({ banners_hero: newBanners.join(',') })
        setConfig(prev => ({ ...prev, banners_hero: newBanners }))
        notification.success({ message: 'Banner adicionado com sucesso.' })
      } catch (err) {
        notification.error({ message: 'Erro ao subir banner', description: err.message })
      } finally {
        setUploadingBanner(false)
      }
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

  const handleDeleteBanner = (path) => {
    Modal.confirm({
      title: 'Remover Banner?',
      content: 'Esta imagem deixará de ser exibida no carrossel da página inicial.',
      okText: 'Sim, Remover',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const newBanners = config.banners_hero.filter(b => b !== path)
          await configuracoesService.updateLogos({ banners_hero: newBanners.join(',') })
          setConfig(prev => ({ ...prev, banners_hero: newBanners }))
          notification.success({ message: 'Banner removido.' })
        } catch (err) {
          notification.error({ message: 'Erro ao remover', description: err.message })
        }
      }
    })
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

      {/* Logos e Fundo Section */}
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Logos e Base</h3>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 mb-10">
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
            <h4 className="text-[10px] font-black text-[#1e293b] mb-3 w-full text-center truncate uppercase tracking-widest opacity-60">
              {item.label}
            </h4>
            
            <div className="w-full h-32 bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex items-center justify-center overflow-hidden mb-4 relative">
              {item.value ? (
                <img
                  src={getStorageUrl(item.value)}
                  alt={item.label}
                  className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105 duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-20">
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
              className="w-full py-2.5 rounded-lg text-xs font-black bg-slate-50 text-slate-600 border border-slate-200 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-60 shadow-sm uppercase tracking-wider"
            >
              {item.uploading ? '...' : item.value ? 'Alterar' : 'Enviar'}
            </button>
          </div>
        ))}
      </div>

      {/* Banners Section */}
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
        Banners do Carrossel (Home)
        <button 
          onClick={() => inputBannerRef.current?.click()}
          disabled={uploadingBanner}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
        >
          {uploadingBanner ? 'SUBINDO...' : <><Plus size={14} /> NOVO BANNER</>}
        </button>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <input 
          ref={inputBannerRef}
          type="file"
          accept={ACCEPT_IMAGES}
          className="hidden"
          onChange={(e) => handleFileChange('banners_hero', e)}
        />
        
        {config.banners_hero.length > 0 ? (
          config.banners_hero.map((path, idx) => (
            <div key={path} className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white aspect-[1900/460] md:aspect-[16/9] lg:aspect-[1900/460]">
               <img 
                 src={getStorageUrl(path)} 
                 alt={`Banner ${idx + 1}`} 
                 className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
               />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    onClick={() => handleDeleteBanner(path)}
                    className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all transform hover:scale-110 shadow-lg"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>
               <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/30 text-[10px] font-black text-white text-white/90 backdrop-blur-sm">
                  #{idx + 1}
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
             <ImageIcon size={48} className="opacity-20 mb-3" />
             <p className="font-bold text-sm m-0">Nenhum banner configurado.</p>
             <p className="text-xs m-0">Os banners aparecerão no topo da página institucional.</p>
          </div>
        )}
      </div>
    </div>
  )
}

