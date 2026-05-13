import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Select, Table, Upload, message } from 'antd'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { edicoesService } from '../services/edicoesService'
import { locaisService } from '../services/locaisService'
import { uploadLocalFoto } from '../services/storageService'
import StorageImage from '../components/StorageImage'

export default function Locais({ embedded = false }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [edicoes, setEdicoes] = useState([])
  const [filtroEdicaoId, setFiltroEdicaoId] = useState(undefined)
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [fileList, setFileList] = useState([])

  const labelEdicao = useCallback((id) => {
    if (id == null) return null
    const e = edicoes.find((x) => x.id === id)
    if (!e) return `Edição #${id}`
    const status = e.status === 'ATIVA' ? ' (ativa)' : ''
    return `${e.nome} (${e.ano})${status}`
  }, [edicoes])

  /** Texto curto só para a coluna da tabela: "Edição 2026" */
  const labelEdicaoColuna = useCallback((id) => {
    if (id == null) return null
    const e = edicoes.find((x) => x.id === id)
    if (!e) return `Edição #${id}`
    if (e.ano != null && e.ano !== '') return `Edição ${e.ano}`
    return `Edição #${id}`
  }, [edicoes])

  const loadEdicoes = async () => {
    try {
      const edData = await edicoesService.list()
      setEdicoes(Array.isArray(edData) ? edData : [])
    } catch (err) {
      message.error(err.message || 'Erro ao carregar edições')
    }
  }

  useEffect(() => {
    loadEdicoes()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = filtroEdicaoId
        ? await locaisService.list(filtroEdicaoId)
        : await locaisService.list(null, { todas: true })
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      message.error(err.message || 'Erro ao carregar locais')
    } finally {
      setLoading(false)
    }
  }, [filtroEdicaoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openEdit = useCallback(
    (row) => {
      setEditing(row)
      form.setFieldsValue({
        nome: row.nome,
        endereco_completo: row.endereco_completo || '',
        link_maps: row.link_maps || '',
      })
      setFileList([])
      setModalOpen(true)
    },
    [form],
  )

  const handleDeleteRow = useCallback(
    async (row) => {
      const edicaoRow = row.edicao_id
      if (edicaoRow == null) return
      try {
        await locaisService.remove(row.id, edicaoRow)
        message.success('Local removido.')
        fetchData()
      } catch (err) {
        message.error(err.message || 'Erro ao excluir')
      }
    },
    [fetchData],
  )

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    if (filtroEdicaoId) {
      form.setFieldsValue({ edicao_id: filtroEdicaoId })
    }
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
    const edicaoAlvo = editing ? editing.edicao_id : (filtroEdicaoId ?? values.edicao_id)
    if (edicaoAlvo == null || edicaoAlvo === '') {
      message.warning('Selecione uma edição no filtro ou no campo Edição do formulário.')
      return
    }
    setSaving(true)
    try {
      let foto_url = editing?.foto_url || null
      const file = fileList[0]?.originFileObj
      if (file) {
        foto_url = await uploadLocalFoto(file, edicaoAlvo)
      }
      const payload = {
        nome: values.nome?.trim(),
        endereco_completo: values.endereco_completo?.trim() || null,
        link_maps: values.link_maps?.trim() || null,
        foto_url,
      }
      if (editing) {
        await locaisService.update(editing.id, payload, edicaoAlvo)
        message.success('Local atualizado.')
      } else {
        await locaisService.create(payload, edicaoAlvo)
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

  const columns = useMemo(() => {
    const cols = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      render: (text) => (
        <span className="font-semibold text-[#042f2e]">{text}</span>
      ),
    },
    ...(!filtroEdicaoId
      ? [
          {
            title: 'Edição',
            dataIndex: 'edicao_id',
            key: 'edicao_id',
            width: 130,
            ellipsis: true,
            render: (id) => labelEdicaoColuna(id) || `Edição #${id}`,
          },
        ]
      : []),
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
          <Popconfirm title="Excluir este local?" okText="Sim" cancelText="Não" onConfirm={() => handleDeleteRow(row)}>
            <Button type="text" size="small" danger icon={<Trash2 size={14} />} aria-label="Excluir" />
          </Popconfirm>
        </div>
      ),
    },
    ]
    return cols
  }, [filtroEdicaoId, labelEdicaoColuna, openEdit, handleDeleteRow])

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <MapPin className="text-[#0f766e] shrink-0 mt-0.5" size={22} />
          <div>
            <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0">Locais de competição</h2>
            <p className="text-sm text-[#64748b] m-0 mt-1">
              Sem filtro, exibe locais de todas as edições. Use o filtro para restringir.
            </p>
          </div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
          Novo local
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="md:col-span-2">
          <Select
            className="w-full"
            placeholder="Filtrar por edição"
            allowClear
            value={filtroEdicaoId}
            onChange={setFiltroEdicaoId}
            options={edicoes.map((e) => ({ value: e.id, label: `${e.nome} (${e.ano})` }))}
          />
        </div>
        <Button onClick={fetchData}>Atualizar</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Nenhum local cadastrado.' }}
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
        <Form form={form} layout="vertical">
          {editing ? (
            <p className="text-sm text-[#64748b] m-0 mb-3">
              Edição do local:{' '}
              <span className="font-medium text-[#042f2e]">{labelEdicao(editing.edicao_id)}</span>
            </p>
          ) : filtroEdicaoId ? (
            <p className="text-sm text-[#64748b] m-0 mb-3">
              Local vinculado à edição:{' '}
              <span className="font-medium text-[#042f2e]">{labelEdicao(filtroEdicaoId)}</span>
            </p>
          ) : (
            <Form.Item
              name="edicao_id"
              label="Edição"
              rules={[{ required: true, message: 'Selecione a edição do local.' }]}
              className="mb-1"
            >
              <Select
                placeholder="Edição do local"
                options={edicoes.map((e) => ({ value: e.id, label: `${e.nome} (${e.ano})` }))}
              />
            </Form.Item>
          )}
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
