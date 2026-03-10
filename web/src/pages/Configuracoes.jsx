import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { DatePicker, Button } from 'antd'
import dayjs from 'dayjs'
import { configuracoesService } from '../services/configuracoesService'

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

/** Normaliza valor vindo da API para string YYYY-MM-DD ou '' (para estado do DatePicker). */
function toDateStr(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val.trim().slice(0, 10) || ''
  if (typeof val === 'object' && val instanceof Date) return val.toISOString().slice(0, 10)
  try {
    const d = dayjs(val)
    return d.isValid() ? d.format('YYYY-MM-DD') : ''
  } catch {
    return ''
  }
}

function Configuracoes({ embedded }) {
  const [cadastroDataLimite, setCadastroDataLimite] = useState('')
  const [diretorCadastroAlunosDataLimite, setDiretorCadastroAlunosDataLimite] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessage({ type: '', text: '' })
    configuracoesService
      .get()
      .then((data) => {
        if (!cancelled && data) {
          setCadastroDataLimite(toDateStr(data.cadastro_data_limite))
          setDiretorCadastroAlunosDataLimite(toDateStr(data.diretor_cadastro_alunos_data_limite))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage({ type: 'error', text: err.message || 'Erro ao carregar configurações.' })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    setSaving(true)
    const payload = {
      cadastro_data_limite: cadastroDataLimite.trim() || null,
      diretor_cadastro_alunos_data_limite: diretorCadastroAlunosDataLimite.trim() || null,
    }
    configuracoesService
      .update(payload)
      .then((data) => {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso.' })
        if (data) {
          setCadastroDataLimite(toDateStr(data.cadastro_data_limite))
          setDiretorCadastroAlunosDataLimite(toDateStr(data.diretor_cadastro_alunos_data_limite))
        }
        // Rebuscar do servidor para garantir que o estado reflete o que está persistido (ex.: após atualizar a página)
        configuracoesService.get().then((fresh) => {
          if (fresh) {
            setCadastroDataLimite(toDateStr(fresh.cadastro_data_limite))
            setDiretorCadastroAlunosDataLimite(toDateStr(fresh.diretor_cadastro_alunos_data_limite))
          }
        }).catch(() => {})
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.message || 'Erro ao salvar.' })
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <header className="flex flex-col gap-1">
          <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
            Configurações
          </h1>
          <p className="text-[0.9375rem] text-[#64748b] m-0">
            Defina datas e prazos do sistema
          </p>
        </header>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#0f766e]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#0f766e]" />
          </div>
          <h2 className="font-display text-xl font-bold text-gray-900">Datas e prazos</h2>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
              <label htmlFor="cadastro_data_limite" className={labelClass}>
                Data limite para envio do formulário de cadastro
              </label>
              <DatePicker
                id="cadastro_data_limite"
                value={cadastroDataLimite ? dayjs(cadastroDataLimite) : null}
                onChange={(date) => setCadastroDataLimite(date ? date.format('YYYY-MM-DD') : '')}
                format={['DD/MM/YYYY', 'DDMMYYYY']}
                placeholder="DD/MM/AAAA ou DDMMAAAA"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para não ter limite. Após esta data, o envio do formulário de /cadastro poderá ser bloqueado.
              </p>
            </div>

            <div>
              <label htmlFor="diretor_cadastro_alunos_data_limite" className={labelClass}>
                Data limite para diretor cadastrar alunos
              </label>
              <DatePicker
                id="diretor_cadastro_alunos_data_limite"
                value={diretorCadastroAlunosDataLimite ? dayjs(diretorCadastroAlunosDataLimite) : null}
                onChange={(date) => setDiretorCadastroAlunosDataLimite(date ? date.format('YYYY-MM-DD') : '')}
                format={['DD/MM/YYYY', 'DDMMYYYY']}
                placeholder="DD/MM/AAAA ou DDMMAAAA"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para não ter limite. Após esta data, diretor e coordenador não poderão cadastrar novos alunos.
              </p>
            </div>

            {message.text && (
              <p
                className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
                role="alert"
              >
                {message.text}
              </p>
            )}

            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Configuracoes
