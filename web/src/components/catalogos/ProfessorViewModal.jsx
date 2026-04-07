import { User, School, Paperclip } from 'lucide-react'
import Modal from '../ui/Modal'
import { professoresTecnicosService } from '../../services/professoresTecnicosService'
import { getStorageUrl } from '../../services/storageService'

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155]">{value ?? '-'}</span>
  </div>
)

export default function ProfessorViewModal({ open, onClose, professor }) {
  if (!professor) return null

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={professor.nome}
      subtitle="Dados do professor-técnico"
      size="lg"
      footer={
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
          onClick={onClose}
        >
          Fechar
        </button>
      }
    >
      <div className="space-y-6">
        {professor.escola_nome && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Instituição</h3>
            </div>
            <InfoRow label="Escola" value={professor.escola_nome} />
          </div>
        )}

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Dados do Professor-Técnico</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Nome" value={professor.nome} />
            <InfoRow label="CPF" value={professoresTecnicosService.formatCpf(professor.cpf)} />
            <InfoRow label="CREF" value={professor.cref} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Documento anexado</span>
              {professor.documentacao_url ? (
                <a
                  href={getStorageUrl(professor.documentacao_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.9375rem] text-[#0f766e] hover:underline"
                >
                  <Paperclip size={14} />
                  Abrir documento
                </a>
              ) : (
                <span className="text-[0.9375rem] text-[#94a3b8]">Não anexado</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
