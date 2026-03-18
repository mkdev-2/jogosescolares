import { useRef, useMemo } from 'react'

export default function TermoAdesaoPrint({ dados, variantes, ano = 2026, onClose }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  // Desestruturando dados do formulário
  const form = dados || {}
  const inst = form || {}
  const diretor = form.diretor || {}
  const coordenador = form.coordenador || {}
  const selecionadas = form.varianteIds || []

  // Agrupando todas as variantes vindas do banco de dados (mesma listagem que alimenta o select)
  // Estrutura: tipo_modalidade_nome -> esporte_nome -> categoria_nome -> naipe_nome -> variante
  const modalidadesAgrupadas = useMemo(() => {
    const tipos = {
      'MODALIDADES INDIVIDUAIS': {},
      'MODALIDADES COLETIVAS': {},
      'NOVAS MODALIDADES': {},
    }

    // Variantes ativas
    variantes.forEach(v => {
      let tipoChave = 'NOVAS MODALIDADES' // fallback
      const tn = (v.tipo_modalidade_nome || '').toUpperCase()
      if (tn.includes('INDIVIDUAL') || tn.includes('INDIVIDUAIS')) tipoChave = 'MODALIDADES INDIVIDUAIS'
      if (tn.includes('COLETIVA') || tn.includes('COLETIVAS')) tipoChave = 'MODALIDADES COLETIVAS'

      if (!tipos[tipoChave][v.esporte_nome]) {
        tipos[tipoChave][v.esporte_nome] = {}
      }

      const catMap = {
        '12 a 14 anos': 'IFL',
        '15 a 17 anos': 'IFO'
      }
      const cat = catMap[v.categoria_nome] || v.categoria_nome

      if (!tipos[tipoChave][v.esporte_nome][cat]) {
        tipos[tipoChave][v.esporte_nome][cat] = { M: null, F: null }
      }

      // naipe_codigo: 'MASCULINO' -> 'M', 'FEMININO' -> 'F', 'MISTO' -> 'MISTO'
      let naipeKey = v.naipe_nome?.substring(0, 1).toUpperCase()
      if (naipeKey !== 'M' && naipeKey !== 'F') naipeKey = 'MISTO' // Caso haja

      if (tipos[tipoChave][v.esporte_nome][cat][naipeKey] === null) {
        tipos[tipoChave][v.esporte_nome][cat][naipeKey] = v
      }
    })

    return tipos
  }, [variantes])

  const renderTabelasModalidades = () => {
    return Object.entries(modalidadesAgrupadas).map(([nomeTipo, esportesObj]) => {
      const listaEsportes = Object.entries(esportesObj)
      if (listaEsportes.length === 0) return null

      return (
        <div key={nomeTipo} className="mb-6">
          <h3 className="text-center font-bold text-[11px] mb-3 uppercase">{nomeTipo}</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {listaEsportes.map(([nomeEsporte, categoriasObj]) => {
              // Descobre categorias e naipes para este esporte
              const catKeys = Object.keys(categoriasObj).sort() // ['IFL', 'IFO'] geralmente

              return (
                <table key={nomeEsporte} className="border-collapse text-[10px] text-center shrink-0">
                  <thead>
                    <tr>
                      <th colSpan={catKeys.length * 2} className="border border-black bg-[#475569] text-white p-1 font-bold">
                        {nomeEsporte.toUpperCase()}
                      </th>
                    </tr>
                    <tr>
                      {catKeys.map(cat => (
                        <th key={cat} colSpan={2} className="border border-black bg-[#f1f5f9] p-1 font-bold">
                          {cat}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {catKeys.map(cat => (
                        <tr key={cat} className="contents">
                          <th className="border border-black bg-white p-1 w-6">M</th>
                          <th className="border border-black bg-white p-1 w-6">F</th>
                        </tr>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {catKeys.map(cat => {
                        const varM = categoriasObj[cat]['M']
                        const varF = categoriasObj[cat]['F']

                        const renderBox = (variante) => {
                          if (!variante) {
                            return <td className="border border-black bg-gray-300 w-6 h-6"></td>
                          }
                          const isSelected = selecionadas.includes(variante.id)
                          return (
                            <td className={`border border-black w-6 h-6 font-bold text-lg leading-none ${isSelected ? 'bg-[#bae6fd]' : 'bg-[#e0f2fe]'}`}>
                              {isSelected ? 'X' : ''}
                            </td>
                          )
                        }

                        return (
                          <tr key={cat} className="contents">
                            {renderBox(varM)}
                            {renderBox(varF)}
                          </tr>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              )
            })}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="bg-white text-black">
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body * { visibility: hidden; }
          #print-termo, #print-termo * { visibility: visible; }
          #print-termo { position: absolute; left: 0; top: 0; width: 100%; background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print flex flex-wrap gap-2 justify-end mb-4 p-4 border-b border-gray-200">
        {onClose && (
          <button type="button" className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded" onClick={onClose}>
            Cancelar
          </button>
        )}
        <button type="button" className="px-4 py-2 bg-[#0f766e] text-white font-medium rounded hover:bg-[#0d6961]" onClick={handlePrint}>
          Imprimir Termo
        </button>
      </div>

      <div id="print-termo" ref={printRef} className="max-w-[210mm] mx-auto p-4 text-[12px] leading-snug">
        
        {/* CABEÇALHO COM LOGOS */}
        <div className="flex items-center justify-between mb-8 border-b border-black pb-2">
          <img src="/Jels-2026-horizontal.png" alt="JELS" className="h-12 object-contain" fallback="" />
          <div className="text-center font-bold text-[14px] uppercase flex-1 mx-4">
            Termo de Adesão JELS {ano}
          </div>
          <img src="/logo-semcej.png" alt="SEMCEJ" className="h-12 object-contain" fallback="" />
        </div>

        <p className="mb-4 text-justify">
          Pelo presente instrumento, a instituição de ensino abaixo qualificada oficializa o seu interesse e a sua efetiva inscrição nos <strong>Jogos Escolares Luminenses (JELS) {ano}</strong>, declarando ciência e concordância irrestrita com todas as normas, diretrizes e sanções constantes nos Regulamentos Específicos e no Regulamento Geral da competição.
        </p>

        {/* DADOS DA ESCOLA */}
        <div className="border border-black p-2 mb-4">
          <h2 className="font-bold uppercase text-[11px] mb-2 border-b border-black pb-1">Identificação da Instituição de Ensino</h2>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-8"><strong>NOME/RAZÃO SOCIAL:</strong> {inst.nomeRazaoSocial}</div>
            <div className="col-span-4"><strong>INEP:</strong> {inst.inep}</div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-4"><strong>CNPJ:</strong> {inst.cnpj}</div>
            <div className="col-span-8"><strong>ENDEREÇO:</strong> {inst.endereco}</div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4"><strong>CIDADE/UF:</strong> {inst.cidade} - {inst.uf}</div>
            <div className="col-span-4"><strong>TELEFONE:</strong> {inst.telefone}</div>
            <div className="col-span-4"><strong>E-MAIL:</strong> {inst.email}</div>
          </div>
        </div>

        {/* DIREÇÃO E COORDENAÇÃO */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-black p-2">
            <h2 className="font-bold uppercase text-[11px] mb-2 border-b border-black pb-1">Dados do Diretor(a) Escolar</h2>
            <div className="mb-1"><strong>NOME:</strong> {diretor.nome}</div>
            <div className="mb-1"><strong>CPF:</strong> {diretor.cpf}</div>
            <div className="mb-1"><strong>RG:</strong> {diretor.rg}</div>
          </div>
          <div className="border border-black p-2">
            <h2 className="font-bold uppercase text-[11px] mb-2 border-b border-black pb-1">Dados do Coordenador(a)</h2>
            <div className="mb-1"><strong>NOME:</strong> {coordenador.nome}</div>
            <div className="mb-1"><strong>CPF:</strong> {coordenador.cpf}</div>
            <div className="mb-1"><strong>CELULAR:</strong> {coordenador.telefone}</div>
          </div>
        </div>

        {/* TABELAS DE MODALIDADES VINDAS DO DOCX */}
        <div className="mb-8 border border-black p-4">
          <h2 className="text-center font-bold text-[12px] mb-4 uppercase text-[#0f766e]">Modalidades de Inscrição da Escola</h2>
          <p className="text-xs text-center mb-6">
            As modalidades em que sua escola escolheu participar estão assinaladas com um 'X' na grade abaixo.
          </p>

          {renderTabelasModalidades()}

        </div>

        {/* DECLARAÇÕES FINAIS E ASSINATURA */}
        <p className="text-justify text-[11px] mb-8 leading-tight">
          A direção da escola se responsabiliza inteiramente pela veracidade das informações apresentadas, incluindo o status de regular matrícula e as idades dos estudantes-atletas a serem inscritos nas suas respectivas categorias, assumindo total responsabilidade civil, administrativa e penal em caso de declaração falsa ou uso indevido de documentações, eximindo a Secretaria Municipal de Esportes e Lazer (SEMCEJ) e demais organizadores de quaisquer ônus.
        </p>

        <div className="flex justify-center mt-12 mb-8">
          <div className="text-center w-80">
            <div className="border-t border-black pt-2 font-bold uppercase text-[11px]">
              Assinatura do Diretor(a) Escolar e Carimbo
            </div>
            <p className="text-[10px] mt-1">{form.cidade} - {form.uf}, {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
