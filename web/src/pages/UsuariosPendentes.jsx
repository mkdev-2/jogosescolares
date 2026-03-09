import { useState, useEffect } from 'react'
import { School, Search, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Popconfirm, Input } from 'antd'
import { escolasService } from '../services/escolasService'

export default function UsuariosPendentes({ embedded }) {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [aprovandoId, setAprovandoId] = useState(null)
  const [negandoId, setNegandoId] = useState(null)

  const fetchSolicitacoes = () => {
    setLoading(true)
    setError(null)
    escolasService
      .listAdesoes('PENDENTE')
      .then(setSolicitacoes)
      .catch((err) => setError(err.message || 'Erro ao carregar solicitações'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSolicitacoes()
  }, [])

  const handleAprovar = async (solicitacaoId) => {
    setAprovandoId(solicitacaoId)
    try {
      await escolasService.aprovarAdesao(solicitacaoId)
      fetchSolicitacoes()
    } catch (err) {
      alert(err.message || 'Erro ao aprovar')
    } finally {
      setAprovandoId(null)
    }
  }

  const handleNegar = async (solicitacaoId) => {
    setNegandoId(solicitacaoId)
    try {
      await escolasService.negarSolicitacao(solicitacaoId)
      fetchSolicitacoes()
    } catch (err) {
      alert(err.message || 'Erro ao negar')
    } finally {
      setNegandoId(null)
    }
  }

  const filtered = solicitacoes.filter((a) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (a.nome_escola && a.nome_escola.toLowerCase().includes(term)) ||
      (a.inep && a.inep.includes(searchTerm)) ||
      (a.dados_diretor?.nome && a.dados_diretor.nome.toLowerCase().includes(term)) ||
      (a.dados_coordenador?.nome && a.dados_coordenador.nome.toLowerCase().includes(term))
    )
  })

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

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b] bg-white rounded-[12px] border border-[#f1f5f9]">
          <School size={48} className="opacity-50" />
          <p className="m-0 text-center">
            {solicitacoes.length === 0
              ? 'Nenhuma solicitação pendente no momento.'
              : 'Nenhum resultado para a busca.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
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
                        title="Aprovar solicitação"
                        description="Confirma a aprovação? A escola e o usuário diretor serão criados no sistema."
                        onConfirm={() => handleAprovar(a.id)}
                        okText="Sim, aprovar"
                        cancelText="Cancelar"
                      >
                        <button
                          type="button"
                          disabled={aprovandoId === a.id || negandoId === a.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-sm font-semibold bg-[#0f766e] text-white hover:bg-[#0d9488] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {aprovandoId === a.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          Aprovar
                        </button>
                      </Popconfirm>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
