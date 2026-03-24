import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Table, Tag, message } from 'antd'
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
  const [form, setForm] = useState({
    nome: '',
    edicao_id: undefined,
    esporte_variante_id: undefined,
  })

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

  const handleCriar = async () => {
    if (!form.nome?.trim() || !form.esporte_variante_id) {
      message.warning('Informe nome e modalidade para criar o campeonato.')
      return
    }
    try {
      await campeonatosService.create({
        nome: form.nome.trim(),
        edicao_id: form.edicao_id || undefined,
        esporte_variante_id: form.esporte_variante_id,
      })
      message.success('Campeonato criado com sucesso')
      setForm((prev) => ({ ...prev, nome: '' }))
      fetchCampeonatos()
    } catch (err) {
      message.error(err.message || 'Erro ao criar campeonato')
    }
  }

  const handleAutorizar = async (row) => {
    try {
      await campeonatosService.autorizarGeracao(row.id, row.edicao_id)
      message.success('Geração autorizada')
      fetchCampeonatos()
    } catch (err) {
      message.error(err.message || 'Erro ao autorizar geração')
    }
  }

  const handleRevogar = async (row) => {
    try {
      await campeonatosService.revogarAutorizacao(row.id, row.edicao_id)
      message.success('Autorização revogada')
      fetchCampeonatos()
    } catch (err) {
      message.error(err.message || 'Erro ao revogar autorização')
    }
  }

  const handleGerar = async (row) => {
    try {
      const result = await campeonatosService.gerarEstrutura(row.id, row.edicao_id)
      message.success(`Estrutura gerada (${result?.total_partidas ?? 0} partidas)`)
      fetchCampeonatos()
    } catch (err) {
      message.error(err.message || 'Erro ao gerar estrutura')
    }
  }

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
      width: 430,
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => handleAutorizar(row)} disabled={row.status !== 'RASCUNHO'}>
            Autorizar
          </Button>
          <Button size="small" onClick={() => handleRevogar(row)} disabled={row.status !== 'RASCUNHO'}>
            Revogar
          </Button>
          <Button size="small" type="primary" onClick={() => handleGerar(row)} disabled={row.status !== 'RASCUNHO'}>
            Gerar estrutura
          </Button>
          <Button size="small" onClick={() => handleVerEstrutura(row)}>
            Ver estrutura
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={`flex flex-col gap-4 ${embedded ? '' : 'p-6'}`}>
      <div>
        <h2 className="text-[1.25rem] font-bold text-[#042f2e] m-0">Gerenciamento de Campeonatos</h2>
        <p className="text-sm text-[#64748b] m-0 mt-1">
          Crie campeonatos por edição/modalidade e orquestre autorização e geração da estrutura.
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          placeholder="Nome do campeonato"
          value={form.nome}
          onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
        />
        <Select
          placeholder="Edição (opcional)"
          allowClear
          value={form.edicao_id}
          onChange={(v) => setForm((p) => ({ ...p, edicao_id: v }))}
          options={edicoes.map((e) => ({ value: e.id, label: `${e.nome} (${e.ano})` }))}
        />
        <Select
          placeholder="Modalidade"
          value={form.esporte_variante_id}
          onChange={(v) => setForm((p) => ({ ...p, esporte_variante_id: v }))}
          options={variantes.map((v) => ({ value: v.id, label: varianteLabelById.get(v.id) || String(v.id) }))}
          showSearch
          optionFilterProp="label"
        />
        <Button type="primary" onClick={handleCriar}>Criar campeonato</Button>
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
              <strong>Campeonato:</strong> {estrutura.campeonato_id} | <strong>Grupos:</strong> {estrutura.grupos?.length || 0} |{' '}
              <strong>Partidas:</strong> {estrutura.partidas?.length || 0}
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
