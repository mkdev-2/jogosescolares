import { Trophy, User, Users, School } from 'lucide-react'
import Modal from '../ui/Modal'
import ModalidadeIcon from './ModalidadeIcon'
import { estudantesService } from '../../services/estudantesService'

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155]">{value ?? '-'}</span>
  </div>
)

const InfoRowEsporte = ({ label, nome, icone }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155] inline-flex items-center gap-2">
      <ModalidadeIcon icone={icone || 'Zap'} size={18} className="text-[#0f766e] shrink-0" />
      {nome ?? '-'}
    </span>
  </div>
)

export default function EquipeViewModal({ open, onClose, equipe }) {
  if (!equipe) return null

  const varianteLabel = [equipe.esporte_nome, equipe.categoria_nome, equipe.naipe_nome, equipe.tipo_modalidade_nome]
    .filter(Boolean)
    .join(' • ')

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <ModalidadeIcon icone={equipe.esporte_icone || 'Zap'} size={22} className="text-[#0f766e] shrink-0" />
          {equipe.esporte_nome || 'Equipe'}
        </span>
      }
      subtitle={varianteLabel}
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
        {equipe.escola_nome && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Instituição</h3>
            </div>
            <InfoRow label="Escola" value={equipe.escola_nome} />
          </div>
        )}

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Modalidade</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRowEsporte label="Esporte" nome={equipe.esporte_nome} icone={equipe.esporte_icone} />
            <InfoRow label="Categoria" value={equipe.categoria_nome} />
            <InfoRow label="Naipe" value={equipe.naipe_nome} />
            <InfoRow label="Tipo" value={equipe.tipo_modalidade_nome} />
          </div>
        </div>

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">Comissão Técnica</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Técnico" value={equipe.professor_tecnico_nome} />
            {equipe.professor_auxiliar_nome && (
              <InfoRow label="Auxiliar" value={equipe.professor_auxiliar_nome} />
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#64748b]" />
            <h3 className="text-sm font-semibold text-[#042f2e] m-0">
              Alunos ({equipe.estudantes?.length ?? 0})
            </h3>
          </div>
          {equipe.estudantes?.length > 0 ? (
            <ul className="list-none m-0 p-0 space-y-2">
              {equipe.estudantes.map((est) => (
                <li
                  key={est.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <span className="text-[0.9375rem] font-medium text-[#334155]">{est.nome}</span>
                  <span className="text-xs font-mono text-[#64748b]">
                    {estudantesService.formatCpf(est.cpf)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748b] m-0">Nenhum aluno vinculado.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
