import { useState } from 'react'
import { Alert } from 'antd'
import useEstudantes from '../hooks/useEstudantes'
import usePrazoCadastroAlunos from '../hooks/usePrazoCadastroAlunos'
import EstudantesList from '../components/catalogos/EstudantesList'
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'
import CredencialCrachaPrint from '../components/catalogos/CredencialCrachaPrint'
import FichaIndividualPrint from '../components/catalogos/FichaIndividualPrint'
import Modal from '../components/ui/Modal'
import { estudantesService } from '../services/estudantesService'

export default function CadastroEstudanteAtleta() {
  const { lista, loading, error, fetchEstudantes } = useEstudantes()
  const { bloqueado: cadastroAlunosBloqueado } = usePrazoCadastroAlunos()
  const [modalOpen, setModalOpen] = useState(false)
  const [estudanteParaCredencial, setEstudanteParaCredencial] = useState(null)
  const [fichaIndividualOpen, setFichaIndividualOpen] = useState(false)
  const [fichaIndividualDados, setFichaIndividualDados] = useState(null)
  const [fichaIndividualLoading, setFichaIndividualLoading] = useState(false)

  const handleNewAluno = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    fetchEstudantes()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Estudantes
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Alunos cadastrados da sua escola
        </p>
      </header>

      {cadastroAlunosBloqueado && (
        <Alert
          type="warning"
          message="Prazo encerrado"
          description="O prazo para cadastro de novos alunos foi encerrado. Não é possível incluir novos estudantes-atletas."
          showIcon
        />
      )}

      <div className="flex-1">
        <EstudantesList
          lista={lista}
          loading={loading}
          error={error}
          onNewAluno={cadastroAlunosBloqueado ? undefined : handleNewAluno}
          onGerarCredencial={(item) => setEstudanteParaCredencial(item)}
          onFichaIndividual={async (item) => {
            setFichaIndividualOpen(true)
            setFichaIndividualDados(null)
            setFichaIndividualLoading(true)
            try {
              const full = await estudantesService.getById(item.id)
              const modalidades = await estudantesService.getModalidades(item.id)
              const modalidade = Array.isArray(modalidades) && modalidades.length > 0
                ? `${modalidades[0].esporte_nome || ''} • ${modalidades[0].categoria_nome || ''} • ${modalidades[0].naipe_nome || ''}`.trim()
                : '—'
              setFichaIndividualDados({
                estudante: full,
                responsavel: {
                  nome: full?.responsavel_nome,
                  cpf: estudantesService.formatCpf(full?.responsavel_cpf),
                  rg: full?.responsavel_rg,
                  celular: full?.responsavel_celular,
                  email: full?.responsavel_email,
                  nis: full?.responsavel_nis,
                },
                modalidade,
              })
            } catch (err) {
              setFichaIndividualOpen(false)
              alert(err.message || 'Erro ao carregar dados da ficha individual.')
            } finally {
              setFichaIndividualLoading(false)
            }
          }}
        />
      </div>

      <Modal
        isOpen={!!estudanteParaCredencial}
        onClose={() => setEstudanteParaCredencial(null)}
        title="Credencial / Crachá"
        subtitle={estudanteParaCredencial?.nome}
        size="md"
        footer={null}
      >
        <div className="overflow-y-auto max-h-[70vh] px-6 py-4">
          {estudanteParaCredencial && (
            <CredencialCrachaPrint
              estudante={estudanteParaCredencial}
              onClose={() => setEstudanteParaCredencial(null)}
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={fichaIndividualOpen}
        onClose={() => { setFichaIndividualOpen(false); setFichaIndividualDados(null) }}
        title="Ficha Individual – JELS"
        subtitle={fichaIndividualDados?.estudante?.nome}
        size="xl"
        footer={null}
      >
        <div className="overflow-y-auto max-h-[70vh] px-6 py-4">
          {fichaIndividualLoading && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
            </div>
          )}
          {!fichaIndividualLoading && fichaIndividualDados && (
            <FichaIndividualPrint
              dados={fichaIndividualDados}
              onClose={() => { setFichaIndividualOpen(false); setFichaIndividualDados(null) }}
            />
          )}
        </div>
      </Modal>

      <EstudanteAtletaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
