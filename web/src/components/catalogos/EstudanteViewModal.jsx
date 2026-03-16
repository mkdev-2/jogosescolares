import { useState } from 'react'
import { User, UserCircle, School, FileSignature, Check, X, Pencil, Paperclip, FileText } from 'lucide-react'
import Modal from '../ui/Modal'
import { estudantesService } from '../../services/estudantesService'
import { getStorageUrl } from '../../services/storageService'

const SEXO_LABEL = { M: 'Masculino', F: 'Feminino' }

function DocPreviewCard({ url }) {
  const [imgError, setImgError] = useState(false)
  const isPdf = /\.pdf$/i.test(url || '')
  const fullUrl = getStorageUrl(url)
  const showImg = !isPdf && !imgError

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-col items-center gap-2 no-underline group"
    >
      <div className="w-[104px] h-[104px] rounded-lg border-2 border-[#e2e8f0] overflow-hidden bg-[#f8fafc] flex items-center justify-center hover:border-[#0f766e] transition-colors relative">
        {showImg ? (
          <img
            src={fullUrl}
            alt="Documento assinado"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <FileText size={40} className="text-[#94a3b8] group-hover:text-[#0f766e]" />
        )}
      </div>
      <span className="text-xs font-medium text-[#0f766e] group-hover:underline text-center max-w-[104px] truncate">
        Documento assinado
      </span>
    </a>
  )
}

function formatDate(str) {
  if (!str) return '-'
  try {
    const d = new Date(str)
    return d.toLocaleDateString('pt-BR')
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

export default function EstudanteViewModal({ open, onClose, estudante, onEdit }) {

  if (!estudante) return null

  const fotoOuIcone = estudante.foto_url ? (
    <img
      src={getStorageUrl(estudante.foto_url)}
      alt={estudante.nome}
      className="w-16 h-16 rounded-full object-cover border-2 border-[#e2e8f0]"
    />
  ) : (
    <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center">
      <User size={32} className="text-[#94a3b8]" />
    </div>
  )

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={estudante.nome}
      subtitle="Dados do aluno"
      titleLeft={fotoOuIcone}
      size="xl"
      footer={
        <div className="flex flex-wrap gap-2 justify-end items-center">
          {onEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0f766e] text-white hover:bg-[#0d9488]"
              onClick={() => { onClose(); onEdit(estudante) }}
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
        {estudante.escola_nome && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Instituição</h3>
            </div>
            <InfoRow label="Escola" value={estudante.escola_nome} />
          </div>
        )}

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Dados do Estudante</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Nome" value={estudante.nome} />
            <InfoRow label="CPF" value={estudantesService.formatCpf(estudante.cpf)} />
            <InfoRow label="RG" value={estudante.rg} />
            <InfoRow label="Data de Nascimento" value={formatDate(estudante.data_nascimento)} />
            <InfoRow label="Sexo" value={SEXO_LABEL[estudante.sexo] || estudante.sexo} />
            <InfoRow label="E-mail" value={estudante.email} />
            <InfoRow label="Endereço" value={estudante.endereco} />
            <InfoRow label="CEP" value={estudante.cep} />
            {estudante.numero_registro_confederacao && (
              <InfoRow label="Nº Registro Confederação" value={estudante.numero_registro_confederacao} />
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Responsável</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Nome" value={estudante.responsavel_nome} />
            <InfoRow label="CPF" value={estudantesService.formatCpf(estudante.responsavel_cpf)} />
            <InfoRow label="RG" value={estudante.responsavel_rg} />
            <InfoRow label="Celular" value={estudante.responsavel_celular} />
            <InfoRow label="E-mail" value={estudante.responsavel_email} />
            <InfoRow label="NIS" value={estudante.responsavel_nis} />
          </div>
        </div>

        <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Ficha de Inscrição Individual</h3>
            </div>
            {estudante.documentacao_assinada_url ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <Check className="w-3.5 h-3.5" />
                Ficha anexada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <X className="w-3.5 h-3.5" />
                Ficha não anexada
              </span>
            )}
          </div>
          {(estudante.ficha_assinada || estudante.documentacao_assinada_url) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#334155]">
                {estudante.ficha_assinada ? <Check className="w-4 h-4 text-[#0f766e]" /> : <X className="w-4 h-4 text-[#94a3b8]" />}
                <span>Assinaturas de Médico, Aluno, Responsável e Escola coletadas</span>
              </div>
            </div>
          )}
          {estudante.documentacao_assinada_url ? (
            <DocPreviewCard url={estudante.documentacao_assinada_url} />
          ) : onEdit && (
            <button
              type="button"
              onClick={() => { onClose(); onEdit(estudante, { openAtStep: 2 }) }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f0fdfa] text-[#0f766e] border border-[#0f766e]/30 hover:bg-[#ccfbf1] transition-colors"
            >
              <Paperclip size={14} />
              Anexar Ficha
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
