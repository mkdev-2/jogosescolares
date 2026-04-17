import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, ImagePlus, User, Medal, Move, Save, Trash2 } from 'lucide-react'
import { notification, Button, Spin, Popconfirm } from 'antd'
import { motion } from 'framer-motion'
import { configuracoesService } from '../../services/configuracoesService'
import { uploadLogoMidias, fetchStorageBlob } from '../../services/storageService'
import StorageImage from '../../components/StorageImage'

const ACCEPT_IMAGES = 'image/png,image/jpeg,image/jpg,image/webp'

export default function Midias({ embedded }) {
  const [config, setConfig] = useState({
    logo_secretaria: null,
    logo_jels: null,
    bg_credencial: null,
    bg_verso_credencial: null,
    layout_credencial: {}
  })
  const [loading, setLoading] = useState(true)
  const [savingLayout, setSavingLayout] = useState(false)
  const [assetsBase64, setAssetsBase64] = useState({ logo: null, bg: null })

  const [uploadingSecretaria, setUploadingSecretaria] = useState(false)
  const [uploadingJels, setUploadingJels] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingVerso, setUploadingVerso] = useState(false)
  
  const inputSecretariaRef = useRef(null)
  const inputJelsRef = useRef(null)
  const inputBgRef = useRef(null)
  const inputVersoRef = useRef(null)
  const previewRef = useRef(null)

  const PX_TO_MM = 3.2

  const defaultPositions = {
    foto: { x: 102.4, y: 54.4, size: 115.2 },
    logos: { x: 80, y: 179.2, w: 160, h: 32 },
    nome: { x: 0, y: 249.6, fontSize: 24 },
    info: { x: 0, y: 294.4, fontSize: 12 },
    modalidades: { x: 32, y: 336, w: 256, h: 70.4, fontSize: 20 }
  }

  const [positions, setPositions] = useState(defaultPositions)

  const loadAssetAsBase64 = async (path) => {
    if (!path) return null
    try {
      const blob = await fetchStorageBlob(path)
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch { return null }
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await configuracoesService.getNoCache()
      const layoutStr = data?.layout_credencial
      let layoutJson = {}
      try {
        layoutJson = typeof layoutStr === 'string' ? JSON.parse(layoutStr) : (layoutStr || {})
      } catch (e) { layoutJson = {} }

      setConfig({
        logo_secretaria: data?.logo_secretaria ?? null,
        logo_jels: data?.logo_jels ?? null,
        bg_credencial: data?.bg_credencial ?? null,
        bg_verso_credencial: data?.bg_verso_credencial ?? null,
        layout_credencial: layoutJson
      })

      if (layoutJson && Object.keys(layoutJson).length > 0) {
        const pts = {}
        Object.keys(layoutJson).forEach(key => {
          const item = layoutJson[key]
          pts[key] = {
            ...item,
            x: item.x * PX_TO_MM,
            y: item.y * PX_TO_MM,
            size: item.size ? item.size * PX_TO_MM : undefined,
            w: item.w ? item.w * PX_TO_MM : undefined,
            h: item.h ? item.h * PX_TO_MM : undefined,
            fontSize: item.fontSize
          }
        })
        setPositions(pts)
      }

      const [bgB64, logoB64] = await Promise.all([
        data?.bg_credencial ? loadAssetAsBase64(data.bg_credencial) : null,
        data?.logo_jels ? loadAssetAsBase64(data.logo_jels) : null
      ])
      setAssetsBase64({ bg: bgB64, logo: logoB64 })

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfig() }, [])

  const handleUpload = async (tipo, file) => {
    const setters = {
      logo_secretaria: setUploadingSecretaria,
      logo_jels: setUploadingJels,
      bg_credencial: setUploadingBg,
      bg_verso_credencial: setUploadingVerso
    }
    const setUploading = setters[tipo]

    setUploading(true)
    try {
      const path = await uploadLogoMidias(file, tipo)
      await configuracoesService.update({ [tipo]: path }) 
      await loadConfig()
      notification.success({ message: 'Upload concluído' })
    } catch (err) {
      notification.error({ message: 'Erro no upload', description: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (tipo) => {
    try {
      await configuracoesService.update({ [tipo]: null })
      await loadConfig()
      notification.success({ message: 'Imagem removida' })
    } catch (err) {
      notification.error({ message: 'Erro ao remover imagem' })
    }
  }

  const handleSaveLayout = async () => {
    setSavingLayout(true)
    try {
      const layoutToSave = {}
      Object.keys(positions).forEach(key => {
        const item = positions[key]
        layoutToSave[key] = {
          x: item.x / PX_TO_MM,
          y: item.y / PX_TO_MM,
          size: item.size ? item.size / PX_TO_MM : undefined,
          w: item.w ? item.w / PX_TO_MM : undefined,
          h: item.h ? item.h / PX_TO_MM : undefined,
          fontSize: item.fontSize
        }
      })
      await configuracoesService.update({ layout_credencial: JSON.stringify(layoutToSave) })
      notification.success({ message: 'Layout salvo com sucesso!' })
    } catch (err) {
      notification.error({ message: 'Erro ao salvar layout', description: err.message })
    } finally {
      setSavingLayout(false)
    }
  }

  const handleDragEnd = (key, info) => {
    setPositions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        x: prev[key].x + info.offset.x,
        y: prev[key].y + info.offset.y
      }
    }))
  }

  const handleResize = (key, delta, type) => {
    setPositions(prev => {
      const current = prev[key]
      const next = { ...current }
      if (type === 'size') next.size = Math.max(30, current.size + delta)
      if (type === 'w') next.w = Math.max(40, current.w + delta)
      if (type === 'h') next.h = Math.max(10, current.h + delta)
      if (type === 'both') {
        next.w = Math.max(40, current.w + delta.x)
        next.h = Math.max(10, current.h + delta.y)
      }
      if (type === 'fontSize') next.fontSize = Math.max(8, current.fontSize + (delta / 4))
      return { ...prev, [key]: next }
    })
  }

  const ResizeHandle = ({ elementKey, type = 'size' }) => (
    <motion.div
      drag dragMomentum={false} dragElastic={0}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDrag={(_, info) => {
        if (type === 'both') handleResize(elementKey, { x: info.delta.x, y: info.delta.y }, 'both')
        else handleResize(elementKey, type === 'fontSize' ? -info.delta.y : info.delta.x, type)
      }}
      className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 rounded-full border-2 border-white cursor-nwse-resize z-[100] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
    >
      <Move size={14} className="text-white" />
    </motion.div>
  )

  if (loading) return <div className="flex flex-col items-center justify-center py-20"><Spin size="large" /><p className="mt-4 text-slate-400 italic">Sincronizando layout...</p></div>

  return (
    <div className={embedded ? 'animate-in' : 'p-4 sm:p-6 lg:px-12 animate-in'}>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-10">
        {[
          { label: 'Logo Secretaria', tipo: 'logo_secretaria', ref: inputSecretariaRef, uploading: uploadingSecretaria, value: config.logo_secretaria },
          { label: 'Logo JELS', tipo: 'logo_jels', ref: inputJelsRef, uploading: uploadingJels, value: config.logo_jels },
          { label: 'Credencial (Frente)', tipo: 'bg_credencial', ref: inputBgRef, uploading: uploadingBg, value: config.bg_credencial },
          { label: 'Credencial (Verso)', tipo: 'bg_verso_credencial', ref: inputVersoRef, uploading: uploadingVerso, value: config.bg_verso_credencial },
        ].map((item) => (
          <div key={item.tipo} className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm flex flex-col items-center group relative overflow-visible">
            <h4 className="text-[10px] font-black text-[#1e293b] mb-3 w-full text-center uppercase tracking-widest opacity-60">{item.label}</h4>
            
            <div className="w-full h-32 bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1] flex items-center justify-center overflow-hidden mb-4 relative group/img">
              {item.value ? (
                <>
                  <StorageImage path={item.value} className="w-full h-full object-contain p-2" />
                  <Popconfirm
                    title="Remover imagem?"
                    description="Esta ação deixará a configuração vazia."
                    onConfirm={() => handleRemove(item.tipo)}
                    okText="Sim, remover"
                    cancelText="Cancelar"
                    placement="topRight"
                  >
                    <button className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-600 z-50">
                      <Trash2 size={14} />
                    </button>
                  </Popconfirm>
                </>
              ) : (
                <ImagePlus className="w-8 h-8 opacity-20" />
              )}
            </div>

            <input ref={item.ref} type="file" accept={ACCEPT_IMAGES} className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]; if (file) handleUpload(item.tipo, file); e.target.value = ''
            }} />
            <button type="button" disabled={item.uploading} onClick={() => item.ref.current?.click()} className="w-full py-2.5 rounded-lg text-xs font-black bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-60 uppercase tracking-wider">
              {item.uploading ? '...' : item.value ? 'Alterar' : 'Enviar'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.15em] mb-10 flex items-center gap-2">
          <ImageIcon size={16} /> Éditor de Layout (Arraste e Redimensione)
        </h3>

        <div className="flex flex-col lg:flex-row gap-12 items-start justify-center w-full">
          <div ref={previewRef} className="shrink-0 relative bg-[#f8fafc] shadow-2xl rounded-sm border border-slate-300 select-none overflow-hidden" style={{ width: '320px', height: '480px' }}>
            {assetsBase64.bg && <div className="absolute inset-0 pointer-events-none"><img src={assetsBase64.bg} className="w-full h-full object-cover" /></div>}
            {!assetsBase64.bg && (
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                <div className="h-[10.7%] bg-[#0f766e] flex items-center justify-center"><MedalIcon className="text-white opacity-40" size={36} /></div>
                <div className="flex-1 bg-white" /><div className="h-[1.3%] bg-[#0f766e]" />
              </div>
            )}

            <motion.div
              key={`foto-${positions.foto.x}-${positions.foto.y}`}
              className="absolute cursor-grab active:cursor-grabbing z-20"
              drag dragMomentum={false} dragElastic={0}
              onDragEnd={(_, info) => handleDragEnd('foto', info)}
              style={{ left: positions.foto.x, top: positions.foto.y }}
            >
              <div className="rounded-full border-[5px] border-[#3b82f6] bg-white flex items-center justify-center overflow-hidden shadow-lg" style={{ width: positions.foto.size, height: positions.foto.size }}>
                <User size={positions.foto.size * 0.5} className="text-slate-200" />
              </div>
              <ResizeHandle elementKey="foto" />
            </motion.div>

            <motion.div
              key={`logos-${positions.logos.x}-${positions.logos.y}`}
              className="absolute cursor-grab active:cursor-grabbing z-20 flex items-center justify-center"
              drag dragMomentum={false} dragElastic={0}
              onDragEnd={(_, info) => handleDragEnd('logos', info)}
              style={{ left: positions.logos.x, top: positions.logos.y, width: positions.logos.w, height: positions.logos.h }}
            >
              <div className="w-full h-full flex items-center justify-center px-3 py-1 rounded bg-white/40 backdrop-blur-sm border border-dashed border-blue-400/30">
                {assetsBase64.logo ? <img src={assetsBase64.logo} className="max-w-full max-h-full object-contain pointer-events-none" /> : <div className="text-[10px] italic text-slate-400">Logo JELS</div>}
                <ResizeHandle elementKey="logos" type="both" />
              </div>
            </motion.div>

            <motion.div
              key={`nome-${positions.nome.x}-${positions.nome.y}`}
              className="absolute cursor-grab active:cursor-grabbing z-20 w-full"
              drag dragMomentum={false} dragElastic={0}
              onDragEnd={(_, info) => handleDragEnd('nome', info)}
              style={{ left: positions.nome.x, top: positions.nome.y }}
            >
              <div className="font-black leading-none text-white drop-shadow-md uppercase text-center p-2" style={{ fontSize: positions.nome.fontSize, fontFamily: "'Sora', sans-serif" }}>
                NOME DO ESTUDANTE
                <ResizeHandle elementKey="nome" type="fontSize" />
              </div>
            </motion.div>

            <motion.div
              key={`info-${positions.info.x}-${positions.info.y}`}
              className="absolute cursor-grab active:cursor-grabbing z-20 w-full"
              drag dragMomentum={false} dragElastic={0}
              onDragEnd={(_, info) => handleDragEnd('info', info)}
              style={{ left: positions.info.x, top: positions.info.y }}
            >
              <div className="text-white drop-shadow-md text-center p-2" style={{ fontSize: positions.info.fontSize, fontFamily: "'Lato', sans-serif" }}>
                <div className="font-bold border-b border-white/20 pb-0.5 mb-0.5">Escola Municipal Fictícia</div>
                <div className="font-medium opacity-100">10/10/2010</div>
                <ResizeHandle elementKey="info" type="fontSize" />
              </div>
            </motion.div>

            <motion.div
              key={`modalidades-${positions.modalidades.x}-${positions.modalidades.y}`}
              className="absolute cursor-grab active:cursor-grabbing z-20"
              drag dragMomentum={false} dragElastic={0}
              onDragEnd={(_, info) => handleDragEnd('modalidades', info)}
              style={{ left: positions.modalidades.x, top: positions.modalidades.y, width: positions.modalidades.w, height: positions.modalidades.h }}
            >
              <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                        <div className="text-[#1d4ed8] font-black leading-none" style={{ fontSize: positions.modalidades.fontSize, fontFamily: "'Sora', sans-serif" }}>FUTSAL</div>
                        <div className="h-1" />
                        <div className="text-[#1d4ed8] font-black leading-none" style={{ fontSize: positions.modalidades.fontSize, fontFamily: "'Sora', sans-serif" }}>JUDÔ</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <ResizeHandle elementKey="modalidades" type="both" />
              </div>
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 h-3 flex pointer-events-none">
              <div className="flex-1 bg-yellow-400" /><div className="flex-1 bg-blue-600" /><div className="flex-1 bg-green-600" /><div className="flex-1 bg-red-600" /><div className="flex-1 bg-orange-500" />
            </div>
          </div>

          <div className="flex-1 max-w-sm bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
            <h4 className="text-slate-900 font-black mb-6 flex items-center gap-2 uppercase tracking-tight"><Move className="w-5 h-5 text-emerald-600" /> Ajuste de Layout</h4>
            <ul className="space-y-4 text-[11px] text-slate-500 p-0 m-0 list-none mb-10">
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><span>Arraste os elementos para as posições desejadas na frente.</span></li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><span>Use as <b>bolas azuis</b> para mudar o tamanho.</span></li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><span>O verso será uma imagem estática preenchendo o fundo.</span></li>
            </ul>

            <Button type="primary" size="large" icon={<Save size={20} />} loading={savingLayout} onClick={handleSaveLayout} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 border-none shadow-xl shadow-emerald-700/20 font-black rounded-2xl uppercase tracking-widest">
              SALVAR POSICIONAMENTO
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
