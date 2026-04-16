import { useState, useEffect } from 'react'
import { Modal, Button, Alert } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { Trophy, ClipboardList } from 'lucide-react'
import EsportesList from '../components/catalogos/EsportesList'
import EsporteModal from '../components/catalogos/EsporteModal'
import ModalidadesForm from '../components/catalogos/ModalidadesForm'
import Campeonatos from './Campeonatos'
import useEsportes from '../hooks/useEsportes'
import useEsporteVariantes from '../hooks/useEsporteVariantes'
import { useAuth } from '../contexts/AuthContext'
import { esportesService } from '../services/esportesService'
import { esporteVariantesService } from '../services/esporteVariantesService'
import { escolasService } from '../services/escolasService'
import { configuracoesService } from '../services/configuracoesService'
import ModalTermoAtualizado from '../components/catalogos/ModalTermoAtualizado'

export default function Atividades() {
  const { user } = useAuth()
  const isDiretor = ['DIRETOR', 'COORDENADOR'].includes(user?.role)
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'esportes'
  const activeTab = tabFromUrl === 'campeonatos' && isAdmin ? 'campeonatos' : 'esportes'
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
  const [prazoEditarModalidadesEncerrado, setPrazoEditarModalidadesEncerrado] = useState(false)
  const [dataLimiteEditarModalidades, setDataLimiteEditarModalidades] = useState(null)
  const [prazoModalidadesPagina, setPrazoModalidadesPagina] = useState(null)
  const [prazoModalidadesEncerradoPagina, setPrazoModalidadesEncerradoPagina] = useState(false)
  
  const [escolaDetalhes, setEscolaDetalhes] = useState(null)
  const [modalTermoOpen, setModalTermoOpen] = useState(false)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)

  useEffect(() => {
    if (!isDiretor || !user?.escola_id) return
    
    const fetchDados = async () => {
      setLoadingDetalhes(true)
      try {
        const [config, detalhes] = await Promise.all([
          configuracoesService.getApp(),
          escolasService.getDetalhes(user.escola_id)
        ])

        setEscolaDetalhes(detalhes)
        
        const limite = config?.diretor_editar_modalidades_data_limite
        const str = limite && String(limite).trim().slice(0, 10)
        if (str) {
          setPrazoModalidadesPagina(str)
          const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)
          const [y, m, d] = str.split('-').map(Number)
          const dataLimite = new Date(y, m - 1, d)
          setPrazoModalidadesEncerradoPagina(hoje > dataLimite)
        }
      } catch (err) {
        console.error('Erro ao carregar dados da escola:', err)
      } finally {
        setLoadingDetalhes(false)
      }
    }

    fetchDados()
  }, [isDiretor, user?.escola_id])

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
    setPrazoEditarModalidadesEncerrado(false)
    setDataLimiteEditarModalidades(null)
    setModalModalidadesOpen(true)
  }

  useEffect(() => {
    if (!modalModalidadesOpen && !modalTermoOpen) return
    setLoadingVariantesTodas(true)
    const dataLimiteStr = (v) => (v && String(v).trim().slice(0, 10)) || null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    Promise.all([
      esporteVariantesService.list(),
      isDiretor ? configuracoesService.getApp() : Promise.resolve(null),
    ])
      .then(([variantesData, configApp]) => {
        setVariantesTodas(Array.isArray(variantesData) ? variantesData : [])
        if (isDiretor && configApp) {
          const limite = dataLimiteStr(configApp.diretor_editar_modalidades_data_limite)
          setDataLimiteEditarModalidades(limite)
          if (limite) {
            const [y, m, d] = limite.split('-').map(Number)
            const dataLimite = new Date(y, m - 1, d)
            setPrazoEditarModalidadesEncerrado(hoje > dataLimite)
          }
        }
      })
      .catch(() => setVariantesTodas([]))
      .finally(() => setLoadingVariantesTodas(false))
  }, [modalModalidadesOpen, modalTermoOpen, isDiretor])

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
      
      // Recarregar detalhes para que o aviso de termo desatualizado e o conteúdo do termo reflitam a mudança
      const detalhes = await escolasService.getDetalhes(user.escola_id)
      setEscolaDetalhes(detalhes)
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
          {activeTab === 'campeonatos' ? 'Campeonatos' : (isDiretor ? 'Esportes' : 'Atividades')}
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          {activeTab === 'campeonatos'
            ? 'Gerencie a criação e geração de estruturas dos campeonatos por edição e modalidade.'
            : isDiretor
            ? 'Modalidades em que sua escola está vinculada.'
            : 'Gerencie esportes e suas variantes (categoria, naipe e tipo).'}
        </p>
      </header>

      {!isDiretor && (
        <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className={`flex items-center gap-2 px-4 py-3 rounded-[10px] font-medium text-[0.9375rem] transition-colors border-0 cursor-pointer ${activeTab === 'esportes'
                ? 'bg-[#f1f5f9] text-[#0f766e]'
                : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                }`}
            >
              <Trophy size={20} className={activeTab === 'esportes' ? 'text-[#0f766e]' : 'text-[#1e293b]'} />
              <span>Esportes</span>
            </button>
            {/* Campeonatos em desenvolvimento — oculto temporariamente
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSearchParams({ tab: 'campeonatos' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-[10px] font-medium text-[0.9375rem] transition-colors border-0 cursor-pointer ${activeTab === 'campeonatos'
                  ? 'bg-[#f1f5f9] text-[#0f766e]'
                  : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
              >
                <ClipboardList size={20} className={activeTab === 'campeonatos' ? 'text-[#0f766e]' : 'text-[#1e293b]'} />
                <span>Campeonatos</span>
              </button>
            )} */}
          </div>
        </div>
      )}

      {isDiretor && prazoModalidadesPagina && (!prazoModalidadesEncerradoPagina || escolaDetalhes?.termo_desatualizado) && (
        <Alert
          type={prazoModalidadesEncerradoPagina ? 'warning' : 'info'}
          message={
            prazoModalidadesEncerradoPagina 
              ? 'Ação Necessária: Atualizar Termo de Adesão' 
              : 'Prazo para editar modalidades'
          }
          description={
            <div className="flex flex-col gap-3">
              <p className="m-0">
                {prazoModalidadesEncerradoPagina
                  ? 'As modalidades da sua escola sofreram alterações e o termo de adesão inicial está desatualizado. É obrigatório o envio da nova ficha assinada.'
                  : `Você pode editar as modalidades da escola até ${new Date(prazoModalidadesPagina + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}. Após essa data, não será possível alterar.`}
              </p>
              {prazoModalidadesEncerradoPagina && (
                <div>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => setModalTermoOpen(true)}
                  >
                    Gerar e Enviar Termo Atualizado
                  </Button>
                </div>
              )}
            </div>
          }
          showIcon
          className="mb-0"
        />
      )}

      {activeTab === 'esportes' && (
        <div className="bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden -mx-4 sm:mx-0">
          <div className="px-4 py-4 sm:p-6">
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
      )}

      {activeTab === 'campeonatos' && isAdmin && (
        <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-6">
            <Campeonatos embedded />
          </div>
        </div>
      )}

      {isDiretor && (
        <Modal
          title="Editar modalidades da escola"
          open={modalModalidadesOpen}
          onCancel={handleFecharModalModalidades}
          footer={[
            <Button key="cancel" onClick={handleFecharModalModalidades} disabled={salvandoModalidades}>
              Cancelar
            </Button>,
            <Button
              key="save"
              type="primary"
              loading={salvandoModalidades}
              onClick={handleSalvarModalidades}
              disabled={prazoEditarModalidadesEncerrado}
            >
              Salvar
            </Button>,
          ]}
          width={640}
          destroyOnClose
        >
          {prazoEditarModalidadesEncerrado && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <strong>Prazo encerrado.</strong> O período para editar as modalidades da escola encerrou em{' '}
              {dataLimiteEditarModalidades
                ? new Date(dataLimiteEditarModalidades + 'T12:00:00').toLocaleDateString('pt-BR')
                : ''}
              . Não é possível salvar alterações. Entre em contato com a administração se precisar de ajustes.
            </div>
          )}
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

      {isDiretor && escolaDetalhes && (
        <ModalTermoAtualizado
          open={modalTermoOpen}
          onClose={() => setModalTermoOpen(false)}
          onSuccess={async () => {
            const res = await escolasService.getDetalhes(user.escola_id)
            setEscolaDetalhes(res)
          } }
          escolaId={user.escola_id}
          edicaoId={escolaDetalhes.edicao_id}
          variantes={variantesTodas}
          dados={{
            nomeRazaoSocial: escolaDetalhes.escola.nome_escola,
            inep: escolaDetalhes.escola.inep,
            cnpj: escolaDetalhes.escola.cnpj,
            endereco: escolaDetalhes.escola.endereco,
            cidade: escolaDetalhes.escola.cidade,
            uf: escolaDetalhes.escola.uf,
            email: escolaDetalhes.escola.email,
            telefone: escolaDetalhes.escola.telefone,
            diretorNome: escolaDetalhes.diretor?.nome,
            diretorCpf: escolaDetalhes.diretor?.cpf,
            diretorRg: escolaDetalhes.escola.dados_diretor?.rg,
            coordenadorNome: escolaDetalhes.escola.dados_coordenador?.nome,
            coordenadorCpf: escolaDetalhes.escola.dados_coordenador?.cpf,
            coordenadorTelefone: escolaDetalhes.escola.dados_coordenador?.telefone,
            varianteIds: escolaDetalhes.modalidades.map(m => m.variante_id)
          }}
        />
      )}
    </div>
  )
}
