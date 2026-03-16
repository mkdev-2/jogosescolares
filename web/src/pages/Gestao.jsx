import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Alert } from 'antd'
import { Users, GraduationCap, UsersRound, Building2, Medal } from 'lucide-react'
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
import EstudanteAtletaModal from '../components/catalogos/EstudanteAtletaModal'
import ProfessorTecnicoModal from '../components/catalogos/ProfessorTecnicoModal'
import EquipeModal from '../components/catalogos/EquipeModal'
import EstudanteViewModal from '../components/catalogos/EstudanteViewModal'
import ProfessorViewModal from '../components/catalogos/ProfessorViewModal'
import EquipeViewModal from '../components/catalogos/EquipeViewModal'
import FichaColetivaPrint from '../components/catalogos/FichaColetivaPrint'
import CredencialCrachaPrint from '../components/catalogos/CredencialCrachaPrint'
import Modal from '../components/ui/Modal'
import { equipesService } from '../services/equipesService'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  const [escolaParaCredenciais, setEscolaParaCredenciais] = useState(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [progressoPdf, setProgressoPdf] = useState({ atual: 0, total: 0 })
  const credenciaisRefs = useRef([])

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

  const handleGerarPdfCredenciaisEscola = async () => {
    if (!escolaParaCredenciais) return

    const estudantesDaEscola = listaEstudantes.filter(
      (e) => escolaParaCredenciais && Number(e.escola_id) === Number(escolaParaCredenciais.id),
    )

    if (!estudantesDaEscola.length) {
      alert('Nenhum estudante encontrado para esta escola.')
      return
    }

    setGerandoPdf(true)
    setProgressoPdf({ atual: 0, total: estudantesDaEscola.length })

    // Aguarda um pouco para os componentes montarem e as imagens (logos/fotos) carregarem
    await new Promise((r) => setTimeout(r, 2000))

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const cardWidth = 90
      const cardHeight = 120
      const marginX = (pageWidth - cardWidth) / 2
      const firstY = 15
      const gapY = 15

      let capturadas = 0
      for (let i = 0; i < estudantesDaEscola.length; i++) {
        const refEl = credenciaisRefs.current[i]
        if (!refEl) {
          console.warn(`Ref não encontrada para credencial ${i}`)
          continue
        }

        const cardEl = refEl.querySelector?.('.cracha-card') || refEl
        cardEl.scrollIntoView({ behavior: 'instant', block: 'center' })
        await new Promise((r) => setTimeout(r, 150))

        const canvas = await html2canvas(cardEl, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          onclone: (_clonedDoc, clonedEl) => {
            if (clonedEl) {
              clonedEl.style.overflow = 'visible'
              const textArea = clonedEl.querySelector('[data-credencial-texto]')
              if (textArea) textArea.style.overflow = 'visible'
            }
          },
        })
        const imgData = canvas.toDataURL('image/png')

        const indexInPage = i % 2
        if (i > 0 && indexInPage === 0) {
          doc.addPage()
        }

        const y = indexInPage === 0 ? firstY : firstY + cardHeight + gapY
        doc.addImage(imgData, 'PNG', marginX, y, cardWidth, cardHeight)
        capturadas++
        setProgressoPdf({ atual: capturadas, total: estudantesDaEscola.length })
      }

      if (capturadas === 0) {
        alert('Não foi possível capturar as credenciais. Tente novamente.')
        return
      }

      const nomeArquivo = `credenciais-${(escolaParaCredenciais.nome_escola || 'escola').replace(/[^a-zA-Z0-9-_àáâãéêíóôõúç\s]/gi, '_')}.pdf`
      doc.save(nomeArquivo)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar PDF das credenciais. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

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
                className={`flex items-center gap-2 px-4 py-3 rounded-[10px] font-medium text-[0.9375rem] transition-colors border-0 cursor-pointer ${isActive
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
                onNewAluno={canCreateEntities && !cadastroAlunosBloqueado ? () => { setEstudanteParaEditar(null); setModalEstudanteOpen(true) } : undefined}
                onEditAluno={(item) => { setEstudanteParaEditar(item); setModalEstudanteOpen(true) }}
                onDeleteAluno={async (item) => { try { await deleteEstudante(item.id) } catch (e) { alert(e.message) } }}
                onViewAluno={(item) => setEstudanteParaVer(item)}
                showInstituicao={isAdmin}
                escolas={isAdmin ? listaEscolas : []}
              />
              <EstudanteViewModal
                open={!!estudanteParaVer}
                onClose={() => setEstudanteParaVer(null)}
                estudante={estudanteParaVer}
                onEdit={(item) => { setEstudanteParaVer(null); setEstudanteParaEditar(item); setModalEstudanteOpen(true) }}
              />
              <EstudanteAtletaModal
                open={modalEstudanteOpen}
                onClose={() => { setModalEstudanteOpen(false); setEstudanteParaEditar(null) }}
                onSuccess={() => {
                  setModalEstudanteOpen(false)
                  setEstudanteParaEditar(null)
                  fetchEstudantes()
                }}
                estudante={estudanteParaEditar}
              />
            </>
          )}
          {activeTab === 'professores' && (
            <>
              <ProfessoresTecnicosList
                lista={listaProfessores}
                loading={loadingProfessores}
                error={errorProfessores}
                onNewProfessor={canCreateEntities ? () => { setProfessorParaEditar(null); setModalProfessorOpen(true) } : undefined}
                onEditProfessor={(item) => { setProfessorParaEditar(item); setModalProfessorOpen(true) }}
                onDeleteProfessor={async (item) => { try { await deleteProfessor(item.id) } catch (e) { alert(e.message) } }}
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
                onEditEquipe={(item) => { setEquipeParaEditar(item); setModalEquipeOpen(true) }}
                onDeleteEquipe={async (item) => { try { await deleteEquipe(item.id) } catch (e) { alert(e.message) } }}
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
                onGerarCredenciais={(escola) => setEscolaParaCredenciais(escola)}
              />
              <Modal
                isOpen={!!escolaParaCredenciais}
                onClose={() => setEscolaParaCredenciais(null)}
                title="Credenciais da escola"
                subtitle={escolaParaCredenciais?.nome_escola}
                size="md"
                footer={null}
              >
                <div className="px-6 py-8 space-y-6 text-center">
                  <Medal className="w-16 h-16 text-[#0f766e] mx-auto opacity-90" />
                  <div>
                    <h3 className="text-xl font-bold text-[#042f2e] mb-2">Pronto para gerar credenciais</h3>
                    <p className="text-[0.9375rem] text-[#64748b] m-0">
                      Foram encontrados <strong>{listaEstudantes.filter((e) => escolaParaCredenciais && Number(e.escola_id) === Number(escolaParaCredenciais.id)).length} estudantes</strong> vinculados a esta escola.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-full px-4 py-3 rounded-xl bg-[#0f766e] text-white hover:bg-[#0d6961] border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-medium text-[1rem] shadow-sm flex items-center justify-center gap-2"
                    onClick={handleGerarPdfCredenciaisEscola}
                    disabled={gerandoPdf}
                  >
                    {gerandoPdf ? 'Processando...' : 'Gerar PDF de Credenciais'}
                  </button>
                </div>

                {/* Contêiner "escondido" que renderiza as credenciais silenciosamente para o html2canvas ler */}
                <div
                  className="fixed top-0 left-0 w-0 h-0 opacity-[0.01] pointer-events-none -z-[50] overflow-visible"
                  data-bulk-root
                >
                  {listaEstudantes
                    .filter((e) => escolaParaCredenciais && Number(e.escola_id) === Number(escolaParaCredenciais.id))
                    .map((estudante, index) => (
                      <CredencialCrachaPrint
                        key={estudante.id}
                        ref={(el) => {
                          if (el) credenciaisRefs.current[index] = el
                        }}
                        estudante={estudante}
                        showToolbar={false}
                        layoutMode="single"
                        disablePrintStyles
                      />
                    ))}
                </div>
              </Modal>
            </>
          )}
        </div>
      </div>

      {gerandoPdf &&
        createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="bg-white rounded-2xl px-12 py-10 flex flex-col items-center gap-6 shadow-2xl border border-[#f1f5f9] max-w-sm w-full text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 border-[4px] border-[#e2e8f0] border-t-[#0f766e] border-r-[#0f766e] rounded-full animate-spin shadow-sm" />
              </div>
              <div className="w-full space-y-2">
                <h3 className="text-[1.25rem] font-bold text-[#0f766e] m-0">Gerando PDF</h3>
                <p className="text-[0.9375rem] text-[#64748b] m-0">
                  Processando {progressoPdf.atual} de {progressoPdf.total} credenciais...
                </p>
                <div className="w-full bg-[#f1f5f9] h-2.5 rounded-full overflow-hidden mt-4 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#0f766e] to-[#0d9488] transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(2, (progressoPdf.atual / (progressoPdf.total || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[0.8125rem] text-[#94a3b8] m-0 mt-4 px-2 tracking-wide font-medium">
                  Por favor, aguarde.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
