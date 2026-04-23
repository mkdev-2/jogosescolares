/**
 * Componente RelatorioEscolasPorModalidade
 * Exibe escolas agrupadas por modalidade esportiva (esporte + categoria + naipe + tipo),
 * com total de atletas por escola e indicadores gerais da edição.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Card, Form, Button, Space, Typography, Spin, Select,
  Row, Col, Table, Statistic, Collapse, Badge, Empty, Radio, Tag,
} from 'antd'
import { Building2, Download, RefreshCw, Trophy, Users } from 'lucide-react'
import useRelatorios from '../../hooks/useRelatorios'
import { edicoesService } from '../../services/edicoesService'
import { esportesService } from '../../services/esportesService'
import { generatePDF, generateCSV } from '../../utils/reportUtils'

const { Title, Text } = Typography

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
  const [isMobile, setIsMobile] = useState(false)

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Carregar edições e esportes ao montar
  useEffect(() => {
    const fetchEdicoes = async () => {
      setLoadingEdicoes(true)
      try {
        const data = await edicoesService.list()
        setEdicoes(Array.isArray(data) ? data : [])
        // Pré-seleciona a edição ativa
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

  // Limpar dados ao mudar filtros
  useEffect(() => {
    setDados([])
  }, [edicaoId, esporteId])

  // Buscar dados
  const buscarDados = async () => {
    if (!edicaoId) return
    try {
      const resultado = await getEscolasPorModalidade(edicaoId, esporteId || null)
      setDados(resultado)
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    }
  }

  // Indicadores gerais
  const indicadores = useMemo(() => {
    if (!dados || dados.length === 0) return null
    const totalModalidades = dados.length
    const escolasUnicas = new Set(
      dados.flatMap((d) => d.escolas.map((e) => e.escola_id))
    ).size
    const totalAtletas = dados.reduce(
      (sum, d) => sum + d.escolas.reduce((s, e) => s + (e.total_atletas || 0), 0),
      0
    )
    const mediaEscolas = totalModalidades > 0
      ? (dados.reduce((s, d) => s + d.total_escolas, 0) / totalModalidades).toFixed(1)
      : 0
    return { totalModalidades, escolasUnicas, totalAtletas, mediaEscolas }
  }, [dados])

  // Colunas da tabela de escolas dentro de cada modalidade
  const columns = [
    {
      title: '#',
      key: 'idx',
      width: 45,
      render: (_, __, idx) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
      ),
    },
    {
      title: 'Escola',
      dataIndex: 'escola_nome',
      key: 'escola_nome',
      sorter: (a, b) => (a.escola_nome || '').localeCompare(b.escola_nome || ''),
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
      render: (v) => (
        <Tag color="teal" style={{ fontWeight: 600 }}>{v ?? 0}</Tag>
      ),
    },
  ]

  // Exportar PDF
  const handleExportarPDF = () => {
    if (!dados || dados.length === 0) return
    const edicaoLabel = edicoes.find((e) => e.id === edicaoId)?.nome || `Edição ${edicaoId}`
    const sections = dados.map((d) => ({
      title: `${d.esporte_nome} — ${d.categoria_nome} · ${d.naipe_nome} · ${d.tipo_modalidade_nome}`,
      summary: `${d.total_escolas} escola${d.total_escolas !== 1 ? 's' : ''} participante${d.total_escolas !== 1 ? 's' : ''}`,
      headers: ['#', 'Escola', 'INEP', 'Atletas'],
      rows: d.escolas.map((e, i) => [
        String(i + 1),
        e.escola_nome || '–',
        e.escola_inep || '–',
        String(e.total_atletas ?? 0),
      ]),
    }))
    generatePDF({
      title: 'Escolas por Modalidade',
      subtitle: edicaoLabel,
      sections,
      filename: `relatorio-escolas-por-modalidade-${edicaoId}`,
    })
  }

  // Exportar CSV
  const handleExportarCSV = () => {
    if (!dados || dados.length === 0) return
    const headers = ['Esporte', 'Categoria', 'Naipe', 'Tipo', 'Escola', 'INEP', 'Atletas']
    const rows = dados.flatMap((d) =>
      d.escolas.map((e) => [
        d.esporte_nome,
        d.categoria_nome,
        d.naipe_nome,
        d.tipo_modalidade_nome,
        e.escola_nome || '',
        e.escola_inep || '',
        String(e.total_atletas ?? 0),
      ])
    )
    generateCSV({
      headers,
      rows,
      filename: `relatorio-escolas-por-modalidade-${edicaoId}`,
    })
  }

  const handleExportar = () => {
    if (format === 'pdf') handleExportarPDF()
    else handleExportarCSV()
  }

  return (
    <Card>
      <Spin spinning={loading || loadingEdicoes}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>

          {/* Cabeçalho */}
          <Space direction="vertical" size={2}>
            <Title level={4} style={{ margin: 0 }}>
              <Space>
                <Trophy size={18} className="text-[#0f766e]" />
                Escolas por Modalidade
              </Space>
            </Title>
            <Text type="secondary">
              Visualize quais escolas estão inscritas em cada modalidade esportiva, com total de atletas por equipe.
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
                    filterOption={(input, opt) =>
                      String(opt?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={edicoes.map((e) => ({
                      label: `${e.nome || e.ano}${e.status === 'ATIVA' ? ' (Ativa)' : ''}`,
                      value: e.id,
                    }))}
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
                    filterOption={(input, opt) =>
                      String(opt?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={esportes.map((e) => ({
                      label: e.nome,
                      value: e.id,
                    }))}
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

            {/* Exportação */}
            {dados.length > 0 && (
              <Space size="middle" wrap style={{ marginTop: 4 }}>
                <Text strong>Exportar:</Text>
                <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
                  <Radio value="pdf">PDF</Radio>
                  <Radio value="csv">CSV</Radio>
                </Radio.Group>
                <Button
                  icon={<Download size={14} />}
                  onClick={handleExportar}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Gerar {format.toUpperCase()}
                </Button>
              </Space>
            )}
          </Form>
        </Space>
      </Spin>

      {/* Indicadores */}
      {indicadores && (
        <Card
          size="small"
          style={{ marginTop: 16, background: '#f0fdf4' }}
          title={
            <Space>
              <Users size={15} className="text-[#0f766e]" />
              <Text strong>Indicadores da Edição</Text>
            </Space>
          }
        >
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Modalidades com inscrições"
                value={indicadores.totalModalidades}
                valueStyle={{ color: '#0f766e' }}
                prefix={<Trophy size={14} />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Escolas participantes"
                value={indicadores.escolasUnicas}
                valueStyle={{ color: '#0369a1' }}
                prefix={<Building2 size={14} />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Total de atletas inscritos"
                value={indicadores.totalAtletas}
                valueStyle={{ color: '#7c3aed' }}
                prefix={<Users size={14} />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Média de escolas/modalidade"
                value={indicadores.mediaEscolas}
                valueStyle={{ color: '#b45309' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Dados agrupados por modalidade */}
      {dados.length > 0 && (
        <Card
          size="small"
          style={{ marginTop: 16 }}
          title={
            <Space>
              <Trophy size={15} className="text-[#0f766e]" />
              <Text strong>
                {dados.length} modalidade{dados.length !== 1 ? 's' : ''} com escolas inscritas
              </Text>
            </Space>
          }
        >
          <Collapse
            defaultActiveKey={dados.map((d) => d.variante_id)}
            expandIconPosition="start"
            items={dados
              .slice()
              .sort((a, b) => a.esporte_nome.localeCompare(b.esporte_nome))
              .map((variante) => ({
                key: variante.variante_id,
                label: (
                  <Space wrap>
                    <Text strong>{variante.esporte_nome}</Text>
                    <Text type="secondary">—</Text>
                    <Text>{variante.categoria_nome}</Text>
                    <Tag color="blue" style={{ marginInlineStart: 0 }}>{variante.naipe_nome}</Tag>
                    <Tag color={variante.tipo_modalidade_codigo === 'COLETIVAS' ? 'green' : 'orange'}>
                      {variante.tipo_modalidade_nome}
                    </Tag>
                    <Badge
                      count={variante.total_escolas}
                      style={{ backgroundColor: '#0f766e' }}
                      overflowCount={999}
                    />
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={variante.escolas}
                    columns={columns}
                    rowKey="equipe_id"
                    pagination={false}
                    size="small"
                    bordered
                  />
                ),
              }))}
          />
        </Card>
      )}

      {/* Empty state */}
      {!loading && dados.length === 0 && edicaoId && (
        <Card style={{ marginTop: 16, textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">
                Selecione os filtros e clique em <strong>Buscar</strong> para visualizar os dados.
              </Text>
            }
          />
        </Card>
      )}
    </Card>
  )
}

export default RelatorioEscolasPorModalidade
