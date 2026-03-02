import { useState, useEffect } from 'react'
import { Activity, LayoutGrid, Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react'
import useModalidades from '../../hooks/useModalidades'
import './ModalidadesList.css'

export default function ModalidadesList({ onNewModalidade, onEditModalidade }) {
  const {
    modalidades,
    loading,
    error,
    fetchModalidades,
    deleteModalidade,
    getEstatisticas,
  } = useModalidades()

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
    if (
      window.confirm(
        `Tem certeza que deseja excluir a modalidade "${modalidade.nome}"?`
      )
    ) {
      try {
        await deleteModalidade(modalidade.id)
        fetchModalidades({ search: searchTerm, categoria: filterCategoria })
      } catch (err) {
        alert(err.message || 'Erro ao excluir')
      }
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
    <div className="modalidades-list">
      {/* Cards de estatísticas */}
      <div className="modalidades-stats">
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Total de Modalidades</p>
            <p className="stat-value">{estatisticas.total}</p>
          </div>
          <Activity size={28} className="stat-icon" />
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Categorias</p>
            <p className="stat-value stat-value-accent">
              {Object.keys(estatisticas.porCategoria).length}
            </p>
          </div>
          <LayoutGrid size={28} className="stat-icon" />
        </div>
      </div>

      {/* Barra de busca e ações */}
      <div className="modalidades-toolbar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} className="btn-icon-left" />
            {showFilters ? 'Ocultar filtros' : 'Filtros'}
          </button>
          {onNewModalidade && (
            <button type="button" className="btn btn-primary" onClick={onNewModalidade}>
              <Plus size={18} className="btn-icon-left" />
              Nova Modalidade
            </button>
          )}
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="modalidades-filters">
          <label className="filter-label">Categoria</label>
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="modalidades-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="modalidades-loading">
          <div className="loading-spinner" />
          <p>Carregando...</p>
        </div>
      )}

      {/* Lista/Empty state */}
      {!loading && !error && (
        <>
          {filteredModalidades.length === 0 ? (
            <div className="modalidades-empty">
              <p className="empty-title">Nenhuma modalidade encontrada</p>
              <p className="empty-desc">
                {searchTerm || filterCategoria
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando uma nova modalidade'}
              </p>
              {onNewModalidade && (
                <button className="btn btn-primary" onClick={onNewModalidade}>
                  <Plus size={18} className="btn-icon-left" />
                  Criar Modalidade
                </button>
              )}
            </div>
          ) : (
            <div className="modalidades-table-wrapper">
              <table className="modalidades-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Requisitos</th>
                    <th>Status</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalidades.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="cell-nome">
                          <span className="nome-text">{m.nome}</span>
                          {m.descricao && (
                            <span className="nome-desc">{m.descricao}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="tag">{m.categoria}</span>
                      </td>
                      <td>
                        <span className="cell-requisitos">
                          {m.requisitos || '-'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`tag tag-status ${m.ativa ? 'tag-ativa' : 'tag-inativa'}`}
                        >
                          {m.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="col-actions">
                        <div className="actions-buttons">
                          {onEditModalidade && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => onEditModalidade(m)}
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(m)}
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
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
