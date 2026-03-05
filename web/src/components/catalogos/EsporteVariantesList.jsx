import { useState } from 'react'
import { Layers, Search, Plus, Trash2 } from 'lucide-react'
import { Popconfirm, Input, Button } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'
import useEsporteVariantes from '../../hooks/useEsporteVariantes'

export default function EsporteVariantesList({
  onNewVariante,
  variantes: variantesProp,
  loading: loadingProp,
  error: errorProp,
  fetchVariantes: fetchVariantesProp,
  deleteVariante: deleteVarianteProp,
}) {
  const hookState = useEsporteVariantes()
  const variantes = variantesProp ?? hookState.variantes
  const loading = loadingProp ?? hookState.loading
  const error = errorProp ?? hookState.error
  const fetchVariantes = fetchVariantesProp ?? hookState.fetchVariantes
  const deleteVariante = deleteVarianteProp ?? hookState.deleteVariante

  const [searchTerm, setSearchTerm] = useState('')

  const filteredVariantes = variantes.filter((v) => {
    const term = searchTerm.toLowerCase()
    return (
      !searchTerm ||
      v.esporte_nome?.toLowerCase().includes(term) ||
      v.categoria_nome?.toLowerCase().includes(term) ||
      v.naipe_nome?.toLowerCase().includes(term) ||
      v.tipo_modalidade_nome?.toLowerCase().includes(term)
    )
  })

  const handleDelete = async (v) => {
    try {
      await deleteVariante(v.id)
      fetchVariantes()
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const formatLabel = (v) =>
    `${v.esporte_nome} • ${v.categoria_nome} • ${v.naipe_nome} • ${v.tipo_modalidade_nome}`

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Total de Variantes</p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">{variantes.length}</p>
          </div>
          <Layers size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por esporte, categoria, naipe ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
          />
        </div>
        {onNewVariante && (
          <Button type="primary" onClick={onNewVariante} icon={<Plus size={18} />}>
            Nova Variante
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
          {filteredVariantes.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhuma variante encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o filtro de busca'
                  : 'Crie esportes, categorias e variantes para montar equipes'}
              </p>
              {onNewVariante && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95"
                  onClick={onNewVariante}
                >
                  <Plus size={18} className="shrink-0" />
                  Criar Variante
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Esporte
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Categoria
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Naipe
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Tipo
                    </th>
                    <th className="w-[80px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariantes.map((v) => (
                    <tr key={v.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="font-semibold text-[#042f2e] flex items-center gap-2">
                          <ModalidadeIcon icone={v.esporte_icone} size={18} className="text-[#0f766e] shrink-0" />
                          {v.esporte_nome}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {v.categoria_nome}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {v.naipe_nome}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {v.tipo_modalidade_nome}
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <Popconfirm
                          title="Excluir variante"
                          description={`Excluir "${formatLabel(v)}"?`}
                          onConfirm={() => handleDelete(v)}
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
