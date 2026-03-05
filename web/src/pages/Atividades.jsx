import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trophy, LayoutGrid, Layers } from 'lucide-react'
import EsportesList from '../components/catalogos/EsportesList'
import EsporteVariantesList from '../components/catalogos/EsporteVariantesList'
import CategoriasList from '../components/catalogos/CategoriasList'
import EsporteModal from '../components/catalogos/EsporteModal'
import EsporteVarianteModal from '../components/catalogos/EsporteVarianteModal'
import CategoriaModal from '../components/catalogos/CategoriaModal'
import useCategorias from '../hooks/useCategorias'
import useEsportes from '../hooks/useEsportes'
import useEsporteVariantes from '../hooks/useEsporteVariantes'

const TABS = [
  { id: 'esportes', label: 'Esportes', icon: Trophy },
  { id: 'variantes', label: 'Variantes', icon: Layers },
  { id: 'categorias', label: 'Categorias', icon: LayoutGrid },
]

const TAB_IDS = ['esportes', 'variantes', 'categorias']

export default function Atividades() {
  const useCategoriasState = useCategorias()
  const useEsportesState = useEsportes()
  const useVariantesState = useEsporteVariantes()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'esportes'
  const [activeTab, setActiveTab] = useState(TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'esportes')
  const [modalEsporteOpen, setModalEsporteOpen] = useState(false)
  const [modalVarianteOpen, setModalVarianteOpen] = useState(false)
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [esporteSelecionado, setEsporteSelecionado] = useState(null)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null)

  useEffect(() => {
    const t = searchParams.get('tab') || 'esportes'
    if (TAB_IDS.includes(t)) setActiveTab(t)
  }, [searchParams])

  const handleNewEsporte = () => {
    setEsporteSelecionado(null)
    setModalEsporteOpen(true)
  }

  const handleEditEsporte = (esporte) => {
    setEsporteSelecionado(esporte)
    setModalEsporteOpen(true)
  }

  const handleModalEsporteClose = () => {
    setModalEsporteOpen(false)
    setEsporteSelecionado(null)
  }

  const handleModalEsporteSuccess = () => {
    setModalEsporteOpen(false)
    setEsporteSelecionado(null)
  }

  const handleNewVariante = () => setModalVarianteOpen(true)
  const handleModalVarianteClose = () => setModalVarianteOpen(false)
  const handleModalVarianteSuccess = () => {
    setModalVarianteOpen(false)
    useVariantesState.fetchVariantes()
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
          Centralize o controle de esportes, variantes e categorias (faixa etária).
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
                  setSearchParams(tab.id === 'esportes' ? {} : { tab: tab.id })
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
          {activeTab === 'esportes' && (
            <>
              <EsportesList
                {...useEsportesState}
                onNewEsporte={handleNewEsporte}
                onEditEsporte={handleEditEsporte}
              />
              <EsporteModal
                isOpen={modalEsporteOpen}
                onClose={handleModalEsporteClose}
                esporte={esporteSelecionado}
                onSuccess={handleModalEsporteSuccess}
                createEsporte={useEsportesState.createEsporte}
                updateEsporte={useEsportesState.updateEsporte}
                loading={useEsportesState.loading}
              />
            </>
          )}
          {activeTab === 'variantes' && (
            <>
              <EsporteVariantesList
                {...useVariantesState}
                onNewVariante={handleNewVariante}
              />
              <EsporteVarianteModal
                isOpen={modalVarianteOpen}
                onClose={handleModalVarianteClose}
                onSuccess={handleModalVarianteSuccess}
                createVariante={useVariantesState.createVariante}
                loading={useVariantesState.loading}
              />
            </>
          )}
          {activeTab === 'categorias' && (
            <>
              <CategoriasList
                {...useCategoriasState}
                onNewCategoria={handleNewCategoria}
                onEditCategoria={handleEditCategoria}
              />
              <CategoriaModal
                isOpen={modalCategoriaOpen}
                onClose={handleModalCategoriaClose}
                categoria={categoriaSelecionada}
                onSuccess={handleModalCategoriaSuccess}
                createCategoria={useCategoriasState.createCategoria}
                updateCategoria={useCategoriasState.updateCategoria}
                loading={useCategoriasState.loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
