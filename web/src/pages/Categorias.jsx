import { useState } from 'react'
import CategoriasList from '../components/catalogos/CategoriasList'
import CategoriaModal from '../components/catalogos/CategoriaModal'
import useCategorias from '../hooks/useCategorias'

export default function Categorias() {
  const useCategoriasState = useCategorias()
  const [modalOpen, setModalOpen] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null)

  const handleNewCategoria = () => {
    setCategoriaSelecionada(null)
    setModalOpen(true)
  }

  const handleEditCategoria = (categoria) => {
    setCategoriaSelecionada(categoria)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setCategoriaSelecionada(null)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    setCategoriaSelecionada(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Categorias
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Gerencie as categorias (faixas etárias: 12-14, 15-17 anos) dos Jogos Escolares
        </p>
      </header>

      <div className="flex-1">
        <CategoriasList
          {...useCategoriasState}
          onNewCategoria={handleNewCategoria}
          onEditCategoria={handleEditCategoria}
        />
      </div>

      <CategoriaModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        categoria={categoriaSelecionada}
        onSuccess={handleModalSuccess}
        createCategoria={useCategoriasState.createCategoria}
        updateCategoria={useCategoriasState.updateCategoria}
        loading={useCategoriasState.loading}
      />
    </div>
  )
}
