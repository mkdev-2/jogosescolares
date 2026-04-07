import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert } from 'antd'
import { Users, GraduationCap, UsersRound, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useEstudantes from '../hooks/useEstudantes'
import useProfessoresTecnicos from '../hooks/useProfessoresTecnicos'
import useEquipes from '../hooks/useEquipes'
import useEscolas from '../hooks/useEscolas'
import useEsporteVariantes from '../hooks/useEsporteVariantes'
import usePrazoCadastroAlunos from '../hooks/usePrazoCadastroAlunos'
import EstudantesList from '../components/catalogos/EstudantesList'
import ProfessoresTecnicosList from '../components/catalogos/ProfessoresTecnicosList'
import EquipesList from '../components/catalogos/EquipesList'
import EscolasList from '../components/catalogos/EscolasList'
import EscolaViewModal from '../components/catalogos/EscolaViewModal'
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'
import ProfessorTecnicoModal from '../components/catalogos/ProfessorTecnicoModal'
import EquipeModal from '../components/catalogos/EquipeModal'
import EstudanteViewModal from '../components/catalogos/EstudanteViewModal'
import ProfessorViewModal from '../components/catalogos/ProfessorViewModal'
import EquipeViewModal from '../components/catalogos/EquipeViewModal'
import FichaColetivaPrint from '../components/catalogos/FichaColetivaPrint'
import FichaIndividualPrint from '../components/catalogos/FichaIndividualPrint'
import Modal from '../components/ui/Modal'
import { equipesService } from '../services/equipesService'
import { estudantesService } from '../services/estudantesService'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']
const CADASTRO_ROLES = ['DIRETOR', 'COORDENADOR']

const TABS_BASE = [
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'professores', label: 'Professores', icon: GraduationCap },
  { id: 'equipes', label: 'Equipes', icon: UsersRound },
]
const TAB_ESCOLAS = { id: 'escolas', label: 'Escolas', icon: Building2 }

