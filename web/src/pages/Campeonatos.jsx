import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, Modal, Select, Table, Tag, message } from 'antd'
import { EyeOutlined, MoreOutlined, StopOutlined } from '@ant-design/icons'
import { campeonatosService } from '../services/campeonatosService'
import { edicoesService } from '../services/edicoesService'
import { esporteVariantesService } from '../services/esporteVariantesService'

const STATUS_COLORS = {
  RASCUNHO: 'default',
  GERADO: 'blue',
  EM_ANDAMENTO: 'gold',
  FINALIZADO: 'green',
  CANCELADO: 'red',
}

const STATUS_LABELS = {
  RASCUNHO: 'Rascunho',
  GERADO: 'Aguardando início',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

export default function Campeonatos({ embedded = false }) {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [edicoes, setEdicoes] = useState([])
  const [variantes, setVariantes] = useState([])
  const [variantesFiltro, setVariantesFiltro] = useState([])
  const [loadingVariantesFiltro, setLoadingVariantesFiltro] = useState(false)
  const [filtroEdicaoId, setFiltroEdicaoId] = useState(undefined)
  const [filtroVarianteId, setFiltroVarianteId] = useState(undefined)

  const varianteLabelById = useMemo(() => {
    const m = new Map()
    for (const v of variantes) {
      const label = [v.esporte_nome, v.categoria_nome, v.naipe_nome].filter(Boolean).join(' - ')
      m.set(v.id, label || String(v.id))
    }
    return m
  }, [variantes])

  const loadBase = async () => {
    try {
      const [edData, varData] = await Promise.all([
        edicoesService.list(),
        esporteVariantesService.list(),
      ])
      setEdicoes(Array.isArray(edData) ? edData : [])
      setVariantes(Array.isArray(varData) ? varData : [])
    } catch (err) {
      message.error(err.message || 'Erro ao carregar dados base de campeonatos')
    }
  }

  const fetchCampeonatos = async () => {
    setLoading(true)
    try {
      const data = await campeonatosService.list({
        edicaoId: filtroEdicaoId,
        esporteVarianteId: filtroVarianteId,
      })
      setItems(data)
    } catch (err) {
      message.error(err.message || 'Erro ao listar campeonatos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBase()
  }, [])

  useEffect(() => {
    fetchCampeonatos()
  }, [filtroEdicaoId, filtroVarianteId])

  useEffect(() => {
    const loadVariantesFiltro = async () => {
      if (!filtroEdicaoId) {
        setVariantesFiltro([])
        setFiltroVarianteId(undefined)
        return
      }
      setLoadingVariantesFiltro(true)
      try {
        const data = await esporteVariantesService.list(null, filtroEdicaoId)
        setVariantesFiltro(Array.isArray(data) ? data : [])
        if (filtroVarianteId && !data.some((v) => v.id === filtroVarianteId)) {
          setFiltroVarianteId(undefined)
        }
      } catch (err) {
        message.error(err.message || 'Erro ao carregar modalidades da edição selecionada')
        setVariantesFiltro([])
      } finally {
        setLoadingVariantesFiltro(false)
      }
    }
    loadVariantesFiltro()
  }, [filtroEdicaoId])

  const handleCancelar = (row) => {
    Modal.confirm({
      title: 'Cancelar campeonato',
      content: `Tem certeza que deseja cancelar "${row.nome}"? Esta ação não poderá ser desfeita.`,
      okText: 'Cancelar campeonato',
      okButtonProps: { danger: true },
      cancelText: 'Voltar',
      onOk: async () => {
        try {
          await campeonatosService.cancelar(row.id)
          message.success('Campeonato cancelado.')
          fetchCampeonatos()
        } catch (err) {
          message.error(err.message || 'Erro ao cancelar campeonato')
        }
      },
    })
  }

  const buildMenuItems = (row) => [
    { key: 'ver', label: 'Ver campeonato', icon: <EyeOutlined /> },
    { key: 'cancelar', label: 'Cancelar', icon: <StopOutlined />, danger: true, disabled: ['FINALIZADO', 'CANCELADO'].includes(row.status) },
  ]

  const handleMenuClick = (key, row) => {
    if (key === 'ver') navigate(`/app/campeonatos/${row.id}`)
    if (key === 'cancelar') handleCancelar(row)
  }

  const columns = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Edição', dataIndex: 'edicao_id', key: 'edicao_id', width: 90 },
    { title: 'Equipes', dataIndex: 'num_equipes', key: 'num_equipes', width: 90, align: 'center' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 120,
      render: (_, row) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: buildMenuItems(row),
              onClick: ({ key }) => handleMenuClick(key, row),
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </span>
      ),
    },
  ]

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0">Campeonatos</h2>
          <p className="text-sm text-[#64748b] m-0 mt-1">
            Gerencie os campeonatos de modalidades coletivas da edição.
          </p>
        </div>
        <Button type="primary" onClick={() => navigate('/app/criar-campeonato')}>
          Criar Campeonato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          placeholder="Filtrar por edição"
          allowClear
          value={filtroEdicaoId}
          onChange={setFiltroEdicaoId}
          options={edicoes.map((e) => ({ value: e.id, label: `${e.nome} (${e.ano})` }))}
        />
        <Select
          placeholder="Filtrar por modalidade"
          allowClear
          value={filtroVarianteId}
          onChange={setFiltroVarianteId}
          options={variantesFiltro.map((v) => ({ value: v.id, label: varianteLabelById.get(v.id) || String(v.id) }))}
          disabled={!filtroEdicaoId}
          loading={loadingVariantesFiltro}
          showSearch
          optionFilterProp="label"
        />
        <Button onClick={fetchCampeonatos}>Atualizar</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 10 }}
        onRow={(row) => ({
          onClick: () => navigate(`/app/campeonatos/${row.id}`),
          style: { cursor: 'pointer' },
        })}
      />

    </div>
  )
}
