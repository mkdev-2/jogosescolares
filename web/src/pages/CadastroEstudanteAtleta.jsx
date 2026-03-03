import { useState } from 'react'
import useEstudantes from '../hooks/useEstudantes'
import EstudantesList from '../components/catalogos/EstudantesList'
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'

export default function CadastroEstudanteAtleta() {
  const { lista, loading, error, fetchEstudantes } = useEstudantes()
  const [modalOpen, setModalOpen] = useState(false)

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

      <div className="flex-1">
        <EstudantesList
          lista={lista}
          loading={loading}
          error={error}
          onNewAluno={handleNewAluno}
        />
      </div>

      <EstudanteAtletaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
