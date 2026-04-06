import { useState, useEffect } from 'react'
import { School, Search, CheckCircle, Loader2, XCircle, Building2, User, Users, Trophy, CheckCircle2, XOctagon, Eye, FileText, ExternalLink } from 'lucide-react'
import { Popconfirm, Input, Pagination } from 'antd'
import { escolasService } from '../services/escolasService'
import { esporteVariantesService } from '../services/esporteVariantesService'
import { getStorageUrl } from '../services/storageService'
import Modal from '../components/ui/Modal'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'

function formatCpf(v) {
  if (!v) return '-'
  const d = String(v).replace(/\D/g, '')
  if (d.length < 11) return d
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatTelefone(v) {
  if (!v) return '-'
  const d = String(v).replace(/\D/g, '')
  if (d.length <= 2) return d ? `(${d}` : '-'
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function formatCnpj(v) {
  if (!v) return '-'
  const d = String(v).replace(/\D/g, '')
  if (d.length < 14) return d || '-'
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
}

function SectionCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] p-4 h-full flex flex-col ${className}`}>
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Icon size={18} className="text-[#0f766e] shrink-0" />
        <h3 className="text-[0.9375rem] font-semibold text-[#334155] m-0">{title}</h3>
      </div>
      <div className="text-[0.875rem] text-[#475569] space-y-2 flex-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-[#64748b] font-medium shrink-0">{label}:</span>
      <span className="text-[#1e293b] break-words break-all sm:break-normal">{value || '-'}</span>
    </div>
  )
}

export default function UsuariosPendentes({ embedded }) {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [solicitacoesAprovadas, setSolicitacoesAprovadas] = useState([])
  const [solicitacoesNegadas, setSolicitacoesNegadas] = useState([])
  const [variantes, setVariantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPageEncerradas, setCurrentPageEncerradas] = useState(1)
  const [pageSizeEncerradas, setPageSizeEncerradas] = useState(10)
  const [modalSolicitacao, setModalSolicitacao] = useState(null)
  const [aprovandoId, setAprovandoId] = useState(null)
  const [negandoId, setNegandoId] = useState(null)

  const fetchSolicitacoes = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      escolasService.listAdesoes('PENDENTE'),
      escolasService.listAdesoes('APROVADA'),
      escolasService.listAdesoes('REJEITADA'),
    ])
      .then(([pendentes, aprovadas, negadas]) => {
        setSolicitacoes(pendentes)
        setSolicitacoesAprovadas(aprovadas)
        setSolicitacoesNegadas(negadas)
      })
      .catch((err) => setError(err.message || 'Erro ao carregar solicitações'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSolicitacoes()
  }, [])

  useEffect(() => {
    esporteVariantesService.list().then(setVariantes).catch(() => setVariantes([]))
  }, [])

  useEffect(() => {
    setCurrentPageEncerradas(1)
  }, [searchTerm])

  const handleNegar = async (solicitacaoId) => {
    setNegandoId(solicitacaoId)
    try {
      await escolasService.negarSolicitacao(solicitacaoId)
      setModalSolicitacao(null)
      fetchSolicitacoes()
    } catch (err) {
      alert(err.message || 'Erro ao negar')
    } finally {
      setNegandoId(null)
    }
  }

  const handleAprovarNoModal = async () => {
    if (!modalSolicitacao?.id) return
    setAprovandoId(modalSolicitacao.id)
    try {
      await escolasService.aprovarAdesao(modalSolicitacao.id)
      setModalSolicitacao(null)
      fetchSolicitacoes()
    } catch (err) {
      alert(err.message || 'Erro ao aprovar')
    } finally {
      setAprovandoId(null)
    }
  }

  const variantesMap = variantes.reduce((acc, v) => {
    acc[v.id] = `${v.esporte_nome || 'Esporte'} • ${v.naipe_nome || ''} • ${v.categoria_nome || ''}`
    return acc
  }, {})

  const filterBySearch = (list) => {
    if (!searchTerm) return list
    const term = searchTerm.toLowerCase()
    return list.filter(
      (a) =>
        (a.nome_escola && a.nome_escola.toLowerCase().includes(term)) ||
        (a.inep && a.inep.includes(searchTerm)) ||
        (a.dados_diretor?.nome && a.dados_diretor.nome.toLowerCase().includes(term)) ||
        (a.dados_coordenador?.nome && a.dados_coordenador.nome.toLowerCase().includes(term))
    )
  }
  const filtered = filterBySearch(solicitacoes)
  const filteredEncerradas = [
    ...filterBySearch(solicitacoesAprovadas).map((a) => ({ ...a, _status: 'APROVADA' })),
    ...filterBySearch(solicitacoesNegadas).map((a) => ({ ...a, _status: 'REJEITADA' })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  const paginatedEncerradas = filteredEncerradas.slice(
    (currentPageEncerradas - 1) * pageSizeEncerradas,
    currentPageEncerradas * pageSizeEncerradas
  )

  useEffect(() => {
    setCurrentPageEncerradas(1)
  }, [searchTerm])

  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <header className="flex flex-col gap-1">
          <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
            Solicitações pendentes
          </h1>
          <p className="text-[0.9375rem] text-[#64748b] m-0">
            Solicitações de cadastro de escolas aguardando aprovação. Ao aprovar, a escola e o usuário diretor são criados no sistema.
          </p>
        </header>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1 min-w-0">
        <div className="flex items-center justify-center sm:justify-between px-2 sm:px-5 py-3 sm:py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center sm:text-left">
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] min-[375px]:text-[10px] sm:text-[0.875rem] text-[#64748b] m-0 mb-0.5 sm:mb-1 uppercase font-bold tracking-wider truncate w-full" title="Solicitações pendentes">
              Pendentes
            </p>
            <p className="text-[1.125rem] sm:text-[1.5rem] font-extrabold text-[#042f2e] m-0 leading-tight">{solicitacoes.length}</p>
          </div>
          <div className="shrink-0 p-1.5 sm:p-3 bg-teal-50 rounded-lg sm:rounded-xl hidden sm:block">
            <School className="w-5 h-5 sm:w-7 sm:h-7 text-[#0f766e]" />
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-between px-2 sm:px-5 py-3 sm:py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center sm:text-left">
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] min-[375px]:text-[10px] sm:text-[0.875rem] text-[#64748b] m-0 mb-0.5 sm:mb-1 uppercase font-bold tracking-wider truncate w-full" title="Solicitações aprovadas">
              Aprovadas
            </p>
            <p className="text-[1.125rem] sm:text-[1.5rem] font-extrabold text-[#16a34a] m-0 leading-tight">{solicitacoesAprovadas.length}</p>
          </div>
          <div className="shrink-0 p-1.5 sm:p-3 bg-green-50 rounded-lg sm:rounded-xl hidden sm:block">
            <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-[#16a34a]" />
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-between px-2 sm:px-5 py-3 sm:py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center sm:text-left">
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] min-[375px]:text-[10px] sm:text-[0.875rem] text-[#64748b] m-0 mb-0.5 sm:mb-1 uppercase font-bold tracking-wider truncate w-full" title="Solicitações recusadas">
              Recusadas
            </p>
            <p className="text-[1.125rem] sm:text-[1.5rem] font-extrabold text-[#dc2626] m-0 leading-tight">{solicitacoesNegadas.length}</p>
          </div>
          <div className="shrink-0 p-1.5 sm:p-3 bg-red-50 rounded-lg sm:rounded-xl hidden sm:block">
            <XOctagon className="w-5 h-5 sm:w-7 sm:h-7 text-[#dc2626]" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Buscar por escola, INEP ou nome do diretor/coordenador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<Search size={18} className="text-[#64748b]" />}
          size="large"
        />
      </div>

      {error && (
        <div className="px-4 py-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[10px]">
          <p className="m-0">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b]">
          <Loader2 size={32} className="animate-spin" />
          <p className="m-0">Carregando solicitações...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Solicitações pendentes */}
          <div>
            <h2 className="text-[1rem] font-semibold text-[#334155] mb-3">Solicitações pendentes</h2>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b] bg-white rounded-[12px] border border-[#f1f5f9]">
                <School size={48} className="opacity-50" />
                <p className="m-0 text-center">
                  {solicitacoes.length === 0
                    ? 'Nenhuma solicitação pendente no momento.'
                    : 'Nenhum resultado para a busca.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0">
                <table className="w-full text-left text-[0.9375rem] min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc]">
                      <th className="py-3 px-4 font-semibold text-[#334155]">Escola</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">INEP</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Diretor</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Coordenador</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Data</th>
                      <th className="py-3 px-4 font-semibold text-[#334155] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]/50">
                        <td className="py-3 px-4 font-medium text-[#0f172a]">{a.nome_escola || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">{a.inep || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">
                          {a.dados_diretor?.nome || '-'}
                          {a.dados_diretor?.cpf && (
                            <span className="block text-xs text-[#94a3b8]">CPF: {a.dados_diretor.cpf}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#475569]">{a.dados_coordenador?.nome || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setModalSolicitacao(a)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-sm font-semibold border border-[#0f766e] text-[#0f766e] hover:bg-teal-50"
                          >
                            <Eye size={16} />
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Solicitações aprovadas e recusadas */}
          <div>
            <h2 className="text-[1rem] font-semibold text-[#334155] mb-3">Solicitações aprovadas e recusadas</h2>
            {filteredEncerradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-[#64748b] bg-white rounded-[12px] border border-[#f1f5f9]">
                <CheckCircle2 size={40} className="opacity-50" />
                <p className="m-0 text-center text-sm">
                  {solicitacoesAprovadas.length === 0 && solicitacoesNegadas.length === 0
                    ? 'Nenhuma solicitação aprovada ou recusada.'
                    : 'Nenhum resultado para a busca.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0">
                <table className="w-full text-left text-[0.9375rem] min-w-[900px]">
                  <thead>
                    <tr className="border-b-2 border-[#f1f5f9] bg-[#f8fafc]">
                      <th className="py-3 px-4 font-semibold text-[#334155]">Status</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Escola</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">INEP</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Diretor</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Coordenador</th>
                      <th className="py-3 px-4 font-semibold text-[#334155]">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEncerradas.map((a) => (
                      <tr key={`${a._status}-${a.id}`} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]/50">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold ${
                              a._status === 'APROVADA'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {a._status === 'APROVADA' ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XOctagon size={14} />
                            )}
                            {a._status === 'APROVADA' ? 'Aprovada' : 'Recusada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0f172a]">{a.nome_escola || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">{a.inep || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">
                          {a.dados_diretor?.nome || '-'}
                          {a.dados_diretor?.cpf && (
                            <span className="block text-xs text-[#94a3b8]">CPF: {a.dados_diretor.cpf}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#475569]">{a.dados_coordenador?.nome || '-'}</td>
                        <td className="py-3 px-4 text-[#475569]">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredEncerradas.length > pageSizeEncerradas && (
              <div className="mt-4 flex justify-end">
                <Pagination
                  size="small"
                  current={currentPageEncerradas}
                  total={filteredEncerradas.length}
                  pageSize={pageSizeEncerradas}
                  pageSizeOptions={[10, 20, 50, 100]}
                  showSizeChanger
                  onChange={(page, size) => {
                    setCurrentPageEncerradas(page)
                    setPageSizeEncerradas(size)
                  }}
                  showTotal={(total) => `Total: ${total} solicitações`}
                />
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={!!modalSolicitacao}
        onClose={() => !aprovandoId && !negandoId && setModalSolicitacao(null)}
        title="Detalhes da solicitação"
        subtitle={modalSolicitacao?.nome_escola}
        size="xl"
        footer={
          modalSolicitacao && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 w-full">
              <Popconfirm
                title="Negar solicitação"
                description="Confirma que deseja negar esta solicitação? Os dados não serão cadastrados no sistema."
                onConfirm={() => handleNegar(modalSolicitacao.id)}
                okText="Sim, negar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <button
                  type="button"
                  disabled={aprovandoId === modalSolicitacao.id || negandoId === modalSolicitacao.id}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {negandoId === modalSolicitacao.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Negar
                </button>
              </Popconfirm>
              <button
                type="button"
                disabled={aprovandoId === modalSolicitacao.id || negandoId === modalSolicitacao.id}
                onClick={handleAprovarNoModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold bg-[#0f766e] text-white hover:bg-[#0d9488] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {aprovandoId === modalSolicitacao.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Aprovar
              </button>
            </div>
          )
        }
      >
        {modalSolicitacao && (
          <div className="space-y-4">
            <div>
              <p className="text-[0.875rem] text-[#64748b] m-0 -mt-1 mb-1">
                Revise todas as informações enviadas no formulário de cadastro e decida por aprovar ou negar a solicitação.
              </p>
              {modalSolicitacao.created_at && (
                <p className="text-[0.8125rem] text-[#64748b] m-0 mb-2">
                  Solicitado em {new Date(modalSolicitacao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <SectionCard icon={Building2} title="Instituição">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                    <InfoRow label="Nome/Razão Social" value={modalSolicitacao.nome_escola} />
                    <InfoRow label="INEP" value={modalSolicitacao.inep} />
                    <InfoRow label="CNPJ" value={formatCnpj(modalSolicitacao.cnpj)} />
                    <InfoRow label="Endereço" value={modalSolicitacao.endereco} />
                    <InfoRow label="Cidade" value={modalSolicitacao.cidade} />
                    <InfoRow label="UF" value={modalSolicitacao.uf} />
                    <InfoRow label="E-mail" value={modalSolicitacao.email} />
                    <InfoRow label="Telefone" value={formatTelefone(modalSolicitacao.telefone)} />
                  </div>
                </SectionCard>
              </div>

              <div className="col-span-1">
                <SectionCard icon={User} title="Diretor">
                  <InfoRow label="Nome" value={modalSolicitacao.dados_diretor?.nome} />
                  <InfoRow label="CPF" value={formatCpf(modalSolicitacao.dados_diretor?.cpf)} />
                  <InfoRow label="RG" value={modalSolicitacao.dados_diretor?.rg} />
                </SectionCard>
              </div>

              <div className="col-span-1">
                <SectionCard icon={Users} title="Coordenador de Esportes">
                  <InfoRow label="Nome" value={modalSolicitacao.dados_coordenador?.nome} />
                  <InfoRow label="CPF" value={formatCpf(modalSolicitacao.dados_coordenador?.cpf)} />
                  <InfoRow label="RG" value={modalSolicitacao.dados_coordenador?.rg} />
                  <InfoRow label="Endereço" value={modalSolicitacao.dados_coordenador?.endereco} />
                  <InfoRow label="E-mail" value={modalSolicitacao.dados_coordenador?.email} />
                  <InfoRow label="Telefone" value={formatTelefone(modalSolicitacao.dados_coordenador?.telefone)} />
                </SectionCard>
              </div>

              <div className="md:col-span-2">
                <SectionCard icon={Trophy} title="Modalidades">
                  {(() => {
                    const ids = modalSolicitacao.modalidades_adesao?.variante_ids || []
                    if (ids.length === 0) return <p className="m-0 text-[#64748b]">Nenhuma modalidade selecionada</p>
                    
                    const variantesSelecionadas = ids
                      .map(id => variantes.find(x => x.id === id))
                      .filter(Boolean)
                    
                    const agrupadas = variantesSelecionadas.reduce((acc, v) => {
                      const esporte = v.esporte_nome || 'Variado'
                      if (!acc[esporte]) acc[esporte] = []
                      acc[esporte].push(v)
                      return acc
                    }, {})

                    return (
                      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar">
                        {Object.entries(agrupadas).map(([esporte, vars]) => (
                          <div
                            key={esporte}
                            className="min-w-[260px] flex-shrink-0 px-4 py-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#0f766e]/30 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-[#f0fdfa] flex items-center justify-center">
                                <Trophy size={16} className="text-[#0f766e]" />
                              </div>
                              <span className="text-sm font-bold text-[#042f2e]">{esporte}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {vars.map((v) => (
                                <span
                                  key={v.id}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] hover:bg-[#e2e8f0] transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                                  <span className="flex-1">{v.categoria_nome}</span>
                                  <span className="text-[#cbd5e1] font-normal">|</span>
                                  <span className="text-[#64748b]">
                                    {v.naipe_nome?.toUpperCase() === 'MASCULINO' ? 'Masculino' : 
                                     v.naipe_nome?.toUpperCase() === 'FEMININO' ? 'Feminino' : v.naipe_nome}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </SectionCard>
              </div>

              {modalSolicitacao.termo_assinatura_url && (
                <div className="md:col-span-2">
                  <SectionCard icon={FileText} title="Termo de Adesão Anexado">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-end pr-1">
                        <a 
                          href={getStorageUrl(modalSolicitacao.termo_assinatura_url)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#0f766e] hover:text-[#0d9488]"
                        >
                          <ExternalLink size={14} /> Abrir em nova guia
                        </a>
                      </div>
                      <div className="w-full bg-[#f8fafc] rounded-[8px] border border-[#cbd5e1] overflow-hidden flex justify-center items-center">
                        {(() => {
                          const url = getStorageUrl(modalSolicitacao.termo_assinatura_url)
                          const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|bmp)(?:\?|$)/)
                          if (isImage) {
                            return <img src={url} alt="Termo de Adesão" className="max-w-full max-h-[500px] object-contain" />
                          }
                          return <iframe src={url} className="w-full h-[500px] border-0" title="Termo de Adesão" />
                        })()}
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
