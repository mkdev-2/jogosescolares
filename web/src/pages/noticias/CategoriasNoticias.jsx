import { useState, useEffect, useCallback } from 'react'
import { Button, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { noticiasService } from '../../services/noticiasService'
import { useAuth } from '../../contexts/AuthContext'
import CategoriaTable from './components/CategoriaTable'
import CategoriaModal from './components/CategoriaModal'

export default function CategoriasNoticias({ embedded }) {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState(null)

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)

  const loadCategorias = useCallback(async () => {
    setLoading(true)
    try {
      const data = await noticiasService.listarCategorias()
      setCategorias(data || [])
    } catch (err) {
      message.error(err.message || 'Erro ao carregar categorias')
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  const handleCreate = () => {
    setEditingCategoria(null)
    setModalVisible(true)
  }

  const handleEdit = (cat) => {
    setEditingCategoria(cat)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await noticiasService.excluirCategoria(id)
      message.success('Categoria excluída')
      loadCategorias()
    } catch (err) {
      message.error(err.message || 'Erro ao excluir')
    }
  }

  return (
    <div className={embedded ? '' : 'p-4 sm:p-6 lg:px-12'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">Categorias de notícias</h1>
            <p className="text-slate-500 mt-2 text-sm">Gerencie as categorias usadas nas notícias</p>
          </div>
          {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="rounded-lg">
            Nova categoria
          </Button>
        )}
        </div>
      )}
      {embedded && isAdmin && (
        <div className="flex justify-end mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="rounded-lg">
            Nova categoria
          </Button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <CategoriaTable
          categorias={categorias}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <CategoriaModal
        visible={modalVisible}
        editingCategoria={editingCategoria}
        onClose={() => {
          setModalVisible(false)
          setEditingCategoria(null)
        }}
        onSuccess={() => {
          loadCategorias()
          setModalVisible(false)
          setEditingCategoria(null)
        }}
      />
    </div>
  )
}
