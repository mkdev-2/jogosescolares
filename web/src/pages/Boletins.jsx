import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Input,
  Modal,
  Switch,
  Table,
  Tag,
  Upload,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { FileText, Upload as UploadIcon } from 'lucide-react'
import { boletinsService } from '../services/boletinsService'
import { getStorageUrl, uploadBoletimPdf } from '../services/storageService'

const MAX_PDF_MB = 20

const emptyForm = () => ({
  titulo: '',
  descricao: '',
  documento_url: '',
  documento_bytes: null,
  data_boletim: dayjs(),
  publicado: false,
})

export default function Boletins({ embedded = false }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [fileList, setFileList] = useState([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await boletinsService.listManage()
      setItems(data)
    } catch (err) {
      message.error(err.message || 'Erro ao carregar boletins')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFileList([])
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      titulo: row.titulo || '',
      descricao: row.descricao || '',
      documento_url: row.documento_url || '',
      documento_bytes: row.documento_bytes ?? null,
      data_boletim: row.data_boletim ? dayjs(row.data_boletim) : dayjs(),
      publicado: Boolean(row.publicado),
    })
    setFileList(
      row.documento_url
        ? [
            {
              uid: '-1',
              name: 'Documento atual (PDF)',
              status: 'done',
              url: getStorageUrl(row.documento_url),
            },
          ]
        : [],
    )
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setFileList([])
  }

  const handleSave = async () => {
    const titulo = form.titulo?.trim()
    if (!titulo) {
      message.warning('Informe o título.')
      return
    }
    if (!form.documento_url?.trim()) {
      message.warning('Envie o PDF do boletim.')
      return
    }
    const data_boletim = form.data_boletim ? dayjs(form.data_boletim).format('YYYY-MM-DD') : null
    if (!data_boletim) {
      message.warning('Informe a data do boletim.')
      return
    }

    const payload = {
      titulo,
      descricao: form.descricao?.trim() || null,
      documento_url: form.documento_url.trim(),
      documento_bytes: form.documento_bytes,
      data_boletim,
      publicado: form.publicado,
    }

    setSaving(true)
    try {
      if (editingId) {
        await boletinsService.update(editingId, payload)
        message.success('Boletim atualizado')
      } else {
        await boletinsService.create(payload)
        message.success('Boletim criado')
      }
      closeModal()
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (row) => {
    Modal.confirm({
      title: 'Excluir boletim?',
      content: 'O boletim deixará de aparecer na área pública e na gestão.',
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await boletinsService.remove(row.id)
          message.success('Boletim removido')
          fetchData()
        } catch (err) {
          message.error(err.message || 'Erro ao excluir')
        }
      },
    })
  }

  const uploadProps = useMemo(
    () => ({
      accept: '.pdf,application/pdf',
      maxCount: 1,
      fileList,
      beforeUpload: (file) => {
        const isPdf =
          file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf')
        if (!isPdf) {
          message.error('Envie apenas PDF.')
          return Upload.LIST_IGNORE
        }
        if (file.size > MAX_PDF_MB * 1024 * 1024) {
          message.error(`O arquivo deve ter no máximo ${MAX_PDF_MB} MB.`)
          return Upload.LIST_IGNORE
        }
        return true
      },
      customRequest: async ({ file, onSuccess, onError }) => {
        try {
          const url = await uploadBoletimPdf(file)
          setForm((f) => ({ ...f, documento_url: url, documento_bytes: file.size }))
          onSuccess(url)
          message.success('PDF enviado')
        } catch (err) {
          message.error(err.message || 'Falha no upload')
          onError(err)
        }
      },
      onChange: ({ fileList: fl }) => {
        setFileList(fl)
        if (fl.length === 0) {
          setForm((f) => ({ ...f, documento_url: '', documento_bytes: null }))
        }
      },
    }),
    [fileList],
  )

  const columns = [
    { title: 'Título', dataIndex: 'titulo', key: 'titulo', ellipsis: true },
    {
      title: 'Data',
      dataIndex: 'data_boletim',
      key: 'data_boletim',
      width: 120,
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Publicado',
      dataIndex: 'publicado',
      key: 'publicado',
      width: 110,
      render: (p) => (p ? <Tag color="green">Sim</Tag> : <Tag>Rascunho</Tag>),
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 200,
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => openEdit(row)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => handleDelete(row)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0 flex items-center gap-2">
            <FileText size={22} className="text-[#0f766e]" aria-hidden />
            Boletins oficiais
          </h2>
          <p className="text-sm text-[#64748b] m-0 mt-1">
            Cadastre PDFs com data; marque como publicado para exibir na página pública.
          </p>
        </div>
        <Button type="primary" size="large" onClick={openCreate}>
          Novo boletim
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 600 }}
      />

      <Modal
        title={
          <span className="text-[1.125rem] font-bold text-[#042f2e]">
            {editingId ? 'Editar boletim' : 'Novo boletim'}
          </span>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={saving}
        destroyOnClose
        width={560}
      >
        <div className="flex flex-col gap-3 pt-1">
          <div>
            <label className="text-sm font-medium text-[#334155]">Título</label>
            <Input
              className="mt-1"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex.: Boletim Informativo nº 004/2026"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#334155]">Descrição (opcional)</label>
            <Input.TextArea
              className="mt-1"
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Resumo exibido na listagem pública"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#334155]">Data do boletim</label>
            <DatePicker
              className="mt-1 w-full"
              value={form.data_boletim}
              onChange={(v) => setForm((f) => ({ ...f, data_boletim: v || dayjs() }))}
              format="DD/MM/YYYY"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.publicado} onChange={(v) => setForm((f) => ({ ...f, publicado: v }))} />
            <span className="text-sm text-[#334155]">Publicado na página pública</span>
          </div>
          <div>
            <label className="text-sm font-medium text-[#334155]">Documento (PDF)</label>
            <Upload.Dragger {...uploadProps} className="mt-1">
              <p className="ant-upload-drag-icon flex justify-center text-[#0f766e]">
                <UploadIcon size={28} />
              </p>
              <p className="ant-upload-text font-medium">Clique ou arraste o PDF</p>
              <p className="ant-upload-hint text-xs text-[#64748b]">
                Apenas PDF, até {MAX_PDF_MB} MB. {editingId ? 'Deixe em branco para manter o arquivo atual.' : ''}
              </p>
            </Upload.Dragger>
          </div>
        </div>
      </Modal>
    </div>
  )
}
