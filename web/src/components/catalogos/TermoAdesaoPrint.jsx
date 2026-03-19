import React, { useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'

export default function TermoAdesaoPrint({ dados, variantes, ano = 2026, onClose }) {
  const handlePrint = () => {
    window.print()
  }

  // Desestruturando dados do formulário
  const form = dados || {}
  const selecionadas = form.varianteIds || []

  const inst = {
    nomeRazaoSocial: form.nomeRazaoSocial,
    inep: form.inep,
    cnpj: form.cnpj,
    endereco: form.endereco,
    cidade: form.cidade,
    uf: form.uf,
    email: form.email,
    telefone: form.telefone,
  }
  const diretor = {
    nome: form.diretorNome,
    cpf: form.diretorCpf,
    rg: form.diretorRg,
  }
  const coordenador = {
    nome: form.coordenadorNome,
    cpf: form.coordenadorCpf,
    telefone: form.coordenadorTelefone,
  }

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
                        <Fragment key={cat}>
                          <th className="border border-black bg-white p-1 w-6">M</th>
                          <th className="border border-black bg-white p-1 w-6">F</th>
                        </Fragment>
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
                          <Fragment key={cat}>
                            {renderBox(varM)}
                            {renderBox(varF)}
                          </Fragment>
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

  const Content = () => (
    <div className="max-w-[210mm] mx-auto p-4 text-[12px] leading-snug text-black bg-white">
      {/* CABEÇALHO COM LOGOS */}
      <div className="flex items-center justify-between mb-8 border-b border-black pb-2">
        <img src="/Jels-2026-horizontal.png" alt="JELS" className="h-12 object-contain" fallback="" />
        <div className="text-center font-bold text-[14px] uppercase flex-1 mx-4">
          Termo de Adesão JELS {ano}
        </div>
        <img src="/logo-semcej.png" alt="SEMCEJ" className="h-12 object-contain" fallback="" />
      </div>

      <p className="mb-4 text-justify">
        <strong>TERMO DE ADESÃO QUE A INSTITUIÇÃO DE ENSINO ASSINA PERANTE A SECRETARIA MUNICIPAL DE ESPORTE E JUVENTUDE - SEMCEJ, na forma abaixo:</strong><br />
        Pelo presente Instrumento, nesta e na melhor forma de direito, a (Escola) abaixo indicada, doravante simplesmente denominado INSTITUIÇÃO DE ENSINO, neste ato tendo como seu legítimo representante, ora simplesmente denominado REPRESENTANTE LEGAL:
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
      <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div className="mb-1"><strong>TELEFONES:</strong> {coordenador.telefone}</div>
          <div className="mb-1"><strong>EMAIL:</strong> {coordenador.email}</div>
        </div>
      </div>

      <div className="text-justify mb-4">
        <p className="mb-2">Considerando que a SECRETARIA MUNICIPAL DE ESPORTE E JUVENTUDE doravante denominados SEMCEJ desenvolveu, programou e realizará os JOGOS ESCOLARES LUMINENSES - JELS {ano}, com o propósito de fomentar a prática de atividades desportivas nas Instituições de Ensino, públicas e privadas, da capital, como forma de complementação educacional, sendo, portanto, o único detentor dos diretos a elas referentes e associados.</p>
        <p>Considerando a importante atuação das Instituições de Ensino que, ao realizarem as etapas classificatórias para participação nos JOGOS ESCOLARES LUMINENSES - JELS {ano}, contribuem para desenvolver o esporte em Paço do Lumiar e fomentar a inclusão social, a promoção da saúde e o fortalecimento da educação, razão pela qual, a INSTITUIÇÃO DE ENSINO concorda em participar dos JOGOS ESCOLARES LUMINENSES - JELS {ano}, na(s) categoria(s) abaixo assinalada(s), firmando o presente Termo de Adesão sob as condições a seguir ajustadas:</p>
      </div>

      {/* TABELAS DE MODALIDADES VINDAS DO DOCX */}
      <div className="mb-4 border border-black p-4 break-inside-avoid">
        <h2 className="text-center font-bold text-[12px] mb-4 uppercase text-[#0f766e]">Modalidades de Inscrição da Escola</h2>
        <p className="text-xs text-center font-bold mb-4">
          INFANTIL (IFL) - 12 a 14 anos<br />
          INFANTO (IFO) - 15 a 17 anos
        </p>

        {renderTabelasModalidades()}

      </div>

      {/* CLAUSULAS E DECLARAÇÕES FINAIS */}
      <div className="text-justify text-[10px] space-y-3 mb-6 leading-relaxed">
        <p>
          <strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong><br />
          1.1. O objeto do presente Termo configura a adesão da INSTITUIÇÃO DE ENSINO - ao Projeto denominado JOGOS ESCOLARES LUMINENSES - JELS {ano} e, portanto, aos seus Regulamentos Gerais, Técnicos e a sua participação na respectivas Etapa Municipal, Regional, Estadual e Nacional, concordando expressamente com todas suas cláusulas e todos os seus atos vinculados, disponibilizados pela SEMCEJ, mediante as seguintes cláusulas e condições:<br />
          1.1.1.A INSTITUIÇÃO DE ENSINO deverá enviar a SEMCEJ, até a data de 18 DE ABRIL de {ano}, o presente Termo de Adesão, na sua forma original em 01 (uma) via original devidamente assinada pelo seu representante legal.<br />
          (a) Informando todas as modalidades esportivas, categoria e naipe em que Escola pretende participar nos JOGOS ESCOLARES LUMINENSES - JELS {ano};<br />
          1.1.2. Os alunos - atletas devem estar matriculados até o dia 25 de ABRIL de {ano}, na Instituição de Ensino e cursando regularmente para terem condições de participação no evento.<br />
          1.2. REPRESENTATIVIDADE<br />
          1.2.1. A Etapa Municipal deve obrigatoriamente ser disputada entre representações das Instituições de Ensino, não sendo permitida qualquer outra forma de representação (ex: Seleções Municipal).<br />
          1.2.2. Nas modalidades coletivas os alunos-atletas devem estar obrigatoriamente matriculados e cursando em uma mesma Unidade de Ensino. Considera-se unidade de ensino o endereço da unidade com o mesmo CNPJ.<br />
          1.3. FORMATO – Os JOGOS ESCOLARES LUMINENSES - JELS {ano} são realizados anualmente e a Etapa Municipal constituem-se em evento referência para as demais etapas.<br />
          1.4. MODALIDADES E PROVAS – São estabelecidas anualmente, através do Regulamento Geral e Técnico dos JOGOS ESCOLARES LUMINENSES - JELS {ano}– Etapa Municipal.<br />
          1.5. CATEGORIA – serão realizadas em 02 categorias separadamente: 12 a 14 anos (alunos-atletas nascidos em 2012, 2013 e 2014) e 15 a 17 anos (alunos-atletas nascidos em 2009, 2010 e 2011).<br />
          1.6. DIVULGAÇÃO – Na Seletiva Municipal, o MUNICÍPIO tem a responsabilidade de divulgar amplamente o evento junto às instituições de ensino públicas e privadas, através dos meios de comunicação parceiros e de grande circulação, dos órgãos oficiais do governo, da página oficial da Internet, dentre outros.<br />
          1.7. RECURSOS – A SEMCEJ utilizará os recursos provenientes do Tesouro Municipal para a realização e operacionalização desta ETAPA Municipal.
        </p>
        <div className="break-inside-avoid">
          <p className="mb-2"><strong>2. CLÁUSULA TERCEIRA - RESPONSABILIDADES</strong><br />
            2.1. As responsabilidades de cada uma das partes envolvidas estão estabelecidas nos Regulamentos Gerais, Técnicos e neste Termo de Compromisso dos JOGOS ESCOLARES LUMINENSES - JELS {ano}, das quais destacamos:<br />
            O Comitê Organizador dos JOGOS ESCOLARES LUMINENSES - JELS {ano}, será responsável em prover instalações e equipamentos esportivos para as competições e para as delegações, atendimento médico (1º atendimento), entre outros serviços durante o período de participação dos atletas no evento;<br />
            2.1.1.1. Não será responsável por nenhum serviço, das escolas que já tenha encerrado a sua participação nos JOGOS ESCOLARES LUMINENSES - JELS {ano}. <br />
            2.1.1.2. Na Etapa Municipal ficará responsável pelo pagamento da arbitragem, pessoal administrativo, materiais esportivos e premiação.<br />
            2.1.2. Cada INSTITUIÇÃO DE ENSINO tem a responsabilidade de:<br />
            2.1.2.1. Proceder à inscrição de sua delegação nos JOGOS ESCOLARES LUMINENSES - JELS {ano}.<br />
            2.1.2.2. Garantir que seus representantes tenham conhecimento integral dos regulamentos gerais e específicos deste evento.<br />
            2.1.2.3. Assumir o deslocamento de suas equipes até os locais de competição, dentro dos horários programados (ida e volta), com todas e quaisquer despesas necessárias durante este deslocamento;<br />
            ** A C.O.M IRÁ GARANTIR O TRANSPORTE PARA O ACESSO DOS ALUNOS/ ATLETAS E PROFESSORES/ TÉCNICOS AOS LOCAIS DOS JOGOS.
          </p>
        </div>
        <div className="break-inside-avoid">
          <p className="mb-2"><strong>3. CLÁUSULA QUINTA – DA VIGÊNCIA</strong><br />
            3.1. O presente Termo vigerá desde a data de sua assinatura até o dia 31 DE DEZEMBRO DE {ano}, quando se encerrará automaticamente, independentemente de qualquer comunicação, interpelação ou notificação judicial ou extrajudicial.
          </p>
          <p className="mb-2"><strong>4. CLÁUSULA SEXTA – DA RESCISÃO</strong><br />
            4.1. A partir de sua assinatura, o presente Termo de Adesão torna-se irrevogável e irretratável para todos os efeitos legais.
          </p>
          <p className="mb-2"><strong>5. CLÁUSULA OITAVA – DISPOSIÇÕES GERAIS</strong><br />
            5.1. Este instrumento contém todos os termos e condições acordadas pelas partes, sendo superveniente em relação a todos os instrumentos e entendimentos anteriores, sejam eles verbais ou escritos, sobre o mesmo objeto.<br />
            5.2. O presente Termo de Adesão somente poderá ser modificado mediante acordo por escrito, assinado por ambas as partes, sendo certo que a renúncia a qualquer disposição deste instrumento somente terá validade caso seja feita por escrito, admitindo-se, neste caso, apenas interpretação restritiva.<br />
            5.3. A INSTITUIÇÃO DE ENSINO declara expressamente, através do seu REPRESENTANTE LEGAL, estar devidamente capacitado e autorizado a firmar o presente Termo, na forma ora avençada, assumindo o compromisso de se responsabilizar pelo pagamento de todas as despesas referentes a indenizações arbitradas em juízo ou fora dele, inclusive custas judiciais e honorários de advogado que, eventualmente, a SEMCEJ, ou qualquer terceiro a quem este os tenha cedido, tenha que pagar em razão da aquisição dos direitos ora cedidos.<br />
            5.4. Ressalvados os objetivos deste Termo, o presente instrumento não importará em qualquer vínculo entre as partes, bem como entre seus empregados, ou qualquer tipo de associação, seja de natureza comercial ou societária.
          </p>
          <p><strong>6. CLÁUSULA NONA – DO FORO</strong><br />
            6.1. Fica eleito o Foro Central da Comarca de Paço do Lumiar (MA) para dirimir quaisquer dúvidas ou demandas oriundas deste instrumento, ainda que existente outro mais privilegiado.
          </p>
        </div>
      </div>

      <div className="break-inside-avoid w-full mt-6 mb-8 pt-6">
        <div className="w-full flex justify-between gap-12 text-center text-[11px] uppercase">
          <div className="w-1/2">
            <div className="border-b border-black h-8 mb-1"></div>
            <strong>(Nome/CPF e Assinatura do Representante da Instituição de Ensino)</strong>
          </div>
          <div className="w-1/2">
            <div className="border-b border-black h-8 mb-1"></div>
            <strong>(Nome/CPF e Assinatura do Representante da SEMCEJ)</strong>
          </div>
        </div>
        <p className="text-center font-bold text-[11px] uppercase mt-8 pb-4">
          PAÇO DO LUMIAR - {ano}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body > * { display: none !important; }
          body > #print-termo-container { display: block !important; }
        }
      `}</style>

      {/* RENDER PARA A TELA (DENTRO DO MODAL) */}
      <div className="no-print">
        <div className="flex flex-wrap gap-2 justify-end mb-4 p-4 border-b border-gray-200 bg-white">
          {onClose && (
            <button type="button" className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button type="button" className="px-4 py-2 bg-[#0f766e] text-white font-medium rounded hover:bg-[#0d6961]" onClick={handlePrint}>
            Imprimir Termo
          </button>
        </div>
        <Content />
      </div>

      {/* RENDER PARA A IMPRESSORA (NO BODY, EM FLUXO NORMAL) */}
      {createPortal(
        <div id="print-termo-container" className="hidden print:block w-full bg-white">
          <Content />
        </div>,
        document.body
      )}
    </>
  )
}
