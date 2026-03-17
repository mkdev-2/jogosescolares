import { useState, useEffect } from 'react'
import { Calendar, Image as ImageIcon, UserCheck, Users, Trophy, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { DatePicker, Button, Tabs, Form, notification, Typography, Badge, Alert, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { configuracoesService } from '../services/configuracoesService'
import Midias from './noticias/Midias'

const { Title, Text, Paragraph } = Typography

function Configuracoes({ embedded }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deadlines, setDeadlines] = useState({})

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await configuracoesService.get()
      if (data) {
        setDeadlines(data)
        form.setFieldsValue({
          cadastro_data_limite: data.cadastro_data_limite ? dayjs(data.cadastro_data_limite) : null,
          diretor_cadastro_alunos_data_limite: data.diretor_cadastro_alunos_data_limite ? dayjs(data.diretor_cadastro_alunos_data_limite) : null,
          diretor_editar_modalidades_data_limite: data.diretor_editar_modalidades_data_limite ? dayjs(data.diretor_editar_modalidades_data_limite) : null,
        })
      }
    } catch (err) {
      notification.error({
        message: 'Erro ao carregar configurações',
        description: err.message || 'Tente novamente mais tarde.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const getStatus = (date) => {
    if (!date) return { text: 'Sem limite', color: 'default', icon: <Clock size={14} /> }
    const deadline = dayjs(date).endOf('day')
    const now = dayjs()
    if (now.isAfter(deadline)) return { text: 'Expirado', color: 'error', icon: <AlertCircle size={14} /> }
    return { text: 'Ativo', color: 'success', icon: <CheckCircle2 size={14} /> }
  }

  const onFinish = async (values) => {
    setSaving(true)
    const payload = {
      cadastro_data_limite: values.cadastro_data_limite ? values.cadastro_data_limite.format('YYYY-MM-DD') : null,
      diretor_cadastro_alunos_data_limite: values.diretor_cadastro_alunos_data_limite ? values.diretor_cadastro_alunos_data_limite.format('YYYY-MM-DD') : null,
      diretor_editar_modalidades_data_limite: values.diretor_editar_modalidades_data_limite ? values.diretor_editar_modalidades_data_limite.format('YYYY-MM-DD') : null,
    }

    try {
      await configuracoesService.update(payload)
      notification.success({
        message: 'Configurações salvas',
        description: 'As alterações de datas e prazos foram aplicadas com sucesso.',
      })
      loadSettings()
    } catch (err) {
      notification.error({
        message: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar as configurações.',
      })
    } finally {
      setSaving(false)
    }
  }

  const renderDateField = (name, label, Icon, description) => {
    const value = form.getFieldValue(name)
    const status = getStatus(value)

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#0f766e]/30 transition-all group shadow-sm mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon and Info */}
          <div className="flex flex-1 items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
              <Icon className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-[1.05rem] leading-tight">
                {label}
              </div>
              <div className="text-[0.85rem] text-slate-500 truncate">{description}</div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex sm:w-32 sm:justify-center items-center">
            <Badge
              status={status.color}
              text={<span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500">{status.text}</span>}
            />
          </div>

          {/* DatePicker */}
          <div className="w-full sm:w-48 shrink-0">
            <Form.Item name={name} noStyle>
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="--/--/----"
                className="w-full h-10 rounded-lg border-slate-200 font-bold text-[#1e293b] hover:border-[#0f766e]/40 transition-all text-center"
                onChange={() => {
                  // Force re-render to update status badge in UI
                  setTimeout(() => setDeadlines({ ...form.getFieldsValue() }), 0)
                }}
              />
            </Form.Item>
          </div>
        </div>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'prazos',
      label: (
        <span className="flex items-center gap-2">
          <Calendar size={16} />
          Datas e Prazos
        </span>
      ),
      children: (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mt-4 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#0f766e]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 m-0 leading-tight">Gestão de Datas e Prazos</h2>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            disabled={loading}
            className="w-full"
          >
            {renderDateField(
              'cadastro_data_limite',
              'Adesão das Escolas',
              UserCheck,
              'Define até quando novas escolas podem solicitar participação nos Jogos Escolares.'
            )}

            {renderDateField(
              'diretor_cadastro_alunos_data_limite',
              'Inscrição de Atletas',
              Users,
              'Prazo final para que diretores e coordenadores finalizem o cadastro dos seus alunos.'
            )}

            {renderDateField(
              'diretor_editar_modalidades_data_limite',
              'Seleção de Modalidades',
              Trophy,
              'Data limite para vincular ou desvincular modalidades esportivas à escola.'
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                size="large"
                className="bg-[#0f766e] hover:bg-[#0d6961] shadow-lg shadow-emerald-900/10 px-10 rounded-xl font-bold text-base h-12"
              >
                Salvar Cronograma
              </Button>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: 'midias',
      label: (
        <span className="flex items-center gap-2">
          <ImageIcon size={16} />
          Central de Mídias
        </span>
      ),
      children: (
        <div className="mt-4">
          <Midias embedded />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {!embedded && (
        <header className="flex flex-col gap-1">
          <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
            Configurações do Sistema
          </h1>
          <p className="text-[0.9375rem] text-[#64748b] m-0">
            Ajuste cronogramas, prazos e elementos visuais da plataforma.
          </p>
        </header>
      )}

      <Tabs
        defaultActiveKey="prazos"
        items={tabItems}
        className="custom-tabs"
        type="card"
      />

      <style>{`
        .custom-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid #f1f5f9;
        }
        .custom-tabs .ant-tabs-tab {
          background: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
          border-bottom: none !important;
          border-radius: 8px 8px 0 0 !important;
          margin-right: 4px !important;
          padding: 12px 20px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-tabs .ant-tabs-tab .ant-tabs-tab-btn {
          font-size: 1rem !important;
          font-weight: 500 !important;
          color: #64748b;
        }
        .custom-tabs .ant-tabs-tab-active {
          background: white !important;
          border-color: #f1f5f9 !important;
        }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #0f766e !important;
          font-weight: 700 !important;
        }
        .custom-tabs .ant-tabs-tab:hover {
          color: #0f766e !important;
        }
      `}</style>
    </div>
  )
}
export default Configuracoes
