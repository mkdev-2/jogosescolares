import { useState } from 'react'
import useEquipes from '../hooks/useEquipes'
import useEstudantes from '../hooks/useEstudantes'
import useProfessoresTecnicos from '../hooks/useProfessoresTecnicos'
import useEsporteVariantes from '../hooks/useEsporteVariantes'
import EquipesList from '../components/catalogos/EquipesList'
import EquipeModal from '../components/catalogos/EquipeModal'
import FichaColetivaPrint from '../components/catalogos/FichaColetivaPrint'
import Modal from '../components/ui/Modal'
import { equipesService } from '../services/equipesService'

export default function Equipes() {
  const { lista, loading, error, fetchLista } = useEquipes()
  const { lista: estudantes } = useEstudantes()
  const { lista: professoresTecnicos } = useProfessoresTecnicos()
  const { variantes } = useEsporteVariantes()
  const [modalOpen, setModalOpen] = useState(false)
  const [fichaColetivaOpen, setFichaColetivaOpen] = useState(false)
  const [fichaColetivaDados, setFichaColetivaDados] = useState(null)
  const [fichaColetivaLoading, setFichaColetivaLoading] = useState(false)

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

  const handleFichaColetiva = async (equipe) => {
    setFichaColetivaOpen(true)
    setFichaColetivaDados(null)
    setFichaColetivaLoading(true)
    try {
      const data = await equipesService.getFichaColetiva(equipe.id)
      setFichaColetivaDados(data)
    } catch (err) {
      setFichaColetivaOpen(false)
      alert(err.message || 'Erro ao carregar dados da ficha coletiva.')
    } finally {
      setFichaColetivaLoading(false)
    }
  }

  const handleFichaColetivaClose = () => {
    setFichaColetivaOpen(false)
    setFichaColetivaDados(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Equipes
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Monte equipes por variante (esporte + categoria + naipe + tipo), vinculando alunos e professor-técnico.
        </p>
      </header>

      <div className="flex-1">
        <EquipesList
          lista={lista}
          loading={loading}
          error={error}
          onNewEquipe={handleNewEquipe}
          onFichaColetiva={handleFichaColetiva}
        />
      </div>

      <EquipeModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        variantes={variantes}
        estudantes={estudantes}
        professoresTecnicos={professoresTecnicos}
      />

      <Modal
        isOpen={fichaColetivaOpen}
        onClose={handleFichaColetivaClose}
        title="Ficha Coletiva – JELS"
        subtitle={fichaColetivaDados ? `${fichaColetivaDados.instituicao || ''} • ${fichaColetivaDados.modalidade || ''}` : ''}
        size="xl"
        footer={null}
      >
        <div className="overflow-y-auto max-h-[70vh] px-6 py-4">
          {fichaColetivaLoading && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
            </div>
          )}
          {!fichaColetivaLoading && fichaColetivaDados && (
            <FichaColetivaPrint
              dados={fichaColetivaDados}
              onClose={handleFichaColetivaClose}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
