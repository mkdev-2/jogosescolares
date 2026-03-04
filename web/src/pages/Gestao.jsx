import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, GraduationCap, UsersRound, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useEstudantes from '../hooks/useEstudantes'
import useProfessoresTecnicos from '../hooks/useProfessoresTecnicos'
import useEquipes from '../hooks/useEquipes'
import useEscolas from '../hooks/useEscolas'
import useModalidades from '../hooks/useModalidades'
import useCategorias from '../hooks/useCategorias'
import EstudantesList from '../components/catalogos/EstudantesList'
import ProfessoresTecnicosList from '../components/catalogos/ProfessoresTecnicosList'
import EquipesList from '../components/catalogos/EquipesList'
import EscolasList from '../components/catalogos/EscolasList'
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'
import ProfessorTecnicoModal from '../components/catalogos/ProfessorTecnicoModal'
import EquipeModal from '../components/catalogos/EquipeModal'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

const TABS_BASE = [
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'professores', label: 'Professores', icon: GraduationCap },
  { id: 'equipes', label: 'Equipes', icon: UsersRound },
]
const TAB_ESCOLAS = { id: 'escolas', label: 'Escolas', icon: Building2 }

export default function Gestao() {
  const { user } = useAuth()
  const isAdmin = user && ADMIN_ROLES.includes(user.role)
  const TABS = isAdmin ? [...TABS_BASE, TAB_ESCOLAS] : TABS_BASE
  const TAB_IDS = TABS.map((t) => t.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'alunos'
  const [activeTab, setActiveTab] = useState(TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'alunos')
  const [modalEstudanteOpen, setModalEstudanteOpen] = useState(false)

  useEffect(() => {
    const t = searchParams.get('tab') || 'alunos'
    const validIds = isAdmin ? ['alunos', 'professores', 'equipes', 'escolas'] : ['alunos', 'professores', 'equipes']
    if (validIds.includes(t)) setActiveTab(t)
  }, [searchParams, isAdmin])
  const [modalProfessorOpen, setModalProfessorOpen] = useState(false)
  const [modalEquipeOpen, setModalEquipeOpen] = useState(false)

  const { lista: listaEstudantes, loading: loadingEstudantes, error: errorEstudantes, fetchEstudantes } = useEstudantes()
  const { lista: listaProfessores, loading: loadingProfessores, error: errorProfessores, fetchLista: fetchProfessores } = useProfessoresTecnicos()
  const { lista: listaEquipes, loading: loadingEquipes, error: errorEquipes, fetchLista: fetchEquipes } = useEquipes()
  const { lista: listaEscolas, loading: loadingEscolas, error: errorEscolas, fetchEscolas } = useEscolas()
  const { modalidades } = useModalidades()
  const { categorias } = useCategorias()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Gestão
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Centralize o controle de alunos, professores e equipes em um único painel.
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
                  setSearchParams(tab.id === 'alunos' ? {} : { tab: tab.id })
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
          {activeTab === 'alunos' && (
            <>
              <EstudantesList
                lista={listaEstudantes}
                loading={loadingEstudantes}
                error={errorEstudantes}
                onNewAluno={isAdmin ? undefined : () => setModalEstudanteOpen(true)}
                showInstituicao={isAdmin}
              />
              <EstudanteAtletaModal
                open={modalEstudanteOpen}
                onClose={() => setModalEstudanteOpen(false)}
                onSuccess={() => {
                  setModalEstudanteOpen(false)
                  fetchEstudantes()
                }}
              />
            </>
          )}
          {activeTab === 'professores' && (
            <>
              <ProfessoresTecnicosList
                lista={listaProfessores}
                loading={loadingProfessores}
                error={errorProfessores}
                onNewProfessor={isAdmin ? undefined : () => setModalProfessorOpen(true)}
                showInstituicao={isAdmin}
              />
              <ProfessorTecnicoModal
                open={modalProfessorOpen}
                onClose={() => setModalProfessorOpen(false)}
                onSuccess={() => {
                  setModalProfessorOpen(false)
                  fetchProfessores()
                }}
              />
            </>
          )}
          {activeTab === 'equipes' && (
            <>
              <EquipesList
                lista={listaEquipes}
                loading={loadingEquipes}
                error={errorEquipes}
                onNewEquipe={isAdmin ? undefined : () => setModalEquipeOpen(true)}
                showInstituicao={isAdmin}
              />
              <EquipeModal
                open={modalEquipeOpen}
                onClose={() => setModalEquipeOpen(false)}
                onSuccess={() => {
                  setModalEquipeOpen(false)
                  fetchEquipes()
                }}
                modalidades={modalidades}
                categorias={categorias}
                estudantes={listaEstudantes}
                professoresTecnicos={listaProfessores}
              />
            </>
          )}
          {activeTab === 'escolas' && isAdmin && (
            <EscolasList
              lista={listaEscolas}
              loading={loadingEscolas}
              error={errorEscolas}
            />
          )}
        </div>
      </div>
    </div>
  )
}
