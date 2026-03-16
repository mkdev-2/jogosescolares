import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'
import { DatePicker, Button } from 'antd'
import dayjs from 'dayjs'
import { configuracoesService } from '../services/configuracoesService'
import Midias from './noticias/Midias'

const labelClass = 'block text-lg font-medium text-gray-800 mb-2'

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
  const [diretorEditarModalidadesDataLimite, setDiretorEditarModalidadesDataLimite] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const refCadastro = useRef('')
  const refDiretor = useRef('')
  const refEditarModalidades = useRef('')

  useEffect(() => {
    refCadastro.current = cadastroDataLimite
  }, [cadastroDataLimite])
  useEffect(() => {
    refDiretor.current = diretorCadastroAlunosDataLimite
  }, [diretorCadastroAlunosDataLimite])
  useEffect(() => {
    refEditarModalidades.current = diretorEditarModalidadesDataLimite
  }, [diretorEditarModalidadesDataLimite])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessage({ type: '', text: '' })
    configuracoesService
      .get()
      .then((data) => {
        if (!cancelled && data) {
          const v1 = toDateStr(data.cadastro_data_limite)
          const v2 = toDateStr(data.diretor_cadastro_alunos_data_limite)
          const v3 = toDateStr(data.diretor_editar_modalidades_data_limite)
          setCadastroDataLimite(v1)
          setDiretorCadastroAlunosDataLimite(v2)
          setDiretorEditarModalidadesDataLimite(v3)
          refCadastro.current = v1
          refDiretor.current = v2
          refEditarModalidades.current = v3
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
    // Usar refs para ter o valor mais recente no momento do clique (estado pode estar um tick atrás)
    const v1 = (refCadastro.current || '').trim() || null
    const v2 = (refDiretor.current || '').trim() || null
    const v3 = (refEditarModalidades.current || '').trim() || null
    const payload = {
      cadastro_data_limite: v1,
      diretor_cadastro_alunos_data_limite: v2,
      diretor_editar_modalidades_data_limite: v3,
    }
    configuracoesService
      .update(payload)
      .then((data) => {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso.' })
        if (data) {
          const d1 = toDateStr(data.cadastro_data_limite)
          const d2 = toDateStr(data.diretor_cadastro_alunos_data_limite)
          const d3 = toDateStr(data.diretor_editar_modalidades_data_limite)
          setCadastroDataLimite(d1)
          setDiretorCadastroAlunosDataLimite(d2)
          setDiretorEditarModalidadesDataLimite(d3)
          refCadastro.current = d1
          refDiretor.current = d2
          refEditarModalidades.current = d3
        }
        configuracoesService.getNoCache().then((fresh) => {
          if (fresh) {
            setCadastroDataLimite(toDateStr(fresh.cadastro_data_limite))
            setDiretorCadastroAlunosDataLimite(toDateStr(fresh.diretor_cadastro_alunos_data_limite))
            setDiretorEditarModalidadesDataLimite(toDateStr(fresh.diretor_editar_modalidades_data_limite))
            refCadastro.current = toDateStr(fresh.cadastro_data_limite)
            refDiretor.current = toDateStr(fresh.diretor_cadastro_alunos_data_limite)
            refEditarModalidades.current = toDateStr(fresh.diretor_editar_modalidades_data_limite)
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
          <h2 className="font-display text-2xl font-bold text-gray-900">Datas e prazos</h2>
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
                onChange={(date) => {
                  const val = date ? date.format('YYYY-MM-DD') : ''
                  setCadastroDataLimite(val)
                  refCadastro.current = val
                }}
                format={['DD/MM/YYYY', 'DDMMYYYY']}
                placeholder="DD/MM/AAAA ou DDMMAAAA"
                className="w-full"
              />
              <p className="text-base text-gray-600 mt-2">
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
                onChange={(date) => {
                  const val = date ? date.format('YYYY-MM-DD') : ''
                  setDiretorCadastroAlunosDataLimite(val)
                  refDiretor.current = val
                }}
                format={['DD/MM/YYYY', 'DDMMYYYY']}
                placeholder="DD/MM/AAAA ou DDMMAAAA"
                className="w-full"
              />
              <p className="text-base text-gray-600 mt-2">
                Deixe em branco para não ter limite. Após esta data, diretor e coordenador não poderão cadastrar novos alunos.
              </p>
            </div>

            <div>
              <label htmlFor="diretor_editar_modalidades_data_limite" className={labelClass}>
                Data limite para diretor editar modalidades da escola
              </label>
              <DatePicker
                id="diretor_editar_modalidades_data_limite"
                value={diretorEditarModalidadesDataLimite ? dayjs(diretorEditarModalidadesDataLimite) : null}
                onChange={(date) => {
                  const val = date ? date.format('YYYY-MM-DD') : ''
                  setDiretorEditarModalidadesDataLimite(val)
                  refEditarModalidades.current = val
                }}
                format={['DD/MM/YYYY', 'DDMMYYYY']}
                placeholder="DD/MM/AAAA ou DDMMAAAA"
                className="w-full"
              />
              <p className="text-base text-gray-600 mt-2">
                Deixe em branco para não ter limite. Após esta data, o diretor não poderá alterar as modalidades em que a escola está vinculada (em Esportes).
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

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <Midias embedded />
      </div>
    </div>
  )
}

export default Configuracoes
