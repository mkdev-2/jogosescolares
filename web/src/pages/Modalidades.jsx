import { useState } from 'react'
import ModalidadesList from '../components/catalogos/ModalidadesList'
import ModalidadeModal from '../components/catalogos/ModalidadeModal'

export default function Modalidades() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(null)

  const handleNewModalidade = () => {
    setModalidadeSelecionada(null)
    setModalOpen(true)
  }

  const handleEditModalidade = (modalidade) => {
    setModalidadeSelecionada(modalidade)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setModalidadeSelecionada(null)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    setModalidadeSelecionada(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Modalidades
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Gerencie as modalidades esportivas dos Jogos Escolares
        </p>
      </header>

      <div className="flex-1">
        <ModalidadesList
          onNewModalidade={handleNewModalidade}
          onEditModalidade={handleEditModalidade}
        />
      </div>

      <ModalidadeModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        modalidade={modalidadeSelecionada}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
