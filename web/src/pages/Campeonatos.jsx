import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, Select, Table, Tag, message } from 'antd'
import { campeonatosService } from '../services/campeonatosService'
import { edicoesService } from '../services/edicoesService'
import { esporteVariantesService } from '../services/esporteVariantesService'

const STATUS_COLORS = {
  RASCUNHO: 'default',
  GERADO: 'blue',
  EM_ANDAMENTO: 'gold',
  FINALIZADO: 'green',
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
  const [estruturaOpen, setEstruturaOpen] = useState(false)
  const [estruturaLoading, setEstruturaLoading] = useState(false)
  const [estrutura, setEstrutura] = useState(null)

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

  const handleVerEstrutura = async (row) => {
    setEstruturaOpen(true)
    setEstrutura(null)
    setEstruturaLoading(true)
    try {
      const data = await campeonatosService.getEstrutura(row.id, row.edicao_id)
      setEstrutura(data)
    } catch (err) {
      message.error(err.message || 'Erro ao consultar estrutura')
    } finally {
      setEstruturaLoading(false)
    }
  }

  const columns = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Edição', dataIndex: 'edicao_id', key: 'edicao_id', width: 90 },
    {
      title: 'Modalidade',
      dataIndex: 'esporte_variante_id',
      key: 'esporte_variante_id',
      render: (id) => varianteLabelById.get(id) || String(id),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 160,
      render: (_, row) => (
        <Button size="small" onClick={() => handleVerEstrutura(row)}>
          Ver estrutura
        </Button>
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
      />

      <Modal
        open={estruturaOpen}
        onCancel={() => setEstruturaOpen(false)}
        footer={null}
        width={1000}
        title="Estrutura do campeonato"
      >
        {estruturaLoading && <p className="text-sm text-[#64748b]">Carregando estrutura...</p>}
        {!estruturaLoading && !estrutura && <p className="text-sm text-[#64748b]">Sem dados.</p>}
        {!!estrutura && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[#334155]">
              <strong>Campeonato:</strong> {estrutura.campeonato_id} | <strong>Grupos:</strong>{' '}
              {estrutura.grupos?.length || 0} | <strong>Partidas:</strong>{' '}
              {estrutura.partidas?.length || 0}
            </div>
            <Table
              rowKey={(r) => `g-${r.id}`}
              size="small"
              pagination={false}
              dataSource={estrutura.grupos || []}
              columns={[
                { title: 'Grupo', dataIndex: 'nome', key: 'nome', width: 100 },
                { title: 'Ordem', dataIndex: 'ordem', key: 'ordem', width: 90 },
                { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
              ]}
            />
            <Table
              rowKey={(r) => `p-${r.id}`}
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={estrutura.partidas || []}
              columns={[
                { title: 'Fase', dataIndex: 'fase', key: 'fase', width: 170 },
                { title: 'Rodada', dataIndex: 'rodada', key: 'rodada', width: 90 },
                { title: 'Grupo', dataIndex: 'grupo_id', key: 'grupo_id', width: 90 },
                { title: 'Mandante', dataIndex: 'mandante_equipe_id', key: 'mandante_equipe_id', width: 110 },
                { title: 'Visitante', dataIndex: 'visitante_equipe_id', key: 'visitante_equipe_id', width: 110 },
                { title: 'Vencedor', dataIndex: 'vencedor_equipe_id', key: 'vencedor_equipe_id', width: 110 },
                { title: 'BYE', dataIndex: 'is_bye', key: 'is_bye', width: 80, render: (v) => (v ? 'Sim' : 'Não') },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
