import { useState, useMemo } from 'react'
import { AutoComplete } from 'antd'
import { escolasService } from '../../services/escolasService'

export default function EscolaFilterAutoComplete({ escolas = [], value: escolaFilterId, onChange, className }) {
  const [inputValue, setInputValue] = useState('')

  const options = useMemo(() => {
    const base = [{ value: '__all__', label: 'Todas as escolas' }]
    const schoolOpts = escolas.map((e) => ({
      value: String(e.id),
      label: `${e.nome_escola || `Escola ${e.id}`} – ${escolasService.formatCnpj(e.cnpj)}`,
      escola: e,
    }))
    return [...base, ...schoolOpts]
  }, [escolas])

  const displayValue = useMemo(() => {
    if (escolaFilterId == null || escolaFilterId === '') return ''
    const opt = options.find((o) => o.value === String(escolaFilterId))
    return opt?.label ?? ''
  }, [escolaFilterId, options])

  const filterOption = (inputValue, option) => {
    if (!inputValue?.trim()) return true
    if (option.value === '__all__') {
      return 'todas as escolas'.includes(inputValue.toLowerCase().trim())
    }
    const escola = option.escola
    if (!escola) return false
    const nome = (escola.nome_escola || '').toLowerCase()
    const cnpjDigits = (escola.cnpj || '').replace(/\D/g, '')
    const searchLower = inputValue.toLowerCase().trim()
    const searchDigits = inputValue.replace(/\D/g, '')
    return (
      nome.includes(searchLower) ||
      (searchDigits.length >= 2 && cnpjDigits.includes(searchDigits))
    )
  }

  const handleSelect = (val, option) => {
    if (val === '__all__') {
      onChange(null)
      setInputValue('')
    } else {
      onChange(Number(val))
      setInputValue(option?.label ?? '')
    }
  }

  const handleChange = (v) => {
    const newVal = v ?? ''
    setInputValue(newVal)
    if (newVal.trim() === '') {
      onChange(null)
    } else if (escolaFilterId != null && escolaFilterId !== '') {
      onChange(null)
    }
  }

  const controlledValue = escolaFilterId != null && escolaFilterId !== ''
    ? displayValue
    : inputValue

  return (
    <AutoComplete
      placeholder="Buscar escola por nome ou CNPJ..."
      allowClear
      value={controlledValue}
      options={options}
      filterOption={filterOption}
      onSelect={handleSelect}
      onChange={handleChange}
      className={className}
      style={{ minWidth: 280 }}
    />
  )
}
