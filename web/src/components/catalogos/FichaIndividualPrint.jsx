import { useRef } from 'react'

export default function FichaIndividualPrint({ dados, ano = 2026, onClose }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  const est = dados?.estudante || {}
  const resp = dados?.responsavel || {}

  const formatDate = (dateStr) => {
    if (!dateStr) return '–'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-white text-[#334155]">
      <style>{`
        @page {
          margin: 10mm;
          size: A4;
        }
        @media print {
          body * { visibility: hidden; }
          [data-ficha-individual], [data-ficha-individual] * { visibility: visible; }
          [data-ficha-individual] { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white; 
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
        }
        .ficha-tabela th, .ficha-tabela td {
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
          text-align: left;
        }
        .ficha-tabela th {
          background-color: #f8fafc;
          color: #64748b;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
        }
      `}</style>

      <div className="no-print flex flex-wrap gap-2 justify-end mb-4 p-4 border-b">
        {onClose && (
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]"
            onClick={onClose}
          >
            Fechar
          </button>
        )}
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-[#0f766e] text-white hover:bg-[#0d6961] font-medium"
          onClick={handlePrint}
        >
          Imprimir / Exportar PDF
        </button>
      </div>

      <div ref={printRef} data-ficha-individual className="max-w-[210mm] mx-auto p-4 text-[11px] leading-tight">
        {/* Cabeçalho */}
        <div className="flex items-center justify-center gap-8 mb-4 border-b border-[#e2e8f0] pb-2">
          <img src="/Jels-2026-horizontal.png" alt="JELS" className="h-12 object-contain" />
          <img src="/logo-semcej.png" alt="SEMCEJ" className="h-12 object-contain" />
        </div>

        <h1 className="text-center text-sm font-bold text-[#042f2e] mb-4 uppercase">
          Termo de Responsabilidade, Cessão de Direitos e LGPD para Estudante-Atleta – {ano}
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="font-bold text-[#64748b]">MODALIDADE:</span>
            <span className="ml-2 border-b border-[#e2e8f0] flex-grow inline-block min-w-[100px] font-bold">
              {dados?.modalidade || '–'}
            </span>
          </div>
          <div>
            <span className="font-bold text-[#64748b]">ESCOLA:</span>
            <span className="ml-2 border-b border-[#e2e8f0] flex-grow inline-block min-w-[100px] font-bold uppercase">
              {est?.escola_nome || '–'}
            </span>
          </div>
        </div>

        {/* Dados do Estudante */}
        <h2 className="bg-[#0f766e] text-white px-2 py-1 text-xs font-bold mb-2 uppercase">
          Dados Cadastrais do Estudante - Atleta
        </h2>
        <table className="w-full border-collapse mb-4 ficha-tabela">
          <tbody>
            <tr>
              <th className="w-1/6">Nome</th>
              <td colSpan={3} className="font-bold uppercase">{est?.nome || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">CPF</th>
              <td className="w-2/6 font-bold">{est?.cpf || '–'}</td>
              <th className="w-1/6">RG</th>
              <td className="w-2/6 font-bold">{est?.rg || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">Data de Nasci.</th>
              <td className="w-2/6 font-bold">{formatDate(est?.dataNascimento)}</td>
              <th className="w-1/6">Sexo</th>
              <td className="w-2/6 font-bold">{est?.sexo === 'M' ? 'Masculino' : est?.sexo === 'F' ? 'Feminino' : '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">E-mail</th>
              <td className="w-2/6 font-bold">{est?.email || '–'}</td>
              <th className="w-1/6">Nº Registro Confed.</th>
              <td className="w-2/6 font-bold">{est?.numeroRegistroConfederacao || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">Endereço</th>
              <td colSpan={3} className="font-bold uppercase">{est?.endereco || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">CEP</th>
              <td className="w-2/6 font-bold">{est?.cep || '–'}</td>
              <th className="w-1/6">Instituição de Ensino</th>
              <td className="w-2/6 font-bold uppercase">{est?.escola_nome || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">INEP da Instituição</th>
              <td colSpan={3} className="font-bold">{est?.escola_inep || '–'}</td>
            </tr>
          </tbody>
        </table>

        {/* Dados da Mãe / Responsável */}
        <h2 className="bg-[#0f766e] text-white px-2 py-1 text-xs font-bold mb-2 uppercase">
          Dados Cadastrais da Mãe / Responsável
        </h2>
        <table className="w-full border-collapse mb-4 ficha-tabela">
          <tbody>
            <tr>
              <th className="w-1/6">Nome</th>
              <td colSpan={3} className="font-bold uppercase">{resp?.nome || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">CPF</th>
              <td className="w-2/6 font-bold">{resp?.cpf || '–'}</td>
              <th className="w-1/6">RG</th>
              <td className="w-2/6 font-bold">{resp?.rg || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">Celular</th>
              <td className="w-2/6 font-bold">{resp?.celular || '–'}</td>
              <th className="w-1/6">NIS / Prog. Social</th>
              <td className="w-2/6 font-bold">{resp?.nis || '–'}</td>
            </tr>
            <tr>
              <th className="w-1/6">E-mail</th>
              <td colSpan={3} className="font-bold">{resp?.email || '–'}</td>
            </tr>
          </tbody>
        </table>

        {/* Textos Legais */}
        <div className="text-[10px] text-justify space-y-2 mb-4 leading-normal">
          <p>
            Pelo presente instrumento, na melhor forma de direito, como responsável legal do estudante-atleta acima inscrito nos <strong>JOGOS ESCOLARES LUMIENSES {ano}</strong> declaro que:
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Autorizo a participação do menor acima citado e tenho pleno conhecimento dos Regulamentos Geral, Específico e Comercial dos JOGOS ESCOLARES LUMINENSES {ano}, disponíveis no site oficial da competição.</li>
            <li>O menor acima consente e concorda que a organização dos jogos tome decisões referentes ao tratamento dos dados pessoais, incluindo dados sensíveis do Titular, bem como realize o tratamento de tais dados pessoais, envolvendo operações como as que se referem a coleta, produção, recepção, classificação dos dados, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</li>
            <li>Concedo aos organizadores do evento o direito de usar o nome, voz, imagem, material biográfico, declarações, gravações, entrevistas e endossos dados pelo menor acima citado ou a ele atribuíveis, bem como de usar sons e/ou imagens do evento, durante toda a competição, para fins de divulgação e transmissão, sem limitação de tempo.</li>
            <li>Isenta os organizadores do Evento de qualquer responsabilidade por danos eventualmente causados ao menor acima citado no decorrer da competição que não decorram de negligência direta da organização.</li>
          </ul>
        </div>

        {/* Assinaturas Atleta e Responsável */}
        <div className="grid grid-cols-2 gap-8 mb-6 mt-4">
          <div className="text-center">
            <div className="border-b border-black h-8 mb-1" />
            <p className="font-bold text-[9px]">Assinatura do Estudante-atleta</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black h-8 mb-1" />
            <p className="font-bold text-[9px]">Assinatura do Responsável Legal</p>
          </div>
        </div>

        {/* Declaração Médica */}
        <div className="border border-[#e2e8f0] p-2 mb-4">
          <p className="text-[9px] mb-4">
            Declaro para os devidos fins que o menor acima citado está em pleno gozo de saúde e em condições físicas de participar do Evento, não havendo qualquer tipo de impedimento ou restrição à prática de atividades físicas e esportivas.
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-b border-black h-8 mb-1" />
              <p className="font-bold text-[9px]">Carimbo do Médico com CRM</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black h-8 mb-1" />
              <p className="font-bold text-[9px]">Assinatura do Médico</p>
            </div>
          </div>
        </div>

        {/* Declaração Instituição */}
        <div className="border border-[#e2e8f0] p-2">
          <p className="text-[9px] mb-4 uppercase">
            Declaro que o menor acima citado está devidamente matriculado na Instituição de Ensino acima mencionada, conforme estabelece o Regulamento Geral dos JOGOS ESCOLARES LUMIENSES {ano}.
          </p>
          <div className="max-w-[300px] mx-auto text-center">
            <div className="border-b border-black h-8 mb-1" />
            <p className="font-bold text-[9px]">Assinatura e Carimbo do Responsável e da Instituição de Ensino</p>
          </div>
        </div>
      </div>
    </div>
  )
}
