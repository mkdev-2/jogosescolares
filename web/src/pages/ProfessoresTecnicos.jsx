import { useState } from 'react'
import useProfessoresTecnicos from '../hooks/useProfessoresTecnicos'
import ProfessoresTecnicosList from '../components/catalogos/ProfessoresTecnicosList'
import ProfessorTecnicoModal from '../components/catalogos/ProfessorTecnicoModal'

export default function ProfessoresTecnicos() {
  const { lista, loading, error, fetchLista } = useProfessoresTecnicos()
  const [modalOpen, setModalOpen] = useState(false)

  const handleNewProfessor = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    fetchLista()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Professores-Técnicos
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Cadastre professores e auxiliares técnicos para vincular às equipes.
        </p>
      </header>

      <div className="flex-1">
        <ProfessoresTecnicosList
          lista={lista}
          loading={loading}
          error={error}
          onNewProfessor={handleNewProfessor}
        />
      </div>

      <ProfessorTecnicoModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
