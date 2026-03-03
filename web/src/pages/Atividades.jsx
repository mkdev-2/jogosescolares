import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trophy, LayoutGrid } from 'lucide-react'
import ModalidadesList from '../components/catalogos/ModalidadesList'
import CategoriasList from '../components/catalogos/CategoriasList'
import ModalidadeModal from '../components/catalogos/ModalidadeModal'
import CategoriaModal from '../components/catalogos/CategoriaModal'

const TABS = [
  { id: 'modalidades', label: 'Modalidades', icon: Trophy },
  { id: 'categorias', label: 'Categorias', icon: LayoutGrid },
]

const TAB_IDS = ['modalidades', 'categorias']

export default function Atividades() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'modalidades'
  const [activeTab, setActiveTab] = useState(TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'modalidades')
  const [modalModalidadeOpen, setModalModalidadeOpen] = useState(false)
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(null)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null)

  useEffect(() => {
    const t = searchParams.get('tab') || 'modalidades'
    if (TAB_IDS.includes(t)) setActiveTab(t)
  }, [searchParams])

  const handleNewModalidade = () => {
    setModalidadeSelecionada(null)
    setModalModalidadeOpen(true)
  }

  const handleEditModalidade = (modalidade) => {
    setModalidadeSelecionada(modalidade)
    setModalModalidadeOpen(true)
  }

  const handleModalModalidadeClose = () => {
    setModalModalidadeOpen(false)
    setModalidadeSelecionada(null)
  }

  const handleModalModalidadeSuccess = () => {
    setModalModalidadeOpen(false)
    setModalidadeSelecionada(null)
  }

  const handleNewCategoria = () => {
    setCategoriaSelecionada(null)
    setModalCategoriaOpen(true)
  }

  const handleEditCategoria = (categoria) => {
    setCategoriaSelecionada(categoria)
    setModalCategoriaOpen(true)
  }

  const handleModalCategoriaClose = () => {
    setModalCategoriaOpen(false)
    setCategoriaSelecionada(null)
  }

  const handleModalCategoriaSuccess = () => {
    setModalCategoriaOpen(false)
    setCategoriaSelecionada(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Atividades
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Centralize o controle de modalidades e categorias em um único painel.
        </p>
      </header>

      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchParams(tab.id === 'modalidades' ? {} : { tab: tab.id })
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-[10px] font-medium text-[0.9375rem] transition-colors border-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#f1f5f9] text-[#0f766e]'
                    : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[#0f766e]' : 'text-[#1e293b]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {activeTab === 'modalidades' && (
            <>
              <ModalidadesList
                onNewModalidade={handleNewModalidade}
                onEditModalidade={handleEditModalidade}
              />
              <ModalidadeModal
                isOpen={modalModalidadeOpen}
                onClose={handleModalModalidadeClose}
                modalidade={modalidadeSelecionada}
                onSuccess={handleModalModalidadeSuccess}
              />
            </>
          )}
          {activeTab === 'categorias' && (
            <>
              <CategoriasList
                onNewCategoria={handleNewCategoria}
                onEditCategoria={handleEditCategoria}
              />
              <CategoriaModal
                isOpen={modalCategoriaOpen}
                onClose={handleModalCategoriaClose}
                categoria={categoriaSelecionada}
                onSuccess={handleModalCategoriaSuccess}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
