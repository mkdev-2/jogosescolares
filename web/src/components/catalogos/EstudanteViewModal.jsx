import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, UserCircle, School, FileSignature, Check, X, Pencil, Paperclip, FileText, ShieldCheck, ShieldOff, ZoomIn } from 'lucide-react'
import Modal from '../ui/Modal'
import { estudantesService } from '../../services/estudantesService'
import { fetchStorageBlob } from '../../services/storageService'
import StorageImage from '../StorageImage'
import { useAuth } from '../../contexts/AuthContext'
import { message } from 'antd'

const SEXO_LABEL = { M: 'Masculino', F: 'Feminino' }

function DocPreviewCard({ url, label = 'Documento' }) {
  const [previewSrc, setPreviewSrc] = useState(null)
  const [imgError, setImgError] = useState(false)
  const isPdf = /\.pdf$/i.test(url || '')
  const showImg = !isPdf && !imgError && previewSrc

  useEffect(() => {
    setImgError(false)
    if (!url || isPdf) {
      setPreviewSrc(null)
      return
    }
    let cancelled = false
    const blobUrlRef = { current: null }
    ;(async () => {
      try {
        const blob = await fetchStorageBlob(url)
        if (cancelled) return
        blobUrlRef.current = URL.createObjectURL(blob)
        setPreviewSrc(blobUrlRef.current)
      } catch {
        setImgError(true)
      }
    })()
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [url, isPdf])

  const handleOpen = async (e) => {
    e.preventDefault()
    if (!url) return
    try {
      const blob = await fetchStorageBlob(url)
      const u = URL.createObjectURL(blob)
      window.open(u, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(u), 120000)
    } catch {
      setImgError(true)
    }
  }

  return (
    <a
      href="#"
      onClick={handleOpen}
      className="inline-flex flex-col items-center gap-2 no-underline group cursor-pointer"
    >
      <div className="w-[104px] h-[104px] rounded-lg border-2 border-[#e2e8f0] overflow-hidden bg-[#f8fafc] flex items-center justify-center hover:border-[#0f766e] transition-colors relative">
        {showImg ? (
          <img
            src={previewSrc}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText size={40} className="text-[#94a3b8] group-hover:text-[#0f766e]" />
        )}
      </div>
      <span className="text-xs font-medium text-[#0f766e] group-hover:underline text-center max-w-[104px] truncate">
        {label}
      </span>
    </a>
  )
}

function formatDate(str) {
  if (!str) return '-'
  try {
    const [year, month, day] = str.split('-')
    return new Date(+year, +month - 1, +day).toLocaleDateString('pt-BR')
  } catch {
    return str
  }
}

function formatDateTime(str) {
  if (!str) return '-'
  try {
    const d = new Date(str)
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return str
  }
}

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155]">{value ?? '-'}</span>
  </div>
)

