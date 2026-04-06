import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select, DatePicker, Table, Tag, message, Modal } from 'antd'
import dayjs from 'dayjs'
import { edicoesService } from '../services/edicoesService'

const STATUS_OPTIONS = [
  { value: 'PLANEJAMENTO', label: 'Planejamento' },
  { value: 'ATIVA', label: 'Ativa' },
  { value: 'ENCERRADA', label: 'Encerrada' },
]

const statusColor = {
  PLANEJAMENTO: 'default',
  ATIVA: 'green',
  ENCERRADA: 'orange',
}

export default function Edicoes({ embedded = false }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    ano: String(new Date().getFullYear()),
    status: 'PLANEJAMENTO',
    data_inicio: null,
    data_fim: null,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await edicoesService.list()
      setItems(data)
    } catch (err) {
      message.error(err.message || 'Erro ao carregar edições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const vigente = useMemo(() => items.find((e) => e.status === 'ATIVA') || null, [items])
  const totalAtivas = useMemo(() => items.filter((e) => e.status === 'ATIVA').length, [items])

  const handleCreate = async () => {
    try {
      await edicoesService.create({
        nome: form.nome?.trim(),
        ano: Number(form.ano),
        status: form.status,
        data_inicio: form.data_inicio ? dayjs(form.data_inicio).format('YYYY-MM-DD') : null,
        data_fim: form.data_fim ? dayjs(form.data_fim).format('YYYY-MM-DD') : null,
      })
      message.success('Edição criada com sucesso')
      setForm((prev) => ({ ...prev, nome: '', status: 'PLANEJAMENTO' }))
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao criar edição')
    }
  }

  const handleAtivar = async (id) => {
    try {
      await edicoesService.ativar(id)
      message.success('Edição ativada')
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao ativar edição')
    }
  }

  const handleEncerrar = async (id) => {
    try {
      await edicoesService.encerrar(id)
      message.success('Edição encerrada')
      fetchData()
    } catch (err) {
      message.error(err.message || 'Erro ao encerrar edição')
    }
  }

  const columns = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Ano', dataIndex: 'ano', key: 'ano', width: 100 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => <Tag color={statusColor[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 230,
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleAtivar(row.id)} disabled={row.status === 'ATIVA'}>
            Ativar
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleEncerrar(row.id)}
            disabled={row.status === 'ENCERRADA' || (row.status === 'ATIVA' && totalAtivas <= 1)}
          >
            Encerrar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div>
        <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0">Gestão de Edições</h2>
        <p className="text-sm text-[#64748b] m-0 mt-1">
          A edição ativa define o campeonato vigente para todos os usuários.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-[#e2e8f0] bg-white">
        <p className="text-sm m-0">
          <strong>Edição vigente:</strong> {vigente ? `${vigente.nome} (${vigente.ano})` : 'Nenhuma edição ativa'}
        </p>
        {totalAtivas <= 1 && (
          <p className="text-xs text-[#64748b] m-0 mt-2">
            Regra ativa: sempre deve existir uma edição vigente.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="primary" size="large" onClick={() => setIsModalOpen(true)}>Nova Edição</Button>
      </div>

      <Modal
        title={<span className="text-[1.125rem] font-bold text-[#042f2e]">Criar Nova Edição</span>}
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsModalOpen(false)}
        okText="Salvar edição"
        cancelText="Cancelar"
        destroyOnClose
      >
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[#334155]">Nome da Edição</label>
            <Input size="large" placeholder="ex.: JELS 2026" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#334155]">Ano</label>
              <Input size="large" placeholder="Ano (ex: 2026)" value={form.ano} onChange={(e) => setForm((p) => ({ ...p, ano: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#334155]">Status Inicial</label>
              <Select size="large" options={STATUS_OPTIONS} className="w-full" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#334155]">Data de Início</label>
              <DatePicker size="large" className="w-full" placeholder="Selecionar" format="DD/MM/YYYY" value={form.data_inicio ? dayjs(form.data_inicio) : null} onChange={(d) => setForm((p) => ({ ...p, data_inicio: d }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#334155]">Data de Fim</label>
              <DatePicker size="large" className="w-full" placeholder="Selecionar" format="DD/MM/YYYY" value={form.data_fim ? dayjs(form.data_fim) : null} onChange={(d) => setForm((p) => ({ ...p, data_fim: d }))} />
            </div>
          </div>
        </div>
      </Modal>

      <div className="-mx-4 sm:mx-0 border-y sm:border sm:rounded-lg overflow-hidden border-[#f1f5f9] shadow-none sm:shadow-sm mt-2">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </div>
  )
}
