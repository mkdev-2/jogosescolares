import { useState, useEffect, useCallback } from 'react'
import { Button, Segmented, message, Pagination, Input } from 'antd'
import { PlusOutlined, UnorderedListOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons'
import { noticiasService } from '../../services/noticiasService'
import { useAuth } from '../../contexts/AuthContext'
import NoticiaTable from './components/NoticiaTable'
import NoticiaGrid from './components/NoticiaGrid'
import NoticiaModal from './components/NoticiaModal'

const PAGE_SIZE = 8

export default function Noticias({ embedded }) {
  const { user } = useAuth()
  const [noticias, setNoticias] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNoticia, setEditingNoticia] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const loadNoticias = useCallback(async () => {
    setLoading(true)
    try {
      const data = await noticiasService.listar({ limit: 500 })
      setNoticias(data || [])
    } catch (err) {
      message.error(err.message || 'Não foi possível carregar as notícias')
      setNoticias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNoticias()
  }, [loadNoticias])

  const filteredNoticias = (noticias || []).filter(
    (n) =>
      !searchQuery ||
      (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.summary || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  const paginatedNoticias = filteredNoticias.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleCreate = () => {
    setEditingNoticia(null)
    setModalVisible(true)
  }

  const handleEdit = (noticia) => {
    setEditingNoticia(noticia)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await noticiasService.excluir(id)
      message.success('Notícia excluída com sucesso')
      loadNoticias()
    } catch (err) {
      message.error(err.message || 'Erro ao excluir notícia')
    }
  }

  return (
    <div className={embedded ? '' : 'p-4 sm:p-6 lg:px-12'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 m-0 tracking-tight">
              Notícias
            </h1>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Gerencie notícias e publicações do portal
            </p>
          </div>
          {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="rounded-lg">
            Nova notícia
          </Button>
        )}
        </div>
      )}
      {embedded && isAdmin && (
        <div className="flex justify-end mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="rounded-lg">
            Nova notícia
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <Input
          placeholder="Buscar por título ou resumo..."
          prefix={<SearchOutlined className="text-slate-400" />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          allowClear
          className="max-w-md rounded-lg"
        />
        <Segmented
          options={[
            { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
            { label: 'Lista', value: 'list', icon: <UnorderedListOutlined /> },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      {viewMode === 'grid' ? (
        <>
          <NoticiaGrid
            noticias={paginatedNoticias}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {filteredNoticias.length > PAGE_SIZE && (
            <div className="mt-6 flex justify-center">
              <Pagination
                current={currentPage}
                total={filteredNoticias.length}
                pageSize={PAGE_SIZE}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showTotal={(total) => `Total: ${total} notícias`}
              />
            </div>
          )}
        </>
      ) : (
        <NoticiaTable
          noticias={filteredNoticias}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <NoticiaModal
        visible={modalVisible}
        editingNoticia={editingNoticia}
        onClose={() => {
          setModalVisible(false)
          setEditingNoticia(null)
        }}
        onSuccess={loadNoticias}
      />
    </div>
  )
}
