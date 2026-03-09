import { useState, useEffect } from 'react'
import { School, Search, CheckCircle, Loader2, XCircle, Building2, User, Users, Trophy, CheckCircle2, XOctagon } from 'lucide-react'
import { Popconfirm, Input } from 'antd'
import { escolasService } from '../services/escolasService'
import { esporteVariantesService } from '../services/esporteVariantesService'
import Modal from '../components/ui/Modal'

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

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[#0f766e] shrink-0" />
        <h3 className="text-[0.9375rem] font-semibold text-[#334155] m-0">{title}</h3>
      </div>
      <div className="text-[0.875rem] text-[#475569] space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-[#64748b] shrink-0">{label}:</span>
      <span className="text-[#1e293b]">{value || '-'}</span>
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

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Solicitações pendentes</p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">{solicitacoes.length}</p>
          </div>
          <School size={28} className="text-[#0f766e]" />
        </div>
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Solicitações aprovadas</p>
            <p className="text-[1.5rem] font-bold text-[#16a34a] m-0">{solicitacoesAprovadas.length}</p>
          </div>
          <CheckCircle2 size={28} className="text-[#16a34a]" />
        </div>
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Solicitações recusadas</p>
            <p className="text-[1.5rem] font-bold text-[#dc2626] m-0">{solicitacoesNegadas.length}</p>
          </div>
          <XOctagon size={28} className="text-[#dc2626]" />
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
              <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <table className="w-full text-left text-[0.9375rem]">
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
                          <div className="flex items-center justify-end gap-2">
                            <Popconfirm
                              title="Negar solicitação"
                              description="Confirma que deseja negar esta solicitação? Os dados não serão cadastrados no sistema."
                              onConfirm={() => handleNegar(a.id)}
                              okText="Sim, negar"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                type="button"
                                disabled={aprovandoId === a.id || negandoId === a.id}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {negandoId === a.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
                                )}
                                Negar
                              </button>
                            </Popconfirm>
                            <button
                              type="button"
                              disabled={aprovandoId === a.id || negandoId === a.id}
                              onClick={() => setModalSolicitacao(a)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-sm font-semibold bg-[#0f766e] text-white hover:bg-[#0d9488] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {aprovandoId === a.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                              Aprovar
                            </button>
                          </div>
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
              <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <table className="w-full text-left text-[0.9375rem]">
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
                    {filteredEncerradas.map((a) => (
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
            <div className="flex items-center justify-end gap-3">
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold bg-[#0f766e] text-white hover:bg-[#0d9488] disabled:opacity-60 disabled:cursor-not-allowed"
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
            {modalSolicitacao.created_at && (
              <p className="text-[0.8125rem] text-[#64748b] m-0 -mt-2 mb-2">
                Solicitado em {new Date(modalSolicitacao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            <SectionCard icon={Building2} title="Instituição">
              <InfoRow label="Nome/Razão Social" value={modalSolicitacao.nome_escola} />
              <InfoRow label="INEP" value={modalSolicitacao.inep} />
              <InfoRow label="CNPJ" value={formatCnpj(modalSolicitacao.cnpj)} />
              <InfoRow label="Endereço" value={modalSolicitacao.endereco} />
              <InfoRow label="Cidade" value={modalSolicitacao.cidade} />
              <InfoRow label="UF" value={modalSolicitacao.uf} />
              <InfoRow label="E-mail" value={modalSolicitacao.email} />
              <InfoRow label="Telefone" value={formatTelefone(modalSolicitacao.telefone)} />
            </SectionCard>

            <SectionCard icon={User} title="Diretor">
              <InfoRow label="Nome" value={modalSolicitacao.dados_diretor?.nome} />
              <InfoRow label="CPF" value={formatCpf(modalSolicitacao.dados_diretor?.cpf)} />
              <InfoRow label="RG" value={modalSolicitacao.dados_diretor?.rg} />
            </SectionCard>

            <SectionCard icon={Users} title="Coordenador de Esportes">
              <InfoRow label="Nome" value={modalSolicitacao.dados_coordenador?.nome} />
              <InfoRow label="CPF" value={formatCpf(modalSolicitacao.dados_coordenador?.cpf)} />
              <InfoRow label="RG" value={modalSolicitacao.dados_coordenador?.rg} />
              <InfoRow label="Endereço" value={modalSolicitacao.dados_coordenador?.endereco} />
              <InfoRow label="E-mail" value={modalSolicitacao.dados_coordenador?.email} />
              <InfoRow label="Telefone" value={formatTelefone(modalSolicitacao.dados_coordenador?.telefone)} />
            </SectionCard>

            <SectionCard icon={Trophy} title="Modalidades">
              {(() => {
                const ids = modalSolicitacao.modalidades_adesao?.variante_ids || []
                if (ids.length === 0) return <p className="m-0 text-[#64748b]">Nenhuma modalidade selecionada</p>
                return (
                  <ul className="list-none m-0 p-0 space-y-1">
                    {ids.map((id) => (
                      <li key={id} className="text-[#1e293b]">
                        • {variantesMap[id] || id}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </SectionCard>
          </div>
        )}
      </Modal>
    </div>
  )
}
