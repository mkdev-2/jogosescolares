import { useRef, useState, useEffect } from 'react'
import { estudantesService } from '../../services/estudantesService'
import { getStorageUrl } from '../../services/storageService'
import { User } from 'lucide-react'

/**
 * Credencial/crachá para impressão: 10cm x 7cm.
 * Exibe foto do aluno, nome, instituição, CPF e modalidades em que participa.
 */
export default function CredencialCrachaPrint({ estudante, ano = new Date().getFullYear(), onClose }) {
  const printRef = useRef(null)
  const [modalidades, setModalidades] = useState([])
  const [loadingModalidades, setLoadingModalidades] = useState(false)

  useEffect(() => {
    if (!estudante?.id) {
      setModalidades([])
      return
    }
    setLoadingModalidades(true)
    estudantesService
      .getModalidades(estudante.id)
      .then(setModalidades)
      .catch(() => setModalidades([]))
      .finally(() => setLoadingModalidades(false))
  }, [estudante?.id])

  const handlePrint = () => {
    window.print()
  }

  const fotoUrl = estudante?.foto_url ? getStorageUrl(estudante.foto_url) : null
  const nome = estudante?.nome || '–'
  const instituicao = estudante?.escola_nome || '–'
  const cpf = estudantesService.formatCpf(estudante?.cpf) || '–'

  const formatModalidade = (m) =>
    [m.esporte_nome, m.categoria_nome, m.naipe_nome, m.tipo_nome].filter(Boolean).join(' · ')

  return (
    <div className="bg-white text-[#334155]">
      <style>{`
        @page { margin: 8mm; size: 100mm 70mm; }
        @media print {
          body * { visibility: hidden; }
          [data-credencial-cracha], [data-credencial-cracha] * { visibility: visible; }
          [data-credencial-cracha] { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 0; box-sizing: border-box; }
          [data-credencial-cracha] .cracha-card { box-shadow: none !important; }
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

      <div ref={printRef} data-credencial-cracha className="flex justify-center p-2">
        <div
          className="cracha-card border-2 border-[#0f766e] rounded-xl overflow-hidden bg-white shadow-lg flex flex-col"
          style={{ width: '100mm', minHeight: '70mm', maxHeight: '70mm' }}
        >
          {/* Cabeçalho evento */}
          <div className="bg-[#0f766e] text-white text-center py-2 px-3 shrink-0">
            <p className="text-[13px] font-bold m-0 uppercase tracking-wide">JELS {ano}</p>
            <p className="text-[10px] m-0 opacity-90">Credencial do Atleta</p>
          </div>

          <div className="flex flex-1 min-h-0 p-3 gap-3 w-full">
            {/* Foto à esquerda */}
            <div className="flex items-center justify-center shrink-0">
              <div
                className="rounded-full overflow-hidden border-2 border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center"
                style={{ width: '28mm', height: '28mm' }}
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#94a3b8]" />
                )}
              </div>
            </div>

            {/* Dados à direita - ocupa toda a largura restante */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 w-full">
              <p className="text-[13px] font-bold text-[#042f2e] m-0 leading-tight break-words line-clamp-2 w-full" title={nome}>
                {nome}
              </p>
              <p className="text-[10px] text-[#64748b] m-0 uppercase tracking-wide font-medium">Instituição</p>
              <p className="text-[11px] font-semibold text-[#334155] m-0 leading-tight break-words line-clamp-2 w-full" title={instituicao}>
                {instituicao}
              </p>
              <p className="text-[10px] text-[#64748b] m-0 uppercase tracking-wide pt-0.5 font-medium">CPF</p>
              <p className="text-[11px] font-mono font-semibold text-[#042f2e] m-0 w-full">{cpf}</p>
            </div>
          </div>

          {/* Modalidades */}
          <div className="shrink-0 border-t border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5">
            <p className="text-[9px] text-[#64748b] m-0 mb-0.5 uppercase tracking-wide font-semibold">Modalidades</p>
            {loadingModalidades ? (
              <p className="text-[10px] text-[#64748b] m-0">Carregando...</p>
            ) : modalidades.length > 0 ? (
              <ul className="m-0 p-0 list-none space-y-0.5 max-h-[16mm] overflow-y-auto">
                {modalidades.map((m, i) => (
                  <li key={i} className="text-[10px] text-[#334155] leading-tight">
                    {formatModalidade(m)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-[#94a3b8] m-0">Nenhuma modalidade vinculada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
