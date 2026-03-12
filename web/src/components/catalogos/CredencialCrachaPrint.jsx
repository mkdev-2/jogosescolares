import { useRef, useState, useEffect } from 'react'
import { estudantesService } from '../../services/estudantesService'
import { configuracoesService } from '../../services/configuracoesService'
import { getStorageUrl } from '../../services/storageService'
import { User, Medal } from 'lucide-react'
import ModalidadeIcon from './ModalidadeIcon'

/**
 * Credencial/crachá para impressão: 9cm x 12cm (vertical).
 * Exibe foto do aluno, nome, instituição, CPF e modalidades em que participa.
 * Usa as logos cadastradas em Mídias (logo_secretaria, logo_jels).
 */
export default function CredencialCrachaPrint({ estudante, ano = new Date().getFullYear(), onClose }) {
  const printRef = useRef(null)
  const [modalidades, setModalidades] = useState([])
  const [loadingModalidades, setLoadingModalidades] = useState(false)
  const [logos, setLogos] = useState({ logo_secretaria: null, logo_jels: null })

  useEffect(() => {
    configuracoesService
      .getLogos()
      .then((data) => setLogos({ logo_secretaria: data?.logo_secretaria ?? null, logo_jels: data?.logo_jels ?? null }))
      .catch(() => setLogos({ logo_secretaria: null, logo_jels: null }))
  }, [])

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

  const formatModalidadeResto = (m) =>
    [m.categoria_nome, m.naipe_nome].filter(Boolean).join(' · ')

  const BADGE_COLORS = ['#0f766e', '#b45309', '#0369a1', '#0d9488']
  const getBadgeColor = (i) => BADGE_COLORS[i % BADGE_COLORS.length]

  return (
    <div className="bg-white text-[#334155]">
      <style>{`
        @page { margin: 0; size: 90mm 120mm; }
        @media print {
          body * { visibility: hidden; }
          [data-credencial-cracha], [data-credencial-cracha] * { visibility: visible; }
          [data-credencial-cracha] {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 90mm !important; height: 120mm !important; max-width: 90mm !important; max-height: 120mm !important;
            padding: 0 !important; margin: 0 !important; box-sizing: border-box;
            background: white; overflow: hidden;
          }
          [data-credencial-cracha] .cracha-print-wrapper {
            padding: 0 !important; margin: 0 !important;
            width: 90mm !important; height: 120mm !important;
            min-width: 90mm !important; min-height: 120mm !important;
            max-width: 90mm !important; max-height: 120mm !important;
            box-sizing: border-box;
          }
          [data-credencial-cracha] .cracha-card {
            box-shadow: none !important;
            width: 90mm !important; min-width: 90mm !important; max-width: 90mm !important;
            min-height: 120mm !important; max-height: 120mm !important; height: 120mm !important;
            box-sizing: border-box;
          }
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

      <div ref={printRef} data-credencial-cracha className="cracha-print-wrapper flex justify-center items-start p-2 box-border">
        <div
          className="cracha-card border-2 border-[#0f766e] rounded-xl overflow-hidden bg-white shadow-lg flex flex-col box-border"
          style={{ width: '90mm', minHeight: '120mm', maxHeight: '120mm' }}
        >
          {/* Cabeçalho: ícone medalha + título (layout da imagem) */}
          <div className="bg-[#0f766e] text-white py-2 px-3 shrink-0 flex items-center justify-center gap-2">
            <Medal className="w-8 h-8 shrink-0 opacity-95" strokeWidth={2} />
            <div className="text-center flex-1 min-w-0">
              <p className="text-[14px] font-bold m-0 uppercase tracking-wide leading-tight">JELS {ano}</p>
              <p className="text-[11px] m-0 opacity-90 leading-tight">Credencial do Atleta</p>
            </div>
            <span className="w-8 shrink-0" aria-hidden />
          </div>

          {/* Foto + informações */}
          <div className="flex flex-1 min-h-0 p-3 gap-3 w-full border-b border-[#e2e8f0]">
            <div className="flex items-center justify-center shrink-0">
              <div
                className="rounded-full overflow-hidden border-2 border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center"
                style={{ width: '32mm', height: '32mm' }}
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#94a3b8]" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 w-full">
              <p className="text-[13px] font-bold text-[#042f2e] m-0 leading-tight break-words line-clamp-2 w-full uppercase" title={nome}>
                {nome}
              </p>
              <p className="text-[11px] font-semibold text-[#334155] m-0 leading-tight break-words line-clamp-1 w-full" title={instituicao}>
                {instituicao}
              </p>
              <p className="text-[9px] text-[#64748b] m-0 uppercase tracking-wide font-medium pt-0.5">CPF</p>
              <p className="text-[11px] font-mono font-semibold text-[#042f2e] m-0 w-full">{cpf}</p>
            </div>
          </div>

          {/* Modalidades: badges/tags esportivas com ícone */}
          <div className="shrink-0 px-3 py-2 border-b border-[#e2e8f0]">
            <p className="text-[10px] text-[#0f766e] m-0 mb-1.5 uppercase tracking-wide font-bold text-center">Modalidades</p>
            {loadingModalidades ? (
              <p className="text-[11px] text-[#64748b] m-0 text-center">Carregando...</p>
            ) : modalidades.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 justify-center items-center max-h-[22mm] overflow-y-auto">
                {modalidades.map((m, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 border border-white/40 shadow-sm min-w-0"
                    style={{ backgroundColor: getBadgeColor(i) }}
                  >
                    <ModalidadeIcon icone={m.esporte_icone || 'Zap'} size={12} className="text-white shrink-0" />
                    <span className="text-[9px] font-bold text-white uppercase leading-tight truncate max-w-[45mm]">
                      {m.esporte_nome || '–'}
                      {formatModalidadeResto(m) ? ` · ${formatModalidadeResto(m)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#94a3b8] m-0 italic text-center">Nenhuma modalidade vinculada</p>
            )}
          </div>

          {/* Rodapé: REALIZAÇÃO + logos */}
          <div className="shrink-0 bg-[#f8fafc] border-t border-[#e2e8f0] pt-2 pb-2.5 px-3">
            <p className="text-[9px] text-[#64748b] m-0 mb-1.5 uppercase tracking-wide font-semibold text-center">Realização</p>
            <div className="flex items-center justify-center gap-6">
              {logos.logo_secretaria ? (
                <img src={getStorageUrl(logos.logo_secretaria)} alt="Secretaria" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
              ) : null}
              {logos.logo_jels ? (
                <img src={getStorageUrl(logos.logo_jels)} alt="JELS" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
              ) : null}
              {!logos.logo_secretaria && !logos.logo_jels ? (
                <span className="text-[10px] text-[#94a3b8]">Logos em Comunicação → Mídias</span>
              ) : null}
            </div>
          </div>

          {/* Faixa verde inferior (simetria com o cabeçalho) */}
          <div className="shrink-0 bg-[#0f766e] h-1.5" aria-hidden />
        </div>
      </div>
    </div>
  )
}
