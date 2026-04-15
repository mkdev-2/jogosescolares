import { useEffect, useState } from 'react'
import { Users, Plus, Trophy, Pencil, Trash2, FileText, MoreVertical } from 'lucide-react'
import { Input, Button, Popconfirm, Select, Pagination, Popover } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'

export default function EquipesList({
  lista = [],
  loading,
  error,
  onNewEquipe,
  onEditEquipe,
  onDeleteEquipe,
  onViewEquipe,
  onFichaColetiva,
  onFichaIndividual,
  showInstituicao = false,
  showFilters = true,
  showTotalEquipes = true,
  escolas = [],
}) {
  const [esporteFilter, setEsporteFilter] = useState(null)
  const [categoriaFilter, setCategoriaFilter] = useState(null)
  const [naipeFilter, setNaipeFilter] = useState(null)
  const [tecnicoFilter, setTecnicoFilter] = useState(null)
  const [escolaFilterId, setEscolaFilterId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredByEscola = escolaFilterId != null && escolaFilterId !== ''
    ? lista.filter((item) => Number(item.escola_id) === Number(escolaFilterId))
    : lista

  const filteredLista = filteredByEscola.filter((item) => {
    if (esporteFilter && item.esporte_nome !== esporteFilter) return false
    if (categoriaFilter && item.categoria_nome !== categoriaFilter) return false
    if (naipeFilter && item.naipe_nome !== naipeFilter) return false
    
    if (tecnicoFilter) {
      const tecnicoNome = item.professor_tecnico_nome || item.professor_tecnico?.nome
      if (tecnicoNome !== tecnicoFilter) return false
    }
    
    return true
  })

  // Opções para os filtros baseadas na lista original
  const esporteOptions = [...new Set(lista.map(item => item.esporte_nome))]
    .filter(Boolean).sort().map(v => ({ value: v, label: v }))
  
  const categoriaOptions = [...new Set(lista.map(item => item.categoria_nome))]
    .filter(Boolean).sort().map(v => ({ value: v, label: v }))
  
  const naipeOptions = [...new Set(lista.map(item => item.naipe_nome))]
    .filter(Boolean).sort().map(v => ({ value: v, label: v }))
  
  const tecnicoOptions = [...new Set(lista.map(item => item.professor_tecnico_nome || item.professor_tecnico?.nome))]
    .filter(Boolean).sort().map(v => ({ value: v, label: v }))

  const paginatedLista = filteredLista.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [esporteFilter, categoriaFilter, naipeFilter, tecnicoFilter, escolaFilterId])

  const getEsporteNome = (item) => item.esporte_nome || '-'
  const getEsporteIcone = (item) => item.esporte_icone || 'Zap'
  const getCategoriaNome = (item) => item.categoria_nome || '-'
  const getNaipeNome = (item) => item.naipe_nome || '-'
  const getTecnicoNome = (item) => {
    const tecnico = item.professor_tecnico_nome || item.professor_tecnico?.nome
    const auxiliar = item.professor_auxiliar_nome || item.professor_auxiliar?.nome
    if (tecnico && auxiliar) return `${tecnico} / Aux: ${auxiliar}`
    return tecnico || '-'
  }
  const getQtdAlunos = (item) => (item.estudantes && item.estudantes.length) || item.estudante_ids?.length || 0

  const isModalidadeColetiva = (item) => {
    const codigo = String(item.tipo_modalidade_codigo || '').trim().toUpperCase()
    const nome = String(item.tipo_modalidade_nome || '').trim().toUpperCase()
    return codigo === 'COLETIVAS' || nome === 'COLETIVAS'
  }

  return (
    <div className="flex flex-col gap-6">
      {showTotalEquipes && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div>
              <p className="text-[0.75rem] sm:text-[0.875rem] text-[#64748b] m-0 mb-0.5 sm:mb-1 uppercase font-bold tracking-wider">
                Total de Equipes
              </p>
              <p className="text-[1.25rem] sm:text-[1.5rem] font-extrabold text-[#042f2e] m-0">
                {escolaFilterId != null && escolaFilterId !== '' ? filteredLista.length : lista.length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-[#f0fdfa] rounded-xl">
              <Trophy size={24} className="text-[#0f766e]" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4">
        {showFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {showInstituicao && escolas?.length > 0 && (
              <Select
                placeholder="Filtrar por escola"
                allowClear
                value={escolaFilterId ?? undefined}
                onChange={(v) => setEscolaFilterId(v ?? null)}
                options={[
                  { value: '', label: 'Todas as escolas' },
                  ...escolas.map((e) => ({ value: e.id, label: e.nome_escola || `Escola ${e.id}` })),
                ]}
                className="w-full sm:min-w-[220px]"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row flex-1 gap-2 sm:gap-3">
              <Select
                placeholder="Esporte"
                allowClear
                value={esporteFilter}
                onChange={setEsporteFilter}
                options={esporteOptions}
                className="w-full lg:min-w-[140px]"
              />
              <Select
                placeholder="Categoria"
                allowClear
                value={categoriaFilter}
                onChange={setCategoriaFilter}
                options={categoriaOptions}
                className="w-full lg:min-w-[120px]"
              />
              <Select
                placeholder="Naipe"
                allowClear
                value={naipeFilter}
                onChange={setNaipeFilter}
                options={naipeOptions}
                className="w-full lg:min-w-[100px]"
              />
              <Select
                showSearch
                placeholder="Técnico"
                allowClear
                value={tecnicoFilter}
                onChange={setTecnicoFilter}
                options={tecnicoOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                className="w-full lg:min-w-[180px] lg:flex-1"
              />
            </div>
            {onNewEquipe && (
              <Button
                type="primary"
                onClick={onNewEquipe}
                icon={<Plus size={16} />}
                className="w-full sm:w-auto h-10 font-semibold shrink-0"
              >
                Nova equipe
              </Button>
            )}
          </div>
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
          {filteredLista.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhuma equipe encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {esporteFilter || categoriaFilter || naipeFilter || tecnicoFilter
                  ? 'Tente ajustar os filtros selecionados'
                  : 'Monte sua primeira equipe selecionando variante, alunos e técnico'}
              </p>
              {onNewEquipe && (
                <Button type="primary" onClick={onNewEquipe} icon={<Plus size={16} />}>
                  Nova equipe
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr>
                    {showInstituicao && (
                      <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Instituição
                      </th>
                    )}
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
                      Técnico
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Alunos
                    </th>
                    {(onEditEquipe || onDeleteEquipe || onFichaColetiva || onFichaIndividual) && (
                      <th className="w-[100px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLista.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#f8fafc] ${onViewEquipe ? 'cursor-pointer' : ''}`}
                      onClick={() => onViewEquipe?.(item)}
                    >
                      {showInstituicao && (
                        <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                          {item.escola_nome || '-'}
                        </td>
                      )}
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        <span className="inline-flex items-center gap-2">
                          <ModalidadeIcon icone={getEsporteIcone(item)} size={18} className="text-[#0f766e] shrink-0" />
                          {getEsporteNome(item)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getCategoriaNome(item)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getNaipeNome(item)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getTecnicoNome(item)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getQtdAlunos(item)}/{item.esporte_limite_atletas || '-'} membros
                      </td>
                      {(onEditEquipe || onDeleteEquipe || onFichaColetiva || onFichaIndividual) && (
                        <td
                          className="px-5 py-3 text-right border-b border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Popover
                            placement="bottomRight"
                            trigger="click"
                            content={
                              <div className="flex flex-col min-w-[140px]">
                                {onFichaColetiva && isModalidadeColetiva(item) && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => onFichaColetiva(item)}
                                  >
                                    <FileText size={16} />
                                    Ficha Coletiva
                                  </button>
                                )}
                                {onFichaIndividual && !isModalidadeColetiva(item) && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => onFichaIndividual(item)}
                                  >
                                    <FileText size={16} />
                                    Ficha Individual
                                  </button>
                                )}
                                {onEditEquipe && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => onEditEquipe(item)}
                                  >
                                    <Pencil size={16} />
                                    Editar
                                  </button>
                                )}
                                {onDeleteEquipe && (
                                  <Popconfirm
                                    title="Excluir equipe"
                                    description={`Excluir a equipe "${getEsporteNome(item)} • ${getCategoriaNome(item)} • ${getNaipeNome(item)}"?`}
                                    onConfirm={() => onDeleteEquipe(item)}
                                    okText="Sim, excluir"
                                    cancelText="Cancelar"
                                    okButtonProps={{ danger: true }}
                                    placement="left"
                                  >
                                    <button
                                      type="button"
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full mt-1"
                                    >
                                      <Trash2 size={16} />
                                      Excluir
                                    </button>
                                  </Popconfirm>
                                )}
                              </div>
                            }
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9] bg-transparent cursor-pointer"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </Popover>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredLista.length > pageSize && (
            <div className="mt-4 flex justify-end">
              <Pagination
                size="small"
                current={currentPage}
                total={filteredLista.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                showSizeChanger
                onChange={(page, size) => {
                  setCurrentPage(page)
                  setPageSize(size)
                }}
                showTotal={(total) => `Total: ${total} equipes`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
