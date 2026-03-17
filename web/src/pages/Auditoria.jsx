import { useState, useEffect } from 'react'
import { Table, Collapse, DatePicker, Select, Tag, Card, Space, Typography, Tooltip } from 'antd'
import { User, Filter, History, Search } from 'lucide-react'
import dayjs from 'dayjs'
import auditoriaService from '../services/auditoriaService'
import { usersService } from '../services/usersService'

const { Panel } = Collapse
const { RangePicker } = DatePicker
const { Title, Text } = Typography

export default function Auditoria({ embedded = false }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({
    user_id: undefined,
    data_inicio: undefined,
    data_fim: undefined
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [logsData, usersData] = await Promise.all([
        auditoriaService.getLogs(filters),
        usersService.list().catch(() => []) // Evitar que erro em usuários bloqueie logs
      ])
      setLogs(logsData || [])
      setUsers(usersData || [])
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  const columns = [
    {
      title: 'Momento',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
      width: 170,
    },
    {
      title: 'Mensagem',
      dataIndex: 'mensagem',
      key: 'mensagem',
      render: (text, record) => {
        if (record.acao === 'UPDATE') {
          return (
            <Collapse ghost expandIconPosition="end" className="audit-collapse">
              <Panel 
                header={<Text style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{text}</Text>} 
                key="1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-2">
                    <Text strong type="danger">Como ERA:</Text>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 max-h-[300px] overflow-auto">
                      <pre className="text-[11px] font-mono leading-tight whitespace-pre-wrap">
                        {record.detalhes_antes ? JSON.stringify(record.detalhes_antes, null, 2) : 'N/A'}
                      </pre>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Text strong type="success">Como PASSOU A SER:</Text>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 max-h-[300px] overflow-auto">
                      <pre className="text-[11px] font-mono leading-tight whitespace-pre-wrap">
                        {record.detalhes_depois ? JSON.stringify(record.detalhes_depois, null, 2) : 'N/A'}
                      </pre>
                    </div>
                  </div>
                </div>
              </Panel>
            </Collapse>
          )
        }
        return <Text style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{text}</Text>
      }
    },
    {
      title: 'Usuário',
      dataIndex: 'usuario_nome',
      key: 'usuario_nome',
      width: 150,
      render: (text) => text || 'Sistema'
    },
    {
      title: 'Ação',
      dataIndex: 'acao',
      key: 'acao',
      width: 100,
      render: (acao) => {
        let color = 'blue'
        if (acao === 'CREATE') color = 'green'
        if (acao === 'DELETE') color = 'red'
        if (acao === 'UPDATE') color = 'orange'
        return <Tag color={color} style={{ fontWeight: 600 }}>{acao}</Tag>
      }
    },
  ]

  return (
    <div className={embedded ? "" : "flex flex-col gap-6"}>
      {!embedded && (
        <header className="flex flex-col gap-1">
          <Title level={4} style={{ margin: 0, color: '#042f2e' }}>Auditoria do Sistema</Title>
          <Text type="secondary" style={{ fontSize: '0.9375rem' }}>Rastreie quem, quando e o que foi alterado no sistema.</Text>
        </header>
      )}

      <Card size="small" className="shadow-sm border-gray-100 mb-2">
        <Space wrap size="large">
          <div className="flex items-center gap-2">
            <User size={16} className="text-gray-400" />
            <Select
              placeholder="Filtrar por Usuário"
              style={{ width: 250 }}
              allowClear
              onChange={(val) => setFilters(prev => ({ ...prev, user_id: val }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map(u => ({ label: `${u.nome} (${u.cpf})`, value: u.id }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <RangePicker
              onChange={(dates) => {
                setFilters(prev => ({
                  ...prev,
                  data_inicio: dates ? dates[0].startOf('day').toISOString() : undefined,
                  data_fim: dates ? dates[1].endOf('day').toISOString() : undefined
                }))
              }}
              placeholder={['Início', 'Fim']}
              format="DD/MM/YYYY"
            />
          </div>
        </Space>
      </Card>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ 
          pageSize: 15, 
          showSizeChanger: true,
          hideOnSinglePage: false
        }}
        size="middle"
        className="rounded-lg overflow-hidden border border-gray-100"
      />

      <style>{`
        .audit-collapse .ant-collapse-header {
           padding: 4px 0 !important;
        }
        .audit-collapse .ant-collapse-content-box {
          padding: 0 !important;
        }
        .audit-collapse .ant-typography {
          display: block;
        }
      `}</style>
    </div>
  )
}
