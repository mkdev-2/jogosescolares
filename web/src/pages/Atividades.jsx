import { useState, useEffect } from 'react'
import { Modal, Button } from 'antd'
import EsportesList from '../components/catalogos/EsportesList'
import EsporteModal from '../components/catalogos/EsporteModal'
import ModalidadesForm from '../components/catalogos/ModalidadesForm'
import useEsportes from '../hooks/useEsportes'
import useEsporteVariantes from '../hooks/useEsporteVariantes'
import { useAuth } from '../contexts/AuthContext'
import { esportesService } from '../services/esportesService'
import { esporteVariantesService } from '../services/esporteVariantesService'
import { escolasService } from '../services/escolasService'

export default function Atividades() {
  const { user } = useAuth()
  const isDiretor = user?.role === 'DIRETOR'
  const useEsportesState = useEsportes()
  const useVariantesState = useEsporteVariantes(null, { minhaEscola: isDiretor })
  const [modalEsporteOpen, setModalEsporteOpen] = useState(false)
  const [esporteSelecionado, setEsporteSelecionado] = useState(null)
  const [variantesDoEsporte, setVariantesDoEsporte] = useState([])

  const [modalModalidadesOpen, setModalModalidadesOpen] = useState(false)
  const [variantesTodas, setVariantesTodas] = useState([])
  const [loadingVariantesTodas, setLoadingVariantesTodas] = useState(false)
  const [editModalidadeIds, setEditModalidadeIds] = useState([])
  const [salvandoModalidades, setSalvandoModalidades] = useState(false)
  const [erroModalidades, setErroModalidades] = useState(null)

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

  const handleAbrirEdicaoModalidades = () => {
    setEditModalidadeIds(useVariantesState.variantes.map((v) => v.id))
    setErroModalidades(null)
    setModalModalidadesOpen(true)
  }

  useEffect(() => {
    if (!modalModalidadesOpen) return
    setLoadingVariantesTodas(true)
    esporteVariantesService
      .list()
      .then((data) => setVariantesTodas(Array.isArray(data) ? data : []))
      .catch(() => setVariantesTodas([]))
      .finally(() => setLoadingVariantesTodas(false))
  }, [modalModalidadesOpen])

  const handleSalvarModalidades = async () => {
    if (!editModalidadeIds?.length) {
      setErroModalidades('Selecione pelo menos uma modalidade.')
      return
    }
    setErroModalidades(null)
    setSalvandoModalidades(true)
    try {
      await escolasService.updateMinhaEscolaModalidades(editModalidadeIds)
      setModalModalidadesOpen(false)
      useVariantesState.fetchVariantes()
    } catch (err) {
      setErroModalidades(err.message || 'Erro ao salvar modalidades.')
    } finally {
      setSalvandoModalidades(false)
    }
  }

  const handleFecharModalModalidades = () => {
    if (!salvandoModalidades) {
      setModalModalidadesOpen(false)
      setErroModalidades(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          {isDiretor ? 'Esportes' : 'Atividades'}
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          {isDiretor
            ? 'Modalidades em que sua escola está vinculada.'
            : 'Gerencie esportes e suas variantes (categoria, naipe e tipo).'}
        </p>
      </header>

      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6">
          <EsportesList
            variantes={useVariantesState.variantes}
            loading={useVariantesState.loading}
            error={useVariantesState.error}
            fetchVariantes={useVariantesState.fetchVariantes}
            deleteVariante={isDiretor ? undefined : useVariantesState.deleteVariante}
            deleteEsporte={isDiretor ? undefined : useEsportesState.deleteEsporte}
            onNewEsporte={isDiretor ? undefined : handleNewEsporte}
            onEditVariante={isDiretor ? undefined : handleEditVariante}
            onEditModalidades={isDiretor ? handleAbrirEdicaoModalidades : undefined}
            emptyMessageDiretor={isDiretor}
          />
          {!isDiretor && (
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
          )}
        </div>
      </div>

      {isDiretor && (
        <Modal
          title="Editar modalidades da escola"
          open={modalModalidadesOpen}
          onCancel={handleFecharModalModalidades}
          footer={[
            <Button key="cancel" onClick={handleFecharModalModalidades} disabled={salvandoModalidades}>
              Cancelar
            </Button>,
            <Button key="save" type="primary" loading={salvandoModalidades} onClick={handleSalvarModalidades}>
              Salvar
            </Button>,
          ]}
          width={640}
          destroyOnClose
        >
          <p className="text-sm text-[#64748b] mb-4">
            Selecione ou remova as modalidades em que sua escola pretende participar. É necessário manter pelo menos uma.
          </p>
          <ModalidadesForm
            variantes={variantesTodas}
            value={editModalidadeIds}
            onChange={setEditModalidadeIds}
            error={erroModalidades}
            loading={loadingVariantesTodas}
            emptyMessage="Nenhuma modalidade cadastrada no sistema. Entre em contato com a SEMCEJ."
          />
        </Modal>
      )}
    </div>
  )
}
