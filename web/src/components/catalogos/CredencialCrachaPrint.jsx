import { useRef, useState, useEffect, forwardRef } from 'react'
import { estudantesService } from '../../services/estudantesService'
import { configuracoesService } from '../../services/configuracoesService'
import { getStorageUrl } from '../../services/storageService'
import { User, Medal } from 'lucide-react'
import ModalidadeIcon from './ModalidadeIcon'

/**
 * Credencial/crachá para impressão: 9cm x 12cm (vertical).
 * Exibe foto do aluno, nome, instituição, CPF e modalidades em que participa.
 * Usa as logos cadastradas em Mídias (logo_secretaria, logo_jels).
 *
 * layoutMode:
 * - 'single': página no tamanho da credencial (90x120mm)
 * - 'bulk': credenciais empilhadas em página A4 (2 por folha, em média)
 */
const CredencialCrachaPrint = forwardRef(function CredencialCrachaPrint(
  {
    estudante,
    ano = new Date().getFullYear(),
    onClose,
    showToolbar = true,
    layoutMode = 'single',
    disablePrintStyles = false,
  },
  externalRef,
) {
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

  const printCss =
    layoutMode === 'bulk'
      ? `
        @page { margin: 0; size: A4 portrait; }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden; }
          [data-bulk-root] {
            padding-top: 0 !important;
            margin-top: 0 !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          [data-credencial-cracha], [data-credencial-cracha] * { visibility: visible; }
          [data-credencial-cracha] {
            position: static !important;
            width: 90mm !important;
            min-height: 100mm !important;
            max-height: 100mm !important;
            margin: 2mm auto 4mm !important;
            padding: 0 !important;
            box-sizing: border-box;
            background: white;
            overflow: hidden;
            page-break-inside: avoid;
          }
          /* garante no máximo 2 credenciais por página */
          [data-bulk-root] > [data-credencial-cracha]:nth-of-type(2n) {
            page-break-after: always;
          }
          [data-credencial-cracha] .cracha-print-wrapper {
            padding: 0 !important;
            margin: 0 auto !important;
            width: auto !important;
            height: auto !important;
            min-width: auto !important;
            min-height: auto !important;
            max-width: none !important;
            max-height: none !important;
            box-sizing: border-box;
          }
          [data-credencial-cracha] .cracha-card {
            box-shadow: none !important;
            width: 90mm !important;
            min-width: 90mm !important;
            max-width: 90mm !important;
            height: 100mm !important;
            min-height: 100mm !important;
            max-height: 100mm !important;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
        }
      `
      : `
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
      `

  return (
    <div className="bg-white text-[#334155]">
      {!disablePrintStyles && <style>{printCss}</style>}

      {showToolbar && (
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
      )}

      <div
        ref={(el) => {
          printRef.current = el
          if (typeof externalRef === 'function') {
            externalRef(el)
          } else if (externalRef) {
            externalRef.current = el
          }
        }}
        data-credencial-cracha
        className="cracha-print-wrapper flex justify-center items-start p-2 box-border"
      >
        <div
          className="cracha-card border-2 border-[#0f766e] rounded-xl overflow-hidden bg-white shadow-lg flex flex-col box-border"
          style={{ width: '90mm', minHeight: '120mm', maxHeight: '120mm' }}
        >
          {/* Cabeçalho: faixa superior mantendo apenas o ícone (sem título/subtítulo) */}
          <div className="bg-[#0f766e] text-white py-2 px-3 shrink-0 flex items-center justify-center">
            <Medal className="w-9 h-9 opacity-95" strokeWidth={2} />
          </div>

          {/* Foto + informações */}
          <div className="flex p-4 gap-4 w-full border-b border-[#e2e8f0]" style={{ height: '60mm' }}>
            <div className="flex items-center justify-center shrink-0">
              <div
                className="rounded-full overflow-hidden border-2 border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center"
                style={{ width: '42mm', height: '42mm' }}
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-[#94a3b8]" />
                )}
              </div>
            </div>
            <div className="pt-1 pb-1 flex flex-col box-border" style={{ width: '46mm' }} data-credencial-texto>
              <div className="w-full mb-2">
                <p className="text-[17px] font-bold text-[#042f2e] m-0 leading-tight break-words w-full uppercase">
                  {nome}
                </p>
                <p className="text-[14px] font-semibold text-[#334155] m-0 leading-tight break-words w-full mt-2">
                  {instituicao}
                </p>
              </div>
              <div className="w-full mt-auto mb-1">
                <p className="text-[12px] text-[#64748b] m-0 uppercase tracking-wider font-semibold leading-none block">CPF</p>
                <p className="text-[15px] font-mono font-bold text-[#042f2e] m-0 w-full break-all leading-none mt-1.5 block">
                  {cpf}
                </p>
              </div>
            </div>
          </div>

          {/* Modalidades: badges/tags esportivas com ícone (sem título, texto completo) */}
          <div className="shrink-0 px-3 py-2 border-t border-[#e2e8f0] mt-auto">
            {loadingModalidades ? (
              <p className="text-[12px] text-[#64748b] m-0 text-center">Carregando...</p>
            ) : modalidades.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center items-center">
                {modalidades.map((m, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 border border-white/40 shadow-sm min-w-0"
                    style={{ backgroundColor: getBadgeColor(i) }}
                  >
                    <ModalidadeIcon icone={m.esporte_icone || 'Zap'} size={16} className="text-white shrink-0" />
                    <span className="text-[11px] font-bold text-white uppercase leading-tight whitespace-normal break-words">
                      {m.esporte_nome || '–'}
                      {formatModalidadeResto(m) ? ` · ${formatModalidadeResto(m)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#94a3b8] m-0 italic text-center">Nenhuma modalidade vinculada</p>
            )}
          </div>

          {/* Rodapé: REALIZAÇÃO + logos */}
          <div className="shrink-0 bg-[#f8fafc] border-t border-[#e2e8f0] pt-2 pb-2.5 px-3">
            <p className="text-[11px] text-[#64748b] m-0 mb-1.5 uppercase tracking-wide font-semibold text-center">Realização</p>
            <div className="flex items-center justify-center gap-6">
              {logos.logo_secretaria ? (
                <img src={getStorageUrl(logos.logo_secretaria)} alt="Secretaria" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
              ) : null}
              {logos.logo_jels ? (
                <img src={getStorageUrl(logos.logo_jels)} alt="JELS" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
              ) : null}
              {!logos.logo_secretaria && !logos.logo_jels ? (
                <span className="text-[12px] text-[#94a3b8]">Logos em Comunicação → Mídias</span>
              ) : null}
            </div>
          </div>

          {/* Faixa verde inferior (simetria com o cabeçalho) */}
          <div className="shrink-0 bg-[#0f766e] h-1.5" aria-hidden />
        </div>
      </div>
    </div>
  )
})

export default CredencialCrachaPrint
