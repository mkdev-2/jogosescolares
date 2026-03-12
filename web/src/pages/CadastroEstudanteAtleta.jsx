import { useState } from 'react'
import { Alert } from 'antd'
import useEstudantes from '../hooks/useEstudantes'
import usePrazoCadastroAlunos from '../hooks/usePrazoCadastroAlunos'
import EstudantesList from '../components/catalogos/EstudantesList'
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'
import CredencialCrachaPrint from '../components/catalogos/CredencialCrachaPrint'
import Modal from '../components/ui/Modal'

export default function CadastroEstudanteAtleta() {
  const { lista, loading, error, fetchEstudantes } = useEstudantes()
  const { bloqueado: cadastroAlunosBloqueado } = usePrazoCadastroAlunos()
  const [modalOpen, setModalOpen] = useState(false)
  const [estudanteParaCredencial, setEstudanteParaCredencial] = useState(null)

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

      <EstudanteAtletaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
