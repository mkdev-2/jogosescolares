import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { configuracoesService } from '../services/configuracoesService'

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

export default function Configuracoes({ embedded }) {
  const [cadastroDataLimite, setCadastroDataLimite] = useState('')
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
        if (!cancelled) {
          const val = data?.cadastro_data_limite ?? ''
          setCadastroDataLimite(typeof val === 'string' ? val : '')
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
    }
    configuracoesService
      .update(payload)
      .then(() => {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso.' })
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
              <input
                id="cadastro_data_limite"
                type="date"
                value={cadastroDataLimite}
                onChange={(e) => setCadastroDataLimite(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para não ter limite. Após esta data, o envio do formulário de /cadastro poderá ser bloqueado.
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

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#0f766e] text-white font-semibold hover:bg-[#0d9488] transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
