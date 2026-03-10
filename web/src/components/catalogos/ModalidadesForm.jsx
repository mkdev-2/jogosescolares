import { useMemo, useState } from 'react'
import { Select, Checkbox, Button } from 'antd'
import { X } from 'lucide-react'
import ModalidadeIcon from './ModalidadeIcon'

/**
 * Formulário reutilizável de seleção de modalidades (variantes de esporte).
 * Usado no cadastro de escola e no modal de edição de modalidades do diretor.
 *
 * @param {Object} props
 * @param {Array} props.variantes - Lista de variantes (esporte_variantes com esporte_nome, naipe_nome, categoria_nome, etc.)
 * @param {string[]} props.value - IDs das variantes selecionadas
 * @param {function(string[]): void} props.onChange - Callback ao alterar seleção
 * @param {string} [props.error] - Mensagem de erro (ex.: validação)
 * @param {boolean} [props.loading] - Exibe loading no lugar do conteúdo
 * @param {boolean} [props.requireAtLeastOne=true] - Se true, não exibe aviso quando nenhuma selecionada (validação fica por conta do pai)
 * @param {string} [props.emptyMessage] - Mensagem quando não há variantes cadastradas
 */
export default function ModalidadesForm({
  variantes = [],
  value = [],
  onChange,
  error,
  loading = false,
  requireAtLeastOne = true,
  emptyMessage = 'Nenhuma modalidade cadastrada no sistema. Entre em contato com a SEMCEJ.',
}) {
  const [esporteSelecionado, setEsporteSelecionado] = useState(null)

  const variantesPorEsporte = useMemo(() => {
    return variantes.reduce((acc, v) => {
      const nome = v.esporte_nome || 'Outros'
      if (!acc[nome]) acc[nome] = []
      acc[nome].push(v)
      return acc
    }, {})
  }, [variantes])

  const iconePorEsporte = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(variantesPorEsporte).map(([nome, arr]) => [
          nome,
          arr[0]?.esporte_icone || 'Zap',
        ])
      ),
    [variantesPorEsporte]
  )

  const esportesOptions = useMemo(
    () =>
      Object.keys(variantesPorEsporte)
        .sort()
        .map((nome) => ({
          value: nome,
          label: (
            <span className="flex items-center gap-2">
              <ModalidadeIcon icone={iconePorEsporte[nome]} size={18} className="text-primary shrink-0" />
              {nome}
            </span>
          ),
        })),
    [variantesPorEsporte, iconePorEsporte]
  )

  const variantesSelecionadas = useMemo(
    () => variantes.filter((v) => (value || []).includes(v.id)),
    [variantes, value]
  )

  const toggleVariante = (varianteId) => {
    const ids = Array.isArray(value) ? [...value] : []
    const idx = ids.indexOf(varianteId)
    if (idx >= 0) ids.splice(idx, 1)
    else ids.push(varianteId)
    onChange?.(ids)
  }

  const selecionarTodasVariantesDoEsporte = (esporteNome) => {
    const variantesDoEsporte = variantesPorEsporte[esporteNome] || []
    const idsNovos = variantesDoEsporte.map((v) => v.id)
    const ids = Array.isArray(value) ? [...value] : []
    const setIds = new Set([...ids, ...idsNovos])
    onChange?.(Array.from(setIds))
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
  const errorClass = 'text-red-600 text-sm mt-1'

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="text-gray-500">Carregando modalidades...</span>
      </div>
    )
  }

  if (variantes.length === 0) {
    return (
      <p className="text-gray-500 py-4">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className={errorClass}>{error}</p>}

      <div>
        <label htmlFor="esporteSelect" className={labelClass}>
          Escolha o esporte
        </label>
        <Select
          id="esporteSelect"
          placeholder="Selecione um esporte para ver as opções"
          value={esporteSelecionado || undefined}
          onChange={setEsporteSelecionado}
          options={esportesOptions}
          className="w-full"
          allowClear
          showSearch
          filterOption={(input, opt) =>
            (opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>

      {esporteSelecionado && variantesPorEsporte[esporteSelecionado]?.length > 0 && (
        <div className="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">
              Opções de {esporteSelecionado} — marque as que sua escola pretende participar:
            </p>
            <Button
              type="default"
              size="small"
              onClick={() => selecionarTodasVariantesDoEsporte(esporteSelecionado)}
            >
              Selecionar todos
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {variantesPorEsporte[esporteSelecionado].map((v) => {
              const label = `${v.naipe_nome || ''} • ${v.categoria_nome || ''}`
              return (
                <label
                  key={v.id}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-200 hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <ModalidadeIcon icone={v.esporte_icone || 'Zap'} size={18} className="text-primary shrink-0" />
                  <Checkbox
                    checked={(value || []).includes(v.id)}
                    onChange={() => toggleVariante(v.id)}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {variantesSelecionadas.length > 0 && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Modalidades selecionadas ({variantesSelecionadas.length})
          </p>
          <ul className="space-y-1.5 text-sm text-gray-700 max-h-48 overflow-y-auto pr-1">
            {variantesSelecionadas.map((v) => (
              <li key={v.id} className="flex items-center gap-2 group">
                <ModalidadeIcon icone={v.esporte_icone || 'Zap'} size={18} className="text-primary shrink-0" />
                <span className="flex-1 min-w-0">
                  {v.esporte_nome} — {v.naipe_nome} • {v.categoria_nome}
                </span>
                <button
                  type="button"
                  onClick={() => toggleVariante(v.id)}
                  className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Remover"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