export default function EstudanteViewModal({ open, onClose, estudante, onEdit, onUpdate }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const [validando, setValidando] = useState(false)
  const [dadosEstudante, setDadosEstudante] = useState(null)
  const [fotoExpandida, setFotoExpandida] = useState(false)

  useEffect(() => {
    if (!fotoExpandida) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        setFotoExpandida(false)
      }
    }
    document.addEventListener('keydown', handleEscape, { capture: true })
    return () => document.removeEventListener('keydown', handleEscape, { capture: true })
  }, [fotoExpandida])

  // Usa o estado local se disponível (após uma validação nesta sessão), senão usa o prop
  const aluno = dadosEstudante || estudante

  if (!aluno) return null

  const handleValidar = async (validado) => {
    setValidando(true)
    try {
      const atualizado = await estudantesService.validarDocumentos(aluno.id, validado)
      setDadosEstudante(atualizado)
      if (onUpdate) onUpdate(atualizado)
      message.success(
        validado
          ? 'Documentos aprovados com sucesso!'
          : 'Validação revogada com sucesso.'
      )
    } catch (err) {
      message.error(err.message || 'Erro ao atualizar validação.')
    } finally {
      setValidando(false)
    }
  }

  const fotoOuIcone = aluno.foto_url ? (
    <button
      type="button"
      onClick={() => setFotoExpandida(true)}
      className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-[#e2e8f0] hover:border-[#0f766e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f766e] shrink-0"
      title="Ver foto ampliada"
    >
      <StorageImage
        path={aluno.foto_url}
        alt={aluno.nome}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ZoomIn size={20} className="text-white" />
      </div>
    </button>
  ) : (
    <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0">
      <User size={32} className="text-[#94a3b8]" />
    </div>
  )

  const documentosValidados = aluno.documentos_validados
  const validadoPor = aluno.documentos_validados_por_nome
  const validadoEm = aluno.documentos_validados_em
  const temFicha = !!aluno.documentacao_assinada_url
  const temRgAluno = !!aluno.documentacao_rg_url

  return (
    <>
    <Modal
      isOpen={open}
      onClose={onClose}
      title={aluno.nome}
      subtitle="Dados do aluno"
      titleLeft={fotoOuIcone}
      size="xl"
      footer={
        <div className="flex flex-wrap gap-2 justify-end items-center">
          {onEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0f766e] text-white hover:bg-[#0d9488]"
              onClick={() => { onClose(); onEdit(aluno) }}
            >
              <Pencil size={16} />
              Editar
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {aluno.escola_nome && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Instituição</h3>
            </div>
            <InfoRow label="Escola" value={aluno.escola_nome} />
          </div>
        )}

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Dados do Estudante</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Nome" value={aluno.nome} />
            <InfoRow label="CPF" value={estudantesService.formatCpf(aluno.cpf)} />
            <InfoRow label="RG" value={aluno.rg} />
            <InfoRow label="Data de Nascimento" value={formatDate(aluno.data_nascimento)} />
            <InfoRow label="Sexo" value={SEXO_LABEL[aluno.sexo] || aluno.sexo} />
            <InfoRow label="Peso" value={aluno.peso != null ? `${aluno.peso} kg` : '-'} />
            <InfoRow label="E-mail" value={aluno.email} />
            <InfoRow label="Endereço" value={aluno.endereco} />
            <InfoRow label="CEP" value={aluno.cep} />
            {aluno.numero_registro_confederacao && (
              <InfoRow label="Nº Registro Confederação" value={aluno.numero_registro_confederacao} />
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Responsável</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Nome" value={aluno.responsavel_nome} />
            <InfoRow label="CPF" value={estudantesService.formatCpf(aluno.responsavel_cpf)} />
            <InfoRow label="RG" value={aluno.responsavel_rg} />
            <InfoRow label="Celular" value={aluno.responsavel_celular} />
            <InfoRow label="E-mail" value={aluno.responsavel_email} />
            <InfoRow label="NIS" value={aluno.responsavel_nis} />
          </div>
        </div>

        {/* ── Ficha de Inscrição ── */}
        <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
          {/* Cabeçalho da seção com status de ficha e controle de validação */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Título + status de anexo */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#64748b]" />
                <h3 className="text-sm font-semibold text-[#042f2e] m-0">Ficha de Inscrição Individual</h3>
              </div>
              {temFicha ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 w-fit">
                  <Check className="w-3 h-3" />
                  Documento assinado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 w-fit">
                  <X className="w-3 h-3" />
                  Assinatura pendente
                </span>
              )}
            </div>

            {/* Controle de validação — lado direito, somente ADMIN e com ficha */}
            {isAdmin && temFicha && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                {/* Checkbox compacta */}
                <label
                  className={`flex items-center gap-2 cursor-pointer select-none group px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${documentosValidados
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:border-[#0f766e]/40 hover:bg-[#f0fdfa]'
                    } ${validando ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={documentosValidados}
                      disabled={validando}
                      onChange={(e) => handleValidar(e.target.checked)}
                    />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${documentosValidados
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-[#cbd5e1] group-hover:border-[#0f766e]'
                      }`}>
                      {documentosValidados && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <span>
                    {validando ? 'Salvando...' : documentosValidados ? 'Documentos aprovados' : 'Aprovar documentos'}
                  </span>
                  {documentosValidados && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                </label>

                {/* Info de validação ou botão revogar */}
                {documentosValidados ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#64748b]">
                      por <strong className="text-[#334155]">{validadoPor || 'Administrador'}</strong>
                      {validadoEm && <> em {formatDateTime(validadoEm)}</>}
                    </span>
                    <button
                      type="button"
                      disabled={validando}
                      onClick={() => handleValidar(false)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Revogar validação"
                    >
                      <ShieldOff size={10} />
                      Revogar
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#94a3b8]">A ficha anexada ainda precisa ser validada por um Administrador para que o estudante possa participar dos jogos.</span>
                )}
              </div>
            )}

            {/* Badge de validação para não-admins (somente leitura) */}
            {!isAdmin && documentosValidados && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800">
                  Doc. validados por <strong>{validadoPor || 'Admin'}</strong>
                  {validadoEm && <> em {formatDateTime(validadoEm)}</>}
                </span>
              </div>
            )}
          </div>

          {/* Indicador de status de assinatura */}
          {(aluno.ficha_assinada || temFicha) && (
            <div className="flex items-center gap-2 text-sm text-[#334155]">
              {aluno.ficha_assinada ? <Check className="w-4 h-4 text-[#0f766e]" /> : <X className="w-4 h-4 text-[#94a3b8]" />}
              <span>Documento assinado</span>
            </div>
          )}

          {/* Preview dos anexos */}
          <div className="flex flex-wrap gap-4">
            {temFicha ? (
              <DocPreviewCard url={aluno.documentacao_assinada_url} label="Documento assinado" />
            ) : onEdit && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(aluno, { openAtStep: 2 }) }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f0fdfa] text-[#0f766e] border border-[#0f766e]/30 hover:bg-[#ccfbf1] transition-colors"
              >
                <Paperclip size={14} />
                Anexar Ficha
              </button>
            )}
            {temRgAluno ? (
              <DocPreviewCard url={aluno.documentacao_rg_url} label="RG do aluno" />
            ) : (
              <span className="text-sm text-[#94a3b8] self-center">RG do aluno não anexado</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
    {fotoExpandida && aluno.foto_url && createPortal(
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1200] p-6"
        onClick={() => setFotoExpandida(false)}
      >
        <div
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black/10"
            style={{ width: 'min(520px, 90vw)', height: 'min(520px, 80vh)' }}
          >
            <StorageImage
              path={aluno.foto_url}
              alt={aluno.nome}
              className="w-full h-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setFotoExpandida(false)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[#334155] hover:bg-white hover:text-[#042f2e] transition-colors text-xl leading-none"
            aria-label="Fechar foto"
          >
            ×
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}

