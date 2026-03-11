import { useRef } from 'react'

export default function FichaColetivaPrint({ dados, ano = new Date().getFullYear(), onClose }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-white text-[#334155]">
      <style>{`
        @page {
          margin: 0;
          size: auto;
        }
        @media print {
          body * { visibility: hidden; }
          [data-ficha-coletiva], [data-ficha-coletiva] * { visibility: visible; }
          [data-ficha-coletiva] { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 10mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap gap-2 justify-end mb-4">
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
          className="px-4 py-2 rounded-lg bg-[#0f766e] text-white hover:bg-[#0d6961]"
          onClick={handlePrint}
        >
          Imprimir / Exportar PDF
        </button>
      </div>

      <div ref={printRef} data-ficha-coletiva className="max-w-[210mm] mx-auto p-6 text-sm">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6 border-b border-[#e2e8f0] pb-4">
          <img src="/Jels-2026-horizontal.png" alt="JELS" className="h-14 object-contain" />
          <img src="/logo-semcej.png" alt="SEMCEJ" className="h-14 object-contain" />
        </div>
        <h1 className="text-center text-lg font-bold text-[#042f2e] mb-6">
          FICHA COLETIVA – JELS {ano}
        </h1>

        {/* Instituição e coordenador */}
        <table className="w-full border-collapse border border-[#e2e8f0] mb-4 text-xs font-bold">
          <tbody>
            <tr>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b] w-52">
                INSTITUIÇÃO DE ENSINO:
              </td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold" colSpan={3}>
                {dados?.instituicao || '–'}
              </td>
            </tr>
            <tr>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b]">
                COORDENADOR DE ESPORTES:
              </td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{dados?.coordenador_nome || '–'}</td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b] w-24">CONTATO:</td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{dados?.coordenador_contato || '–'}</td>
            </tr>
            <tr>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b]">
                E-MAIL:
              </td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold" colSpan={3}>
                {dados?.coordenador_email || '–'}
              </td>
            </tr>
            <tr>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b]">
                MODALIDADE:
              </td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{dados?.modalidade || '–'}</td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b]">CATEGORIA:</td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{dados?.categoria || '–'}</td>
            </tr>
            <tr>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold text-[#64748b]">
                NAIPE:
              </td>
              <td className="border border-[#e2e8f0] px-3 py-2 font-bold" colSpan={3}>
                {dados?.naipe || '–'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Estudantes-atletas */}
        <p className="font-semibold text-[#042f2e] mb-2">Estudantes-atletas da equipe</p>
        <table className="w-full border-collapse border border-[#e2e8f0] mb-4 font-bold text-xs">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b] w-12">Nº</th>
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b]">
                NOME DO (A) ESTUDANTE-ATLETA
              </th>
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b] w-32">
                DATA DE NASCIMENTO
              </th>
            </tr>
          </thead>
          <tbody>
            {(dados?.estudantes || []).map((est, i) => (
              <tr key={i}>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{i + 1}</td>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{est.nome || '–'}</td>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{est.data_nascimento || '–'}</td>
              </tr>
            ))}
            {(!dados?.estudantes || dados.estudantes.length === 0) && (
              <tr>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold" colSpan={3}>–</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Professor-técnico */}
        <p className="font-semibold text-[#042f2e] mb-2">Professor-técnico</p>
        <table className="w-full border-collapse border border-[#e2e8f0] mb-6 font-bold text-xs">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b] w-12">Nº</th>
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b]">
                NOME DO PROFESSOR-TÉCNICO
              </th>
              <th className="border border-[#e2e8f0] px-3 py-2 text-left text-xs font-bold text-[#64748b] w-28">
                CREF
              </th>
            </tr>
          </thead>
          <tbody>
            {(dados?.professores_tecnicos || []).map((pt, i) => (
              <tr key={i}>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{i + 1}</td>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{pt.nome || '–'}</td>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold">{pt.cref || '–'}</td>
              </tr>
            ))}
            {(!dados?.professores_tecnicos || dados.professores_tecnicos.length === 0) && (
              <tr>
                <td className="border border-[#e2e8f0] px-3 py-2 font-bold" colSpan={3}>–</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Assinaturas */}
        <div className="flex flex-col gap-6 mt-8 items-center">
          <div className="text-center w-56">
            <p className="text-[#64748b] text-xs mb-1">
              Assinatura e carimbo do representante ou da Instituição de Ensino
            </p>
            <div className="border-b border-[#334155] h-14 mx-auto" />
          </div>
          <div className="text-center w-56">
            <p className="text-[#64748b] text-xs mb-1">
              Assinatura e carimbo do médico com CRM
            </p>
            <div className="border-b border-[#334155] h-14 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
