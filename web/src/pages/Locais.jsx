import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Table, Upload, message } from 'antd'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEdicao } from '../contexts/EdicaoContext'
import { locaisService } from '../services/locaisService'
import { uploadLocalFoto } from '../services/storageService'
import StorageImage from '../components/StorageImage'

export default function Locais({ embedded = false }) {
  const { edicaoId } = useEdicao()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [fileList, setFileList] = useState([])

  const fetchData = useCallback(async () => {
    if (!edicaoId) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const data = await locaisService.list(edicaoId)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      message.error(err.message || 'Erro ao carregar locais')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setFileList([])
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.setFieldsValue({
      nome: row.nome,
      endereco_completo: row.endereco_completo || '',
      link_maps: row.link_maps || '',
    })
    setFileList([])
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!edicaoId) {
      message.warning('Selecione uma edição no seletor do painel.')
      return
    }
    setSaving(true)
    try {
      let foto_url = editing?.foto_url || null
      const file = fileList[0]?.originFileObj
      if (file) {
        foto_url = await uploadLocalFoto(file, edicaoId)
      }
      const payload = {
        nome: values.nome?.trim(),
        endereco_completo: values.endereco_completo?.trim() || null,
        link_maps: values.link_maps?.trim() || null,
        foto_url,
      }
      if (editing) {
        await locaisService.update(editing.id, payload, edicaoId)
        message.success('Local atualizado.')
      } else {
        await locaisService.create(payload, edicaoId)
        message.success('Local cadastrado.')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await locaisService.remove(row.id, edicaoId)
      message.success('Local removido.')
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao excluir')
    }
  }

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      render: (text) => (
        <span className="font-semibold text-[#042f2e]">{text}</span>
      ),
    },
    {
      title: 'Endereço',
      dataIndex: 'endereco_completo',
      key: 'endereco_completo',
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Foto',
      dataIndex: 'foto_url',
      key: 'foto_url',
      width: 72,
      render: (url) =>
        url ? (
          <StorageImage path={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      title: 'Maps',
      dataIndex: 'link_maps',
      key: 'link_maps',
      width: 90,
      render: (url) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#0f766e] text-xs font-medium">
            Abrir
          </a>
        ) : (
          '—'
        ),
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 120,
      render: (_, row) => (
        <div className="flex gap-1">
          <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => openEdit(row)} aria-label="Editar" />
          <Popconfirm title="Excluir este local?" okText="Sim" cancelText="Não" onConfirm={() => handleDelete(row)}>
            <Button type="text" size="small" danger icon={<Trash2 size={14} />} aria-label="Excluir" />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="text-[#0f766e]" size={22} />
          <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0">Locais de competição</h2>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate} disabled={!edicaoId}>
          Novo local
        </Button>
      </div>
      {!edicaoId && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
          Selecione uma edição no cabeçalho do painel para cadastrar e listar locais.
        </p>
      )}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: edicaoId ? 'Nenhum local cadastrado.' : 'Selecione uma edição.' }}
      />

      <Modal
        title={editing ? 'Editar local' : 'Novo local'}
        open={modalOpen}
        onCancel={() => !saving && setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="nome" label="Nome do local" rules={[{ required: true, message: 'Informe o nome.' }]}>
            <Input maxLength={200} placeholder="Ex.: Ginásio Municipal" />
          </Form.Item>
          <Form.Item name="endereco_completo" label="Endereço completo">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Rua, número, bairro, cidade…" />
          </Form.Item>
          <Form.Item name="link_maps" label="Link do Google Maps">
            <Input maxLength={1024} placeholder="https://maps.google.com/..." />
          </Form.Item>
          <Form.Item label="Foto da quadra / ginásio">
            <Upload
              accept="image/*"
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <Button type="default">Selecionar imagem</Button>
            </Upload>
            {editing?.foto_url && fileList.length === 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Atual:</span>
                <StorageImage path={editing.foto_url} alt="" className="w-16 h-16 rounded object-cover border border-slate-200" />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