export default function Gestao() {
  const { user } = useAuth()
  const isAdmin = user && ADMIN_ROLES.includes(user.role)
  const canCreateEntities = user && CADASTRO_ROLES.includes(user.role)
  const TABS = isAdmin ? [...TABS_BASE, TAB_ESCOLAS] : TABS_BASE
  const TAB_IDS = TABS.map((t) => t.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'alunos'
  const [activeTab, setActiveTab] = useState(TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'alunos')
  const [modalEstudanteOpen, setModalEstudanteOpen] = useState(false)
  const [modalProfessorOpen, setModalProfessorOpen] = useState(false)
  const [modalEquipeOpen, setModalEquipeOpen] = useState(false)
  const [estudanteParaVer, setEstudanteParaVer] = useState(null)
  const [professorParaVer, setProfessorParaVer] = useState(null)
  const [equipeParaVer, setEquipeParaVer] = useState(null)
  const [estudanteParaEditar, setEstudanteParaEditar] = useState(null)
  const [professorParaEditar, setProfessorParaEditar] = useState(null)
  const [equipeParaEditar, setEquipeParaEditar] = useState(null)
  const [fichaColetivaOpen, setFichaColetivaOpen] = useState(false)
  const [fichaColetivaDados, setFichaColetivaDados] = useState(null)
  const [fichaColetivaLoading, setFichaColetivaLoading] = useState(false)
  const [fichaIndividualOpen, setFichaIndividualOpen] = useState(false)
  const [fichaIndividualDados, setFichaIndividualDados] = useState(null)
  const [fichaIndividualLoading, setFichaIndividualLoading] = useState(false)
  const [estudanteModalInitialStep, setEstudanteModalInitialStep] = useState(0)
  const [escolaParaVer, setEscolaParaVer] = useState(null)

  useEffect(() => {
    const t = searchParams.get('tab') || 'alunos'
    const validIds = isAdmin ? ['alunos', 'professores', 'equipes', 'escolas'] : ['alunos', 'professores', 'equipes']
    if (validIds.includes(t)) setActiveTab(t)
  }, [searchParams, isAdmin])

  const { lista: listaEstudantes, loading: loadingEstudantes, error: errorEstudantes, fetchEstudantes, deleteEstudante } = useEstudantes()
  const { lista: listaProfessores, loading: loadingProfessores, error: errorProfessores, fetchLista: fetchProfessores, deleteProfessor } = useProfessoresTecnicos()
  const { lista: listaEquipes, loading: loadingEquipes, error: errorEquipes, fetchLista: fetchEquipes, deleteEquipe } = useEquipes()
  const { lista: listaEscolas, loading: loadingEscolas, error: errorEscolas, fetchEscolas } = useEscolas()
  const temEscola = !!user?.escola_id
  const { variantes } = useEsporteVariantes(null, { minhaEscola: temEscola })
  const { bloqueado: cadastroAlunosBloqueado, dataLimite: prazoCadastroAlunos } = usePrazoCadastroAlunos()



  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-0 sm:px-0">
      <header className="flex flex-col gap-1 px-4 sm:px-0">
        <h1 className="text-[1.25rem] sm:text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Gestão
        </h1>
        <p className="text-[0.875rem] sm:text-[0.9375rem] text-[#64748b] m-0">
          Centralize o controle de alunos, professores e equipes em um único painel.
        </p>
      </header>

      <div className="bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden -mx-4 sm:mx-0">
        <div className="flex gap-0 p-1 sm:p-2 border-b border-[#f1f5f9] overflow-x-auto overflow-y-hidden scrollbar-hide whitespace-nowrap">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchParams(tab.id === 'alunos' ? {} : { tab: tab.id })
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-[10px] font-medium text-[0.875rem] sm:text-[0.9375rem] transition-colors border-0 cursor-pointer shrink-0 ${isActive
                  ? 'bg-[#f1f5f9] text-[#0f766e]'
                  : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-[#0f766e]' : 'text-[#1e293b]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-4 sm:p-6">
          {activeTab === 'alunos' && (
            <>
              {!cadastroAlunosBloqueado && prazoCadastroAlunos && (
                <Alert
                  type="info"
                  message="Prazo para cadastro de alunos"
                  description={`Novos alunos podem ser cadastrados até ${new Date(prazoCadastroAlunos + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}. Após essa data, não será possível incluir novos estudantes-atletas.`}
                  showIcon
                  className="mb-4"
                />
              )}
              {cadastroAlunosBloqueado && (
                <Alert
                  type="warning"
                  message="Prazo encerrado"
                  description="O prazo para cadastro de novos alunos foi encerrado. Não é possível incluir novos estudantes-atletas."
                  showIcon
                  className="mb-4"
                />
              )}
              <EstudantesList
                lista={listaEstudantes}
                loading={loadingEstudantes}
                error={errorEstudantes}
                onNewAluno={canCreateEntities && !cadastroAlunosBloqueado ? () => { setEstudanteParaEditar(null); setModalEstudanteOpen(true); setEstudanteModalInitialStep(0) } : undefined}
                onEditAluno={!isAdmin ? (item) => { setEstudanteParaEditar(item); setModalEstudanteOpen(true); setEstudanteModalInitialStep(0) } : undefined}
                onDeleteAluno={!isAdmin ? async (item) => { try { await deleteEstudante(item.id) } catch (e) { alert(e.message) } } : undefined}
                onViewAluno={(item) => setEstudanteParaVer(item)}
                onFichaIndividual={async (item) => {
                  setFichaIndividualOpen(true)
                  setFichaIndividualDados(null)
                  setFichaIndividualLoading(true)
                  try {
                    const full = await estudantesService.getById(item.id)
                    const modalidades = await estudantesService.getModalidades(item.id)
                    const modalidade = Array.isArray(modalidades) && modalidades.length > 0
                      ? `${modalidades[0].esporte_nome || ''} • ${modalidades[0].categoria_nome || ''} • ${modalidades[0].naipe_nome || ''}`.trim()
                      : '—'
                    setFichaIndividualDados({
                      estudante: full,
                      responsavel: {
                        nome: full?.responsavel_nome,
                        cpf: estudantesService.formatCpf(full?.responsavel_cpf),
                        rg: full?.responsavel_rg,
                        celular: full?.responsavel_celular,
                        email: full?.responsavel_email,
                        nis: full?.responsavel_nis,
                      },
                      modalidade,
                    })
                  } catch (err) {
                    setFichaIndividualOpen(false)
                    alert(err.message || 'Erro ao carregar dados da ficha individual.')
                  } finally {
                    setFichaIndividualLoading(false)
                  }
                }}
                showInstituicao={isAdmin}
                escolas={isAdmin ? listaEscolas : []}
              />
              <EstudanteViewModal
                open={!!estudanteParaVer}
                onClose={() => setEstudanteParaVer(null)}
                estudante={estudanteParaVer}
                onUpdate={(atualizado) => {
                  setEstudanteParaVer(atualizado)
                  fetchEstudantes()
                }}
                onEdit={!isAdmin ? (item, opts) => {
                  setEstudanteParaVer(null)
                  setEstudanteParaEditar(item)
                  setModalEstudanteOpen(true)
                  setEstudanteModalInitialStep(opts?.openAtStep ?? 0)
                } : undefined}
              />
              <EstudanteAtletaModal
                open={modalEstudanteOpen}
                onClose={() => { setModalEstudanteOpen(false); setEstudanteParaEditar(null); setEstudanteModalInitialStep(0) }}
                onSuccess={() => {
                  setModalEstudanteOpen(false)
                  setEstudanteParaEditar(null)
                  setEstudanteModalInitialStep(0)
                  fetchEstudantes()
                }}
                estudante={estudanteParaEditar}
                initialStep={estudanteModalInitialStep}
              />
              <Modal
                isOpen={fichaIndividualOpen}
                onClose={() => { setFichaIndividualOpen(false); setFichaIndividualDados(null) }}
                title="Ficha Individual – JELS"
                subtitle={fichaIndividualDados?.estudante?.nome || ''}
                size="xl"
                footer={null}
              >
                <div className="overflow-y-auto max-h-[70vh] px-6 py-4">
                  {fichaIndividualLoading && (
                    <div className="flex justify-center py-8">
                      <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
                    </div>
                  )}
                  {!fichaIndividualLoading && fichaIndividualDados && (
                    <FichaIndividualPrint
                      dados={fichaIndividualDados}
                      onClose={() => { setFichaIndividualOpen(false); setFichaIndividualDados(null) }}
                    />
                  )}
                </div>
              </Modal>
            </>
          )}
          {activeTab === 'professores' && (
            <>
              <ProfessoresTecnicosList
                lista={listaProfessores}
                loading={loadingProfessores}
                error={errorProfessores}
                onNewProfessor={canCreateEntities ? () => { setProfessorParaEditar(null); setModalProfessorOpen(true) } : undefined}
                onEditProfessor={!isAdmin ? (item) => { setProfessorParaEditar(item); setModalProfessorOpen(true) } : undefined}
                onDeleteProfessor={!isAdmin ? async (item) => { try { await deleteProfessor(item.id) } catch (e) { alert(e.message) } } : undefined}
                onViewProfessor={(item) => setProfessorParaVer(item)}
                showInstituicao={isAdmin}
                escolas={isAdmin ? listaEscolas : []}
              />
              <ProfessorViewModal
                open={!!professorParaVer}
                onClose={() => setProfessorParaVer(null)}
                professor={professorParaVer}
              />
              <ProfessorTecnicoModal
                open={modalProfessorOpen}
                onClose={() => { setModalProfessorOpen(false); setProfessorParaEditar(null) }}
                onSuccess={() => {
                  setModalProfessorOpen(false)
                  setProfessorParaEditar(null)
                  fetchProfessores()
                }}
                professor={professorParaEditar}
              />
            </>
          )}
          {activeTab === 'equipes' && (
            <>
              <EquipesList
                lista={listaEquipes}
                loading={loadingEquipes}
                error={errorEquipes}
                onNewEquipe={canCreateEntities ? () => { setEquipeParaEditar(null); setModalEquipeOpen(true) } : undefined}
                onEditEquipe={!isAdmin ? (item) => { setEquipeParaEditar(item); setModalEquipeOpen(true) } : undefined}
                onDeleteEquipe={!isAdmin ? async (item) => { try { await deleteEquipe(item.id) } catch (e) { alert(e.message) } } : undefined}
                onViewEquipe={(item) => setEquipeParaVer(item)}
                showInstituicao={isAdmin}
                escolas={isAdmin ? listaEscolas : []}
                onFichaColetiva={async (equipe) => {
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
                }}
              />
              <Modal
                isOpen={fichaColetivaOpen}
                onClose={() => { setFichaColetivaOpen(false); setFichaColetivaDados(null) }}
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
                      onClose={() => { setFichaColetivaOpen(false); setFichaColetivaDados(null) }}
                    />
                  )}
                </div>
              </Modal>
              <EquipeViewModal
                open={!!equipeParaVer}
                onClose={() => setEquipeParaVer(null)}
                equipe={equipeParaVer}
              />
              <EquipeModal
                open={modalEquipeOpen}
                onClose={() => { setModalEquipeOpen(false); setEquipeParaEditar(null) }}
                onSuccess={() => {
                  setModalEquipeOpen(false)
                  setEquipeParaEditar(null)
                  fetchEquipes()
                }}
                variantes={variantes}
                estudantes={listaEstudantes}
                professoresTecnicos={listaProfessores}
                equipe={equipeParaEditar}
              />
            </>
          )}
          {activeTab === 'escolas' && isAdmin && (
            <>
              <EscolasList
                lista={listaEscolas}
                loading={loadingEscolas}
                error={errorEscolas}
                onViewEscola={(item) => setEscolaParaVer(item)}
              />
              <EscolaViewModal
                open={!!escolaParaVer}
                onClose={() => setEscolaParaVer(null)}
                escolaId={escolaParaVer?.id}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
