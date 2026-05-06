import { useState, useEffect } from 'react'
import { Users, Search, Plus, Pencil, Trash2, User, MoreVertical, IdCard, FileText } from 'lucide-react'
import { Input, Button, Popconfirm, Popover, Pagination } from 'antd'
import { estudantesService } from '../../services/estudantesService'
import EscolaFilterAutoComplete from './EscolaFilterAutoComplete'
import StorageImage from '../StorageImage'

function SexoBadge({ sexo }) {
  if (!sexo) return <span className="text-[#94a3b8]">-</span>
  const isF = String(sexo).toUpperCase() === 'F'
  const isM = String(sexo).toUpperCase() === 'M'
  if (isF) return <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">F</span>
  if (isM) return <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">M</span>
  return <span>{sexo}</span>
}

function FichaInscricaoBadge({ item }) {
  const temAnexo = !!(item?.documentacao_assinada_url?.trim())
  if (temAnexo) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">Documento assinado</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">Assinatura pendente</span>
}

function formatDate(str) {
  if (!str) return '-'
  try {
    const [year, month, day] = str.split('-')
    return new Date(+year, +month - 1, +day).toLocaleDateString('pt-BR')
  } catch {
    return str
  }
}

export default function EstudantesList({
  lista = [],
  loading,
  error,
  onNewAluno,
  onEditAluno,
  onDeleteAluno,
  onViewAluno,
  onGerarCredencial,
  onFichaIndividual,
  showInstituicao = false,
  escolas = [],
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [escolaFilterId, setEscolaFilterId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredByEscola = escolaFilterId != null && escolaFilterId !== ''
    ? lista.filter((item) => Number(item.escola_id) === Number(escolaFilterId))
    : lista

  const filteredLista = filteredByEscola.filter((item) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const nome = (item.nome || '').toLowerCase()
    const email = (item.email || '').toLowerCase()
    const cpf = (item.cpf || '').replace(/\D/g, '')
    const cpfSearch = searchTerm.replace(/\D/g, '')
    const responsavel = (item.responsavel_nome || '').toLowerCase()
    const instituicao = (item.escola_nome || '').toLowerCase()
    return (
      nome.includes(term) ||
      email.includes(term) ||
      (cpfSearch && cpf.includes(cpfSearch)) ||
      responsavel.includes(term) ||
      (showInstituicao && instituicao.includes(term))
    )
  })

  const paginatedLista = filteredLista.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, escolaFilterId])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div>
            <p className="text-[0.75rem] sm:text-[0.875rem] text-[#64748b] m-0 mb-0.5 sm:mb-1 uppercase font-bold tracking-wider">
              Total de Alunos
            </p>
            <p className="text-[1.25rem] sm:text-[1.5rem] font-extrabold text-[#042f2e] m-0">
              {escolaFilterId != null && escolaFilterId !== '' ? filteredLista.length : lista.length}
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-[#f0fdfa] rounded-xl">
            <Users size={24} className="text-[#0f766e]" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
            className="w-full"
          />
        </div>
        {showInstituicao && escolas?.length > 0 && (
          <EscolaFilterAutoComplete
            escolas={escolas}
            value={escolaFilterId}
            onChange={setEscolaFilterId}
            className="w-full sm:w-[220px]"
          />
        )}
        {onNewAluno && (
          <Button 
            type="primary" 
            onClick={onNewAluno} 
            icon={<Plus size={16} />}
            className="w-full sm:w-auto h-10 font-semibold"
          >
            Novo aluno
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
          {filteredLista.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhum aluno encontrado
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Comece cadastrando um novo aluno'}
              </p>
              {onNewAluno && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewAluno}
                >
                  <Plus size={18} className="shrink-0" />
                  Cadastrar aluno
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    {showInstituicao && (
                      <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Instituição
                      </th>
                    )}
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      CPF
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nascimento
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Sexo
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Peso
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Ficha de inscrição
                    </th>
                    {(onEditAluno || onDeleteAluno || onGerarCredencial || onFichaIndividual) && (
                      <th className="w-[100px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLista.map((item) => (
                    <tr
                      key={item.id ?? item.cpf ?? item.nome}
                      className={`hover:bg-[#f8fafc] ${onViewAluno ? 'cursor-pointer' : ''}`}
                      onClick={() => onViewAluno?.(item)}
                    >
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#e2e8f0] flex items-center justify-center shrink-0">
                            {item.foto_url ? (
                              <StorageImage path={item.foto_url} alt={item.nome} className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} className="text-[#94a3b8]" />
                            )}
                          </div>
                          <span>{item.nome}</span>
                        </div>
                      </td>
                      {showInstituicao && (
                        <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                          {item.escola_nome || '-'}
                        </td>
                      )}
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {estudantesService.formatCpf(item.cpf)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {formatDate(item.data_nascimento)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <SexoBadge sexo={item.sexo} />
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {item.peso != null ? `${item.peso} kg` : '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <FichaInscricaoBadge item={item} />
                      </td>
                      {(onEditAluno || onDeleteAluno || onGerarCredencial || onFichaIndividual) && (
                        <td
                          className="px-5 py-4 text-right border-b border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Popover
                            placement="bottomRight"
                            trigger="click"
                            content={
                              <div className="flex flex-col min-w-[120px]">
                                {onGerarCredencial && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => onGerarCredencial(item)}
                                  >
                                    <IdCard size={16} />
                                    Gerar credencial
                                  </button>
                                )}
                                {onFichaIndividual && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => onFichaIndividual(item)}
                                  >
                                    <FileText size={16} />
                                    Ficha individual
                                  </button>
                                )}
                                {onEditAluno && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f766e] transition-colors rounded-md border-0 bg-transparent text-left cursor-pointer w-full"
                                    onClick={() => {
                                      // close popover automatically by letting onClick propagate isn't easy here without a wrapper that holds state or clicking body
                                      // ant popover closes when we click out.
                                      onEditAluno(item)
                                    }}
                                  >
                                    <Pencil size={16} />
                                    Editar
                                  </button>
                                )}
                                {onDeleteAluno && (
                                  <Popconfirm
                                    title="Excluir aluno"
                                    description={`Excluir "${item.nome}"? O aluno não poderá ser excluído se estiver vinculado a equipes.`}
                                    onConfirm={() => onDeleteAluno(item)}
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
                showTotal={(total) => `Total: ${total} alunos`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
