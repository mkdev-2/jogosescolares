import { useState, useEffect } from 'react'
import { Table, Collapse, DatePicker, Select, Tag, Card, Space, Typography, Tooltip, Avatar } from 'antd'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  const FIELD_LABELS = {
    // Estudante / dados gerais
    nome: 'Nome',
    cpf: 'CPF',
    rg: 'RG',
    email: 'E-mail',
    data_nascimento: 'Data de Nasc.',
    sexo: 'Sexo',
    endereco: 'Endereço',
    cep: 'CEP',
    responsavel_nome: 'Nome do Resp.',
    responsavel_cpf: 'CPF do Resp.',
    responsavel_rg: 'RG do Resp.',
    responsavel_celular: 'Celular do Resp.',
    responsavel_email: 'E-mail do Resp.',
    escola_nome: 'Escola',
    role: 'Perfil/Cargo',
    status: 'Status',
    // Equipe
    esporte_nome: 'Esporte',
    categoria_nome: 'Categoria',
    naipe_nome: 'Naipe',
    tipo_modalidade_nome: 'Tipo',
    professor_tecnico_nome: 'Técnico',
    ficha_assinada: 'Ficha Assinada',
    documentacao_assinada_url: 'Doc. Assinado',
    foto_url: 'Foto',
    modalidades_adesao: 'Modalidades (IDs)',
    // Professor
    cref: 'CREF',
    // Esporte
    descricao: 'Descrição',
    icone: 'Ícone',
    requisitos: 'Requisitos',
    limite_atletas: 'Limite de Atletas',
    ativa: 'Ativa',
    variantes: 'Variantes',
  }

  const formatValue = (val) => {
    if (val === true) return 'Sim'
    if (val === false) return 'Não'
    if (val === null || val === undefined || val === '') return 'vazio'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  const cleanMessage = (msg, record) => {
    if (!msg) return ''
    // Formato específico para geração de credenciais:
    // "Usuário X gerou credenciais da escola Escola Y (10 aptos, 20 pendentes)."
    // -> "Gerou credenciais da escola Escola Y (20 pendentes)."
    const credenciaisMatch = msg.match(/^Usuário .+? gerou credenciais da escola (.+?) \((\d+)\s+aptos,\s*(\d+)\s+pendentes\)\.?$/i)
    if (credenciaisMatch) {
      const escola = credenciaisMatch[1]
      const pendentes = credenciaisMatch[3]
      return `Gerou credenciais da escola ${escola} (${pendentes} pendentes).`
    }
    // Para mídias, deduzir verbo (adicionou/removeu/alterou) a partir dos dados.
    if (record?.tipo_recurso === 'MIDIAS') {
      const changes = getChanges(record.detalhes_antes, record.detalhes_depois)
      const fileKeys = ['logo_secretaria', 'logo_jels', 'bg_credencial', 'banners_hero', 'prefeito_foto']
      const mediaChanges = changes.filter((c) => fileKeys.includes(c.key))
      if (mediaChanges.length > 0) {
        const onlyAdded = mediaChanges.every((c) => !c.old && !!c.new)
        const onlyRemoved = mediaChanges.every((c) => !!c.old && !c.new)
        const onlyChanged = mediaChanges.every((c) => !!c.old && !!c.new && c.old !== c.new)
        if (onlyAdded) return 'Adicionou itens da central de mídias.'
        if (onlyRemoved) return 'Removeu itens da central de mídias.'
        if (onlyChanged) return 'Alterou itens da central de mídias.'
        return 'Atualizou itens da central de mídias.'
      }
    }
    // Remove "Usuário [qualquer_coisa] " se a frase começar assim, pegando a partir da ação (verbo)
    // Exemplos: "adicionou", "excluiu", "alterou", "aprovou", "negou"
    const cleaned = msg.replace(/^Usuário .+? (adicionou|excluiu|alterou|aprovou|negou|gerou|exportou)/, '$1')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) // Capitaliza a primeira letra da ação
  }

  const getChanges = (antes, depois) => {
    if (!antes || !depois) return []
    const changes = []
    const keys = new Set([...Object.keys(antes), ...Object.keys(depois)])
    
    keys.forEach(key => {
      // Ignorar campos de sistema ou redundantes
      if (['id', 'created_at', 'updated_at', 'escola_id', 'user_id', 'password_hash', 'escola_inep', 'variante_id'].includes(key)) return
      
      const valAntes = antes[key]
      const valDepois = depois[key]
      
      if (JSON.stringify(valAntes) !== JSON.stringify(valDepois)) {
        changes.push({
          key,
          label: FIELD_LABELS[key] || key,
          old: valAntes,
          new: valDepois
        })
      }
    })
    return changes
  }

  const renderMensagemContent = (text, record, mobile = false) => {
    const displayMsg = cleanMessage(text, record)
    const fontSize = mobile ? '11px' : '0.9375rem'
    const subFontSize = mobile ? '10px' : '13px'

    if (record.acao === 'UPDATE') {
      const changes = getChanges(record.detalhes_antes, record.detalhes_depois)
      
      const changesList = (
        <div className={`flex flex-col gap-2 mt-2 ${mobile ? 'ml-0 pl-2' : 'ml-2 pl-4'} border-l-2 border-gray-100`}>
          {changes.length > 0 ? changes.map((change, idx) => {
            const isFile = ['foto_url', 'documentacao_assinada_url'].includes(change.key)
            const isList = change.key === 'variantes'
            
            if (isList) {
              const oldList = Array.isArray(change.old) ? change.old : []
              const newList = Array.isArray(change.new) ? change.new : []
              const removed = oldList.filter(v => !newList.includes(v))
              const added = newList.filter(v => !oldList.includes(v))
              return (
                <div key={idx} className={`flex flex-col gap-1 text-[${subFontSize}] text-gray-600`}>
                  <span className="font-bold text-orange-600">
                    {String(idx + 1).padStart(2, '0')} — <strong>{change.label}</strong>
                  </span>
                  {removed.map((v, i) => (
                    <span key={`r${i}`} className="ml-4 bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium border border-red-100 line-through w-fit">
                      − {v}
                    </span>
                  ))}
                  {added.map((v, i) => (
                    <span key={`a${i}`} className="ml-4 bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-100 w-fit">
                      + {v}
                    </span>
                  ))}
                </div>
              )
            }

            if (isFile) {
              let action = 'Alterou'
              if (!change.old) {
                action = change.key === 'foto_url' ? 'Adicionou' : 'Anexou'
              } else if (!change.new) {
                action = 'Removeu'
              }
              
              const objectLabel = change.key === 'foto_url' ? 'uma foto' : 'um documento'
              
              return (
                <div key={idx} className={`flex flex-wrap items-center gap-x-2 text-[${subFontSize}] text-gray-600`}>
                  <span className="font-bold text-orange-600">
                    {String(idx + 1).padStart(2, '0')} —
                  </span>
                  <span>{action} {objectLabel}.</span>
                </div>
              )
            }

            if (mobile) {
              return (
                <div key={idx} className="flex flex-col gap-1 text-[10px] text-gray-600 py-1 border-b border-gray-50 last:border-0 font-medium">
                  <span className="font-bold text-orange-600 uppercase text-[9px]">
                    {String(idx + 1).padStart(2, '0')} — {change.label}
                  </span>
                  <div className="flex flex-col gap-1 pl-2">
                    <div className="flex gap-1.5 items-start">
                      <span className="text-[8px] text-gray-400 mt-0.5">DE:</span>
                      <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 line-through break-all">
                        {formatValue(change.old)}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-start">
                      <span className="text-[8px] text-gray-400 mt-0.5">PARA:</span>
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 break-all">
                        {formatValue(change.new)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={idx} className="flex flex-wrap items-center gap-x-2 text-[13px] text-gray-600">
                <span className="font-bold text-orange-600">
                  {String(idx + 1).padStart(2, '0')} —
                </span>
                <span>Mudou o <strong>{change.label}</strong> de</span>
                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium border border-red-100 strike-through line-through">
                  {formatValue(change.old)}
                </span>
                <span>para</span>
                <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-100">
                  {formatValue(change.new)}
                </span>
              </div>
            )
          }) : (
            <Text type="secondary" italic style={{ fontSize: subFontSize }}>Nenhuma alteração detectada nos campos visíveis.</Text>
          )}
        </div>
      )

      if (mobile) {
        return (
          <div className="flex flex-col gap-1">
            <Text style={{ fontSize: fontSize, fontWeight: 700, color: '#0f172a' }}>{displayMsg}</Text>
            {changesList}
          </div>
        )
      }
      
      return (
        <Collapse ghost expandIconPosition="end" className="audit-collapse">
          <Panel 
            header={<Text style={{ fontSize: fontSize, fontWeight: 500 }}>{displayMsg}</Text>} 
            key="1"
          >
            {changesList}
          </Panel>
        </Collapse>
      )
    }
    return <Text style={{ fontSize: fontSize, fontWeight: 500 }}>{displayMsg}</Text>
  }

  const columns = [
    {
      title: 'Momento',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format(isMobile ? 'DD/MM HH:mm' : 'DD/MM/YYYY HH:mm:ss'),
      width: isMobile ? 100 : 170,
    },
    {
      title: 'Usuário',
      dataIndex: 'usuario_nome',
      key: 'usuario_nome',
      width: isMobile ? 120 : 180,
      render: (text) => (
        <Space size={isMobile ? 4 : "small"}>
          {!isMobile && (
            <Avatar 
              size={24} 
              style={{ backgroundColor: text ? '#0f766e' : '#64748b', fontSize: '11px', fontWeight: 600 }}
            >
              {text ? text.charAt(0).toUpperCase() : 'S'}
            </Avatar>
          )}
          <Text style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 500 }} ellipsis={isMobile}>
            {text || 'Sistema'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Mensagem',
      dataIndex: 'mensagem',
      key: 'mensagem',
      responsive: ['md'],
      render: (text, record) => renderMensagemContent(text, record, false)
    },
    {
      title: 'Ação',
      dataIndex: 'acao',
      key: 'acao',
      width: isMobile ? 85 : 100,
      render: (acao) => {
        let color = 'blue'
        if (acao === 'CREATE') color = 'green'
        if (acao === 'DELETE') color = 'red'
        if (acao === 'UPDATE') color = 'orange'
        if (acao === 'APPROVE') color = 'cyan'
        if (acao === 'REVOKE') color = 'volcano'
        return (
          <Tag 
            color={color} 
            style={{ 
              fontWeight: 600, 
              fontSize: isMobile ? '10px' : '12px',
              padding: isMobile ? '0 4px' : '0 7px',
              margin: 0
            }}
          >
            {acao}
          </Tag>
        )
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
        expandable={isMobile ? {
          expandedRowRender: record => (
            <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <History size={14} className="text-[#0f766e]" />
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Histórico de Alterações</span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                {renderMensagemContent(record.mensagem, record, true)}
              </div>
            </div>
          ),
          rowExpandable: () => true,
          expandRowByClick: true,
          showExpandColumn: false
        } : undefined}
        pagination={{ 
          pageSize: 15, 
          showSizeChanger: !isMobile,
          hideOnSinglePage: false,
          size: isMobile ? 'small' : 'default'
        }}
        size={isMobile ? "small" : "middle"}
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
