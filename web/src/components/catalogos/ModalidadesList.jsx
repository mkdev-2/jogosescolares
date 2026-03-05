import { useState, useEffect } from 'react'
import { Activity, LayoutGrid, Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react'
import { Popconfirm, Input, Select, Button } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'
import useModalidades from '../../hooks/useModalidades'

export default function ModalidadesList({
  onNewModalidade,
  onEditModalidade,
  modalidades: modalidadesProp,
  loading: loadingProp,
  error: errorProp,
  fetchModalidades: fetchModalidadesProp,
  deleteModalidade: deleteModalidadeProp,
  getEstatisticas: getEstatisticasProp,
}) {
  const hookState = useModalidades()
  const modalidades = modalidadesProp ?? hookState.modalidades
  const loading = loadingProp ?? hookState.loading
  const error = errorProp ?? hookState.error
  const fetchModalidades = fetchModalidadesProp ?? hookState.fetchModalidades
  const deleteModalidade = deleteModalidadeProp ?? hookState.deleteModalidade
  const getEstatisticas = getEstatisticasProp ?? hookState.getEstatisticas

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchModalidades({
        search: searchTerm,
        categoria: filterCategoria || undefined,
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchTerm, filterCategoria, fetchModalidades])

  const handleDelete = async (modalidade) => {
    try {
      await deleteModalidade(modalidade.id)
      fetchModalidades({ search: searchTerm, categoria: filterCategoria })
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const estatisticas = getEstatisticas()
  const categorias = [...new Set(modalidades.map((m) => m.categoria))].filter(Boolean).sort()

  const filteredModalidades = modalidades.filter((m) => {
    const matchSearch =
      !searchTerm ||
      m.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = !filterCategoria || m.categoria === filterCategoria
    return matchSearch && matchCat
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Modalidades
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {estatisticas.total}
            </p>
          </div>
          <Activity size={28} className="text-[#0f766e]" />
        </div>
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Categorias</p>
            <p className="text-[1.5rem] font-bold text-[#0f766e] m-0">
              {Object.keys(estatisticas.porCategoria).length}
            </p>
          </div>
          <LayoutGrid size={28} className="text-[#0f766e]" />
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
        <div className="flex gap-2">
          <Button
            type="default"
            icon={<Filter size={18} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Ocultar filtros' : 'Filtros'}
          </Button>
          {onNewModalidade && (
            <Button type="primary" onClick={onNewModalidade} icon={<Plus size={18} />}>
              Nova Modalidade
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="px-4 py-4 bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0]">
          <label className="block text-[0.875rem] font-semibold text-[#334155] mb-2">
            Categoria
          </label>
          <Select
            value={filterCategoria || undefined}
            onChange={(v) => setFilterCategoria(v || '')}
            placeholder="Todas"
            options={categorias.map((cat) => ({ value: cat, label: cat }))}
            className="min-w-[180px]"
          />
        </div>
      )}

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
          {filteredModalidades.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhuma modalidade encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm || filterCategoria
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando uma nova modalidade'}
              </p>
              {onNewModalidade && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewModalidade}
                >
                  <Plus size={18} className="shrink-0" />
                  Criar Modalidade
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
                      Categoria
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
                  {filteredModalidades.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-[#f8fafc]"
                    >
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#042f2e] flex items-center gap-2">
                            <ModalidadeIcon icone={m.icone} size={18} className="text-[#0f766e] shrink-0" />
                            {m.nome}
                          </span>
                          {m.descricao && (
                            <span className="text-[0.8125rem] text-[#64748b] max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {m.descricao}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium bg-[#e2e8f0] text-[#475569]">
                          {m.categoria}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {m.limite_atletas ?? '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {m.requisitos || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span
                          className={`inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium ${
                            m.ativa
                              ? 'bg-[#ccfbf1] text-[#0f766e]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {m.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <div className="flex justify-end gap-2">
                          {onEditModalidade && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onEditModalidade(m)}
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <Popconfirm
                            title="Excluir modalidade"
                            description={`Tem certeza que deseja excluir a modalidade "${m.nome}"?`}
                            onConfirm={() => handleDelete(m)}
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
