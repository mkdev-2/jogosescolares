import { useState } from 'react'
import useEquipes from '../hooks/useEquipes'
import useEstudantes from '../hooks/useEstudantes'
import useProfessoresTecnicos from '../hooks/useProfessoresTecnicos'
import useModalidades from '../hooks/useModalidades'
import useCategorias from '../hooks/useCategorias'
import EquipesList from '../components/catalogos/EquipesList'
import EquipeModal from '../components/catalogos/EquipeModal'

export default function Equipes() {
  const { lista, loading, error, fetchLista } = useEquipes()
  const { lista: estudantes } = useEstudantes()
  const { lista: professoresTecnicos } = useProfessoresTecnicos()
  const { modalidades } = useModalidades()
  const { categorias } = useCategorias()
  const [modalOpen, setModalOpen] = useState(false)

  const handleNewEquipe = () => {
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
          Equipes
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Monte equipes por modalidade e categoria, vinculando alunos e professor-técnico.
        </p>
      </header>

      <div className="flex-1">
        <EquipesList
          lista={lista}
          loading={loading}
          error={error}
          onNewEquipe={handleNewEquipe}
        />
      </div>

      <EquipeModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        modalidades={modalidades}
        categorias={categorias}
        estudantes={estudantes}
        professoresTecnicos={professoresTecnicos}
      />
    </div>
  )
}
