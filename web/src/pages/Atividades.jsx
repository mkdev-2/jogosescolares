import { useState } from 'react'
import EsportesList from '../components/catalogos/EsportesList'
import EsporteModal from '../components/catalogos/EsporteModal'
import useEsportes from '../hooks/useEsportes'
import useEsporteVariantes from '../hooks/useEsporteVariantes'
import { esportesService } from '../services/esportesService'
import { esporteVariantesService } from '../services/esporteVariantesService'

export default function Atividades() {
  const useEsportesState = useEsportes()
  const useVariantesState = useEsporteVariantes()
  const [modalEsporteOpen, setModalEsporteOpen] = useState(false)
  const [esporteSelecionado, setEsporteSelecionado] = useState(null)
  const [variantesDoEsporte, setVariantesDoEsporte] = useState([])

  const handleNewEsporte = () => {
    setEsporteSelecionado(null)
    setVariantesDoEsporte([])
    setModalEsporteOpen(true)
  }

  const handleEditVariante = async (variante) => {
    setEsporteSelecionado(null)
    setVariantesDoEsporte([])
    setModalEsporteOpen(true)
    try {
      const [esporte, variantes] = await Promise.all([
        esportesService.getById(variante.esporte_id),
        esporteVariantesService.list(variante.esporte_id),
      ])
      setEsporteSelecionado(esporte)
      setVariantesDoEsporte(variantes || [])
    } catch {
      setModalEsporteOpen(false)
    }
  }

  const handleModalEsporteClose = () => {
    setModalEsporteOpen(false)
    setEsporteSelecionado(null)
    setVariantesDoEsporte([])
  }

  const handleModalEsporteSuccess = () => {
    setModalEsporteOpen(false)
    setEsporteSelecionado(null)
    setVariantesDoEsporte([])
    useVariantesState.fetchVariantes()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Atividades
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Gerencie esportes e suas variantes (categoria, naipe e tipo).
        </p>
      </header>

      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6">
          <EsportesList
            variantes={useVariantesState.variantes}
            loading={useVariantesState.loading}
            error={useVariantesState.error}
            fetchVariantes={useVariantesState.fetchVariantes}
            deleteVariante={useVariantesState.deleteVariante}
            deleteEsporte={useEsportesState.deleteEsporte}
            onNewEsporte={handleNewEsporte}
            onEditVariante={handleEditVariante}
          />
          <EsporteModal
            isOpen={modalEsporteOpen}
            onClose={handleModalEsporteClose}
            esporte={esporteSelecionado}
            variantesForEdit={variantesDoEsporte}
            onSuccess={handleModalEsporteSuccess}
            createEsporte={useEsportesState.createEsporte}
            updateEsporte={useEsportesState.updateEsporte}
            loading={useEsportesState.loading}
          />
        </div>
      </div>
    </div>
  )
}
