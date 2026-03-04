import { useState } from 'react'
import { LayoutGrid, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Popconfirm } from 'antd'
import useCategorias from '../../hooks/useCategorias'

export default function CategoriasList({
  onNewCategoria,
  onEditCategoria,
  categorias: categoriasProp,
  loading: loadingProp,
  error: errorProp,
  fetchCategorias: fetchCategoriasProp,
  deleteCategoria: deleteCategoriaProp,
}) {
  const hookState = useCategorias()
  const categorias = categoriasProp ?? hookState.categorias
  const loading = loadingProp ?? hookState.loading
  const error = errorProp ?? hookState.error
  const fetchCategorias = fetchCategoriasProp ?? hookState.fetchCategorias
  const deleteCategoria = deleteCategoriaProp ?? hookState.deleteCategoria

  const [searchTerm, setSearchTerm] = useState('')

  const filteredCategorias = categorias.filter((c) => {
    const matchSearch =
      !searchTerm ||
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  const handleDelete = async (categoria) => {
    try {
      await deleteCategoria(categoria.id)
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Categorias
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {categorias.length}
            </p>
          </div>
          <LayoutGrid size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e2e8f0] rounded-[10px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
        </div>
        {onNewCategoria && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
            onClick={onNewCategoria}
          >
            <Plus size={18} className="shrink-0" />
            Nova Categoria
          </button>
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
          {filteredCategorias.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhuma categoria encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Comece criando uma nova categoria'}
              </p>
              {onNewCategoria && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewCategoria}
                >
                  <Plus size={18} className="shrink-0" />
                  Criar Categoria
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      ID
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Descrição
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
                  {filteredCategorias.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] font-mono text-[#475569] border-b border-[#f1f5f9]">
                        <span className="block max-w-[120px] overflow-hidden text-ellipsis" title={c.id}>
                          {c.id?.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        {c.nome}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="block max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {c.descricao || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span
                          className={`inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium ${
                            c.ativa
                              ? 'bg-[#ccfbf1] text-[#0f766e]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {c.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <div className="flex justify-end gap-2">
                          {onEditCategoria && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onEditCategoria(c)}
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <Popconfirm
                            title="Excluir categoria"
                            description={`Tem certeza que deseja excluir a categoria "${c.nome}"?`}
                            onConfirm={() => handleDelete(c)}
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
