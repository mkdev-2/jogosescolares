import { useState } from 'react'
import ModalidadesList from '../components/catalogos/ModalidadesList'
import ModalidadeModal from '../components/catalogos/ModalidadeModal'
import './Modalidades.css'

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
    <div className="modalidades-page">
      <header className="modalidades-page-header">
        <h1 className="modalidades-page-title">Modalidades</h1>
        <p className="modalidades-page-subtitle">
          Gerencie as modalidades esportivas dos Jogos Escolares
        </p>
      </header>

      <div className="modalidades-main">
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
