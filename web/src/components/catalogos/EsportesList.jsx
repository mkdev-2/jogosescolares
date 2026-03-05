import { useState, useEffect } from 'react'
import { Activity, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Popconfirm, Input, Button } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'
import useEsportes from '../../hooks/useEsportes'

export default function EsportesList({
  onNewEsporte,
  onEditEsporte,
  esportes: esportesProp,
  loading: loadingProp,
  error: errorProp,
  fetchEsportes: fetchEsportesProp,
  deleteEsporte: deleteEsporteProp,
}) {
  const hookState = useEsportes()
  const esportes = esportesProp ?? hookState.esportes
  const loading = loadingProp ?? hookState.loading
  const error = errorProp ?? hookState.error
  const fetchEsportes = fetchEsportesProp ?? hookState.fetchEsportes
  const deleteEsporte = deleteEsporteProp ?? hookState.deleteEsporte

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEsportes({ search: searchTerm })
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchTerm, fetchEsportes])

  const handleDelete = async (esporte) => {
    try {
      await deleteEsporte(esporte.id)
      fetchEsportes({ search: searchTerm })
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const filteredEsportes = esportes.filter((e) => {
    const matchSearch =
      !searchTerm ||
      e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Esportes
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {esportes.length}
            </p>
          </div>
          <Activity size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
          />
        </div>
        {onNewEsporte && (
          <Button type="primary" onClick={onNewEsporte} icon={<Plus size={18} />}>
            Novo Esporte
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[10px]">
          <p className="m-0">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b]">
          <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
          <p className="m-0">Carregando...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredEsportes.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhum esporte encontrado
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o filtro de busca'
                  : 'Comece criando um novo esporte'}
              </p>
              {onNewEsporte && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewEsporte}
                >
                  <Plus size={18} className="shrink-0" />
                  Criar Esporte
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Máx. Atletas
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Requisitos
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Status
                    </th>
                    <th className="w-[100px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEsportes.map((e) => (
                    <tr key={e.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#042f2e] flex items-center gap-2">
                            <ModalidadeIcon icone={e.icone} size={18} className="text-[#0f766e] shrink-0" />
                            {e.nome}
                          </span>
                          {e.descricao && (
                            <span className="text-[0.8125rem] text-[#64748b] max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {e.descricao}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {e.limite_atletas ?? '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {e.requisitos || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span
                          className={`inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium ${
                            e.ativa
                              ? 'bg-[#ccfbf1] text-[#0f766e]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {e.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <div className="flex justify-end gap-2">
                          {onEditEsporte && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onEditEsporte(e)}
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <Popconfirm
                            title="Excluir esporte"
                            description={`Tem certeza que deseja excluir o esporte "${e.nome}"?`}
                            onConfirm={() => handleDelete(e)}
                            okText="Sim, excluir"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
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
        </>
      )}
    </div>
  )
}
