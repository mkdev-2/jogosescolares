/**
 * Componente RelatorioEscolasPorModalidade
 * Exibe escolas agrupadas por modalidade esportiva (esporte + categoria + naipe + tipo),
 * com total de atletas por escola e indicadores gerais da edição.
 * Cada linha é clicável: abre modal com dados da escola e lista de atletas.
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import {
  Card, Form, Button, Space, Typography, Spin, Select,
  Row, Col, Table, Statistic, Collapse, Badge, Empty, Radio, Tag,
  Modal, Divider, Avatar,
} from 'antd'
import { Building2, Download, RefreshCw, Trophy, Users, MapPin, Mail, Phone, Hash } from 'lucide-react'
import useRelatorios from '../../hooks/useRelatorios'
import { relatoriosService } from '../../services/relatoriosService'
import { edicoesService } from '../../services/edicoesService'
import { esportesService } from '../../services/esportesService'
import { estudantesService } from '../../services/estudantesService'
import { generatePDF, generateCSV } from '../../utils/reportUtils'
import EstudanteViewModal from '../catalogos/EstudanteViewModal'

const { Title, Text } = Typography

const SEXO_MAP = { M: { label: 'Masc', color: 'blue' }, F: { label: 'Fem', color: 'pink' } }

// Colunas da tabela principal — estáticas, definidas fora do componente
const ESCOLA_COLUMNS = [
  {
    title: '#',
    key: 'idx',
    width: 45,
    render: (_, __, idx) => <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>,
  },
  {
    title: 'Escola',
    dataIndex: 'escola_nome',
    key: 'escola_nome',
    sorter: (a, b) => (a.escola_nome || '').localeCompare(b.escola_nome || ''),
    showSorterTooltip: { title: '' },
    render: (nome) => (
      <Space size={6}>
        <Building2 size={14} className="text-[#0f766e]" />
        <Text strong style={{ fontSize: 13 }}>{nome || '–'}</Text>
      </Space>
    ),
  },
  {
    title: 'INEP',
    dataIndex: 'escola_inep',
    key: 'escola_inep',
    width: 110,
    render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '–'}</Text>,
  },
  {
    title: 'Atletas',
    dataIndex: 'total_atletas',
    key: 'total_atletas',
    width: 90,
    align: 'center',
    sorter: (a, b) => (a.total_atletas || 0) - (b.total_atletas || 0),
    showSorterTooltip: { title: '' },
    render: (v) => <Tag color="teal" style={{ fontWeight: 600 }}>{v ?? 0}</Tag>,
  },
]

// Colunas do modal de atletas — estáticas, definidas fora do componente
const ALUNOS_COLUMNS = [
  {
    title: '#',
    key: 'idx',
    width: 40,
    render: (_, __, i) => <Text type="secondary">{i + 1}</Text>,
  },
  {
    title: 'Nome',
    dataIndex: 'nome',
    key: 'nome',
    render: (nome) => (
      <Space size={6}>
        <Text strong style={{ color: '#0f766e' }}>{nome}</Text>
      </Space>
    ),
  },
  {
    title: 'Nasc.',
    dataIndex: 'data_nascimento',
    key: 'data_nascimento',
    width: 100,
    render: (v) => <Text type="secondary">{v || '–'}</Text>,
  },
  {
    title: 'Sexo',
    dataIndex: 'sexo',
    key: 'sexo',
    width: 72,
    render: (v) => {
      const s = SEXO_MAP[v?.toUpperCase?.()] || null
      return s ? <Tag color={s.color}>{s.label}</Tag> : <Text type="secondary">–</Text>
    },
  },
]

/**
 * Tabela de escolas de uma modalidade — isolada como memo para que mudanças
 * no estado do modal (estudanteModal, modalOpen) não re-renderizem todos os panels.
 */
const ModalidadeTable = memo(({ variante, onRowClick }) => (
  <Table
    dataSource={variante.escolas}
    columns={ESCOLA_COLUMNS}
    rowKey="equipe_id"
    pagination={false}
    size="small"
    bordered
    onRow={(record) => ({
      onClick: () => onRowClick(record, variante),
      style: { cursor: 'pointer' },
    })}
    rowClassName="hover:bg-teal-50/60 transition-colors"
  />
))
ModalidadeTable.displayName = 'ModalidadeTable'

const RelatorioEscolasPorModalidade = () => {
  const { getEscolasPorModalidade, loading } = useRelatorios()
  const [form] = Form.useForm()

  const [edicoes, setEdicoes] = useState([])
  const [esportes, setEsportes] = useState([])
  const [loadingEdicoes, setLoadingEdicoes] = useState(false)
  const [loadingEsportes, setLoadingEsportes] = useState(false)

  const [edicaoId, setEdicaoId] = useState(null)
  const [esporteId, setEsporteId] = useState(null)
  const [dados, setDados] = useState([])
  const [format, setFormat] = useState('pdf')

  // Estado do modal de estudante
  const [estudanteModal, setEstudanteModal] = useState(null)
  const [loadingEstudante, setLoadingEstudante] = useState(false)

  // Estado do modal de escola
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [clickCtx, setClickCtx] = useState(null)

  // Carregar edições e esportes ao montar
  useEffect(() => {
    const fetchEdicoes = async () => {
      setLoadingEdicoes(true)
      try {
        const data = await edicoesService.list()
        setEdicoes(Array.isArray(data) ? data : [])
        const ativa = data.find((e) => e.status === 'ATIVA')
        if (ativa) {
          setEdicaoId(ativa.id)
          form.setFieldValue('edicao_id', ativa.id)
        }
      } catch (err) {
        console.error('Erro ao carregar edições:', err)
      } finally {
        setLoadingEdicoes(false)
      }
    }

    const fetchEsportes = async () => {
      setLoadingEsportes(true)
      try {
        const data = await esportesService.list()
        setEsportes(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erro ao carregar esportes:', err)
      } finally {
        setLoadingEsportes(false)
      }
    }

    fetchEdicoes()
    fetchEsportes()
  }, [form])

  useEffect(() => { setDados([]) }, [edicaoId, esporteId])

  // Buscar dados principais
  const buscarDados = useCallback(async () => {
    if (!edicaoId) return
    try {
      const resultado = await getEscolasPorModalidade(edicaoId, esporteId || null)
      setDados(resultado)
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    }
  }, [edicaoId, esporteId, getEscolasPorModalidade])

  // Abrir modal ao clicar em uma linha de escola — estável enquanto edicaoId não mudar
  const handleRowClick = useCallback(async (record, variante) => {
    const ctx = {
      escola_id: record.escola_id,
      escola_nome: record.escola_nome,
      variante_id: variante.variante_id,
      variante_label: `${variante.esporte_nome} — ${variante.categoria_nome} · ${variante.naipe_nome} · ${variante.tipo_modalidade_nome}`,
    }
    setClickCtx(ctx)
    setModalData(null)
    setModalOpen(true)
    setModalLoading(true)
    try {
      const data = await relatoriosService.getEscolaModalidadeAlunos(
        ctx.escola_id,
        ctx.variante_id,
        edicaoId,
      )
      setModalData(data)
    } catch (err) {
      console.error('Erro ao buscar detalhes da escola:', err)
    } finally {
      setModalLoading(false)
    }
  }, [edicaoId])

  const handleAlunoClick = useCallback(async (aluno) => {
    setLoadingEstudante(true)
    try {
      const data = await estudantesService.getById(aluno.id)
      setEstudanteModal(data)
    } catch (err) {
      console.error('Erro ao buscar estudante:', err)
    } finally {
      setLoadingEstudante(false)
    }
  }, [])

  // Dados ordenados — recalcula apenas quando dados mudam
  const sortedDados = useMemo(
    () => dados.slice().sort((a, b) => a.esporte_nome.localeCompare(b.esporte_nome)),
    [dados]
  )

  // Indicadores gerais — recalcula apenas quando dados mudam
  const indicadores = useMemo(() => {
    if (!dados || dados.length === 0) return null
    const totalModalidades = dados.length
    const escolasUnicas = new Set(dados.flatMap((d) => d.escolas.map((e) => e.escola_id))).size
    const totalAtletas = dados.reduce(
      (sum, d) => sum + d.escolas.reduce((s, e) => s + (e.total_atletas || 0), 0), 0
    )
    const mediaEscolas = totalModalidades > 0
      ? (dados.reduce((s, d) => s + d.total_escolas, 0) / totalModalidades).toFixed(1)
      : 0
    return { totalModalidades, escolasUnicas, totalAtletas, mediaEscolas }
  }, [dados])

  // Items do Collapse — recalcula apenas quando sortedDados ou handleRowClick mudam
  // Mudanças em modalOpen/estudanteModal não disparam re-render dos panels
  const collapseItems = useMemo(() => sortedDados.map((variante) => ({
    key: variante.variante_id,
    label: (
      <Space wrap>
        <Text strong>{variante.esporte_nome}</Text>
        <Text type="secondary">—</Text>
        <Text>{variante.categoria_nome}</Text>
        <Tag color="blue" style={{ marginInlineStart: 0 }}>{variante.naipe_nome}</Tag>
        <Tag color={variante.tipo_modalidade_codigo === 'COLETIVAS' ? 'green' : 'orange'}>{variante.tipo_modalidade_nome}</Tag>
        <Badge count={variante.total_escolas} style={{ backgroundColor: '#0f766e' }} overflowCount={999} />
      </Space>
    ),
    children: <ModalidadeTable variante={variante} onRowClick={handleRowClick} />,
  })), [sortedDados, handleRowClick])

  // Exportações
  const handleExportarPDF = useCallback(() => {
    if (!dados || dados.length === 0) return
    const edicaoLabel = edicoes.find((e) => e.id === edicaoId)?.nome || `Edição ${edicaoId}`
    generatePDF({
      title: 'Escolas por Modalidade',
      subtitle: edicaoLabel,
      sections: dados.map((d) => ({
        title: `${d.esporte_nome} — ${d.categoria_nome} · ${d.naipe_nome} · ${d.tipo_modalidade_nome}`,
        summary: `${d.total_escolas} escola${d.total_escolas !== 1 ? 's' : ''} participante${d.total_escolas !== 1 ? 's' : ''}`,
        headers: ['#', 'Escola', 'INEP', 'Atletas'],
        rows: d.escolas.map((e, i) => [String(i + 1), e.escola_nome || '–', e.escola_inep || '–', String(e.total_atletas ?? 0)]),
      })),
      filename: `relatorio-escolas-por-modalidade-${edicaoId}`,
    })
  }, [dados, edicoes, edicaoId])

  const handleExportarCSV = useCallback(() => {
    if (!dados || dados.length === 0) return
    generateCSV({
      headers: ['Esporte', 'Categoria', 'Naipe', 'Tipo', 'Escola', 'INEP', 'Atletas'],
      rows: dados.flatMap((d) =>
        d.escolas.map((e) => [d.esporte_nome, d.categoria_nome, d.naipe_nome, d.tipo_modalidade_nome, e.escola_nome || '', e.escola_inep || '', String(e.total_atletas ?? 0)])
      ),
      filename: `relatorio-escolas-por-modalidade-${edicaoId}`,
    })
  }, [dados, edicaoId])

  const handleExportar = useCallback(
    () => (format === 'pdf' ? handleExportarPDF() : handleExportarCSV()),
    [format, handleExportarPDF, handleExportarCSV]
  )

  return (
    <Card>
      <Spin spinning={loading || loadingEdicoes}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Cabeçalho */}
          <Space direction="vertical" size={2}>
            <Title level={4} style={{ margin: 0 }}>
              <Space><Trophy size={18} className="text-[#0f766e]" />Escolas por Modalidade</Space>
            </Title>
            <Text type="secondary">
              Visualize quais escolas estão inscritas em cada modalidade esportiva. Clique em uma escola para ver seus atletas.
            </Text>
          </Space>

          {/* Filtros */}
          <Form form={form} layout="vertical">
            <Row gutter={12}>
              <Col xs={24} sm={8} md={6}>
                <Form.Item label="Edição" name="edicao_id" required>
                  <Select
                    placeholder="Selecione a edição"
                    value={edicaoId}
                    onChange={setEdicaoId}
                    loading={loadingEdicoes}
                    showSearch
                    filterOption={(input, opt) => String(opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                    options={edicoes.map((e) => ({ label: `${e.nome || e.ano}${e.status === 'ATIVA' ? ' (Ativa)' : ''}`, value: e.id }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <Form.Item label="Esporte (opcional)" name="esporte_id">
                  <Select
                    placeholder="Todos os esportes"
                    allowClear
                    value={esporteId}
                    onChange={setEsporteId}
                    loading={loadingEsportes}
                    disabled={!edicaoId}
                    showSearch
                    filterOption={(input, opt) => String(opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                    options={esportes.map((e) => ({ label: e.nome, value: e.id }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Form.Item label="&nbsp;">
                  <Button
                    type="primary"
                    icon={<RefreshCw size={15} />}
                    onClick={buscarDados}
                    loading={loading}
                    disabled={!edicaoId}
                    style={{ width: '100%' }}
                    size="large"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>

            {dados.length > 0 && (
              <Space size="middle" wrap style={{ marginTop: 4 }}>
                <Text strong>Exportar:</Text>
                <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
                  <Radio value="pdf">PDF</Radio>
                  <Radio value="csv">CSV</Radio>
                </Radio.Group>
                <Button icon={<Download size={14} />} onClick={handleExportar} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Gerar {format.toUpperCase()}
                </Button>
              </Space>
            )}
          </Form>
        </Space>
      </Spin>

      {/* Indicadores */}
      {indicadores && (
        <Card size="small" style={{ marginTop: 16, background: '#f0fdf4' }}
          title={<Space><Users size={15} className="text-[#0f766e]" /><Text strong>Indicadores da Edição</Text></Space>}
        >
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={6}>
              <Statistic title="Modalidades com inscrições" value={indicadores.totalModalidades} valueStyle={{ color: '#0f766e' }} prefix={<Trophy size={14} />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Escolas participantes" value={indicadores.escolasUnicas} valueStyle={{ color: '#0369a1' }} prefix={<Building2 size={14} />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Total de atletas inscritos" value={indicadores.totalAtletas} valueStyle={{ color: '#7c3aed' }} prefix={<Users size={14} />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Média de escolas/modalidade" value={indicadores.mediaEscolas} valueStyle={{ color: '#b45309' }} />
            </Col>
          </Row>
        </Card>
      )}

      {/* Dados agrupados por modalidade */}
      {dados.length > 0 && (
        <Card size="small" style={{ marginTop: 16 }}
          title={<Space><Trophy size={15} className="text-[#0f766e]" /><Text strong>{dados.length} modalidade{dados.length !== 1 ? 's' : ''} com escolas inscritas</Text></Space>}
        >
          <Collapse
            defaultActiveKey={sortedDados.map((d) => d.variante_id)}
            expandIconPosition="start"
            items={collapseItems}
          />
        </Card>
      )}

      {/* Empty state */}
      {!loading && dados.length === 0 && edicaoId && (
        <Card style={{ marginTop: 16, textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">Selecione os filtros e clique em <strong>Buscar</strong> para visualizar os dados.</Text>}
          />
        </Card>
      )}

      {/* Modal de escola + atletas */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={620}
        title={
          <Space>
            <Building2 size={16} className="text-[#0f766e]" />
            <span>{clickCtx?.escola_nome || 'Detalhes da Escola'}</span>
          </Space>
        }
        destroyOnHidden
      >
        <Spin spinning={modalLoading}>
          {modalData ? (
            <>
              {/* Cabeçalho da escola */}
              <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar size={44} style={{ backgroundColor: '#0f766e', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                    {(modalData.escola.nome_escola || '?').charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0">
                    <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.3 }}>
                      {modalData.escola.nome_escola}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {[modalData.escola.cidade, modalData.escola.uf].filter(Boolean).join(' – ')}
                    </Text>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
                  {modalData.escola.inep && (
                    <span className="flex items-center gap-1 text-[13px] text-slate-600">
                      <Hash size={13} className="text-slate-400" />
                      INEP: <strong>{modalData.escola.inep}</strong>
                    </span>
                  )}
                  {modalData.escola.endereco && (
                    <span className="flex items-center gap-1 text-[13px] text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      {modalData.escola.endereco}
                    </span>
                  )}
                  {modalData.escola.email && (
                    <span className="flex items-center gap-1 text-[13px] text-slate-600">
                      <Mail size={13} className="text-slate-400" />
                      {modalData.escola.email}
                    </span>
                  )}
                  {modalData.escola.telefone && (
                    <span className="flex items-center gap-1 text-[13px] text-slate-600">
                      <Phone size={13} className="text-slate-400" />
                      {modalData.escola.telefone}
                    </span>
                  )}
                </div>
              </div>

              {/* Modalidade */}
              <div className="mb-3">
                <Text type="secondary" style={{ fontSize: 12 }}>Modalidade</Text>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Tag color="teal" style={{ fontWeight: 600 }}>{modalData.variante.esporte_nome}</Tag>
                  <Tag>{modalData.variante.categoria_nome}</Tag>
                  <Tag color="blue">{modalData.variante.naipe_nome}</Tag>
                  <Tag color={modalData.variante.tipo_modalidade_nome?.toLowerCase().includes('coletiv') ? 'green' : 'orange'}>
                    {modalData.variante.tipo_modalidade_nome}
                  </Tag>
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Lista de atletas */}
              <div className="flex items-center justify-between mb-2">
                <Text strong>Atletas inscritos</Text>
                <Badge count={modalData.alunos.length} style={{ backgroundColor: '#0f766e' }} overflowCount={999} />
              </div>

              {modalData.alunos.length > 0 ? (
                <Spin spinning={loadingEstudante}>
                  <Table
                    dataSource={modalData.alunos}
                    columns={ALUNOS_COLUMNS}
                    rowKey="id"
                    pagination={modalData.alunos.length > 10 ? { pageSize: 10, size: 'small', hideOnSinglePage: true } : false}
                    size="small"
                    bordered
                    onRow={(aluno) => ({
                      onClick: () => handleAlunoClick(aluno),
                      style: { cursor: 'pointer' },
                    })}
                    rowClassName="hover:bg-teal-50/60 transition-colors"
                  />
                </Spin>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum atleta encontrado." />
              )}
            </>
          ) : (
            !modalLoading && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Não foi possível carregar os dados." />
          )}
        </Spin>
      </Modal>

      {/* Modal de detalhes do estudante */}
      <EstudanteViewModal
        open={!!estudanteModal}
        onClose={() => setEstudanteModal(null)}
        estudante={estudanteModal}
      />
    </Card>
  )
}

export default RelatorioEscolasPorModalidade
