import { useRef, useState, useEffect, forwardRef } from 'react'
import { estudantesService } from '../../services/estudantesService'
import { configuracoesService } from '../../services/configuracoesService'
import StorageImage from '../StorageImage'
import { User, Medal } from 'lucide-react'
import dayjs from 'dayjs'

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

  const nomeCompleto = estudante?.nome || '–'
  const nome = estudantesService.formatNomeParaCredencial(estudante?.nome)
  const instituicao = estudante?.escola_nome || '–'
  const cpf = estudantesService.formatCpf(estudante?.cpf) || '–'

  const formatModalidadeResto = (m) =>
    [m.categoria_nome, m.naipe_nome].filter(Boolean).join(' · ')

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
            width: 100mm !important;
            min-height: 150mm !important;
            max-height: 150mm !important;
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
            width: 100mm !important;
            min-width: 100mm !important;
            max-width: 100mm !important;
            height: 150mm !important;
            min-height: 150mm !important;
            max-height: 150mm !important;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
        }
      `
      : `
        @page { margin: 0; size: 100mm 150mm; }
        @media print {
          body * { visibility: hidden; }
          [data-credencial-cracha], [data-credencial-cracha] * { visibility: visible; }
          [data-credencial-cracha] {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100mm !important; height: 150mm !important; max-width: 100mm !important; max-height: 150mm !important;
            padding: 0 !important; margin: 0 !important; box-sizing: border-box;
            background: white; overflow: hidden;
          }
          [data-credencial-cracha] .cracha-print-wrapper {
            padding: 0 !important; margin: 0 !important;
            width: 100mm !important; height: 150mm !important;
            min-width: 100mm !important; min-height: 150mm !important;
            max-width: 100mm !important; max-height: 150mm !important;
            box-sizing: border-box;
          }
          [data-credencial-cracha] .cracha-card {
            box-shadow: none !important;
            width: 100mm !important; min-width: 100mm !important; max-width: 100mm !important;
            min-height: 150mm !important; max-height: 150mm !important; height: 150mm !important;
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
          style={{ width: '100mm', minHeight: '150mm', maxHeight: '150mm' }}
        >
          {/* Cabeçalho */}
          <div className="bg-[#0f766e] text-white py-4 px-3 shrink-0 flex items-center justify-center">
            <Medal className="w-11 h-11 opacity-95" strokeWidth={2} />
          </div>

          {/* Foto + informações (LAYOUT VERTICAL) */}
          <div className="flex flex-col items-center p-4 w-full flex-1">
            <div
              className="rounded-full overflow-hidden border-2 border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center mb-5 shrink-0"
              style={{ width: '54mm', height: '54mm' }}
            >
              {estudante?.foto_url ? (
                <StorageImage path={estudante.foto_url} alt={nomeCompleto} className="w-full h-full object-cover" />
              ) : (
                <User className="w-18 h-18 text-[#94a3b8]" />
              )}
            </div>

            <div className="flex flex-col items-center text-center w-full px-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome:</span>
              <h2 className="text-[21px] font-bold text-[#042f2e] m-0 mb-6 leading-tight uppercase w-full">
                {nome}
              </h2>

              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Escola:</span>
              <p className="text-[16px] font-semibold text-[#334155] m-0 mb-6 leading-snug w-full">
                {instituicao}
              </p>

              {estudante?.data_nascimento && (
                <>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data de nascimento:</span>
                  <p className="text-[14px] font-bold text-[#0f766e] m-0 leading-tight uppercase mb-6">
                    {dayjs(estudante.data_nascimento).format('DD/MM/YYYY')}
                  </p>
                </>
              )}
            </div>

            {/* Modalidades */}
            <div className="w-full px-3 py-1 flex justify-center mt-2">
              {loadingModalidades ? (
                <p className="text-[12px] text-[#64748b] m-0">Carregando...</p>
              ) : modalidades.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {modalidades.map((m, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center justify-center rounded-full bg-white px-3 py-2 border border-slate-200/90 shadow-sm min-w-0 max-w-full box-border"
                    >
                      <span
                        className="text-[12px] font-bold text-[#042f2e] uppercase text-center [overflow-wrap:anywhere] leading-none block"
                        style={{ transform: 'translateY(-0.07em)' }}
                      >
                        {m.esporte_nome || '–'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#94a3b8] m-0 italic">Nenhuma modalidade vinculada</p>
              )}
            </div>
          </div>

          {/* Rodapé: REALIZAÇÃO + logos */}
          <div className="shrink-0 bg-[#f8fafc] border-t border-[#e2e8f0] pt-2 pb-2.5 px-3">
            <p className="text-[11px] text-[#64748b] m-0 mb-1.5 uppercase tracking-wide font-semibold text-center">Realização</p>
            <div className="flex items-center justify-center gap-6">
              {logos.logo_secretaria ? (
                <StorageImage path={logos.logo_secretaria} alt="Secretaria" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
              ) : null}
              {logos.logo_jels ? (
                <StorageImage path={logos.logo_jels} alt="JELS" className="max-h-14 max-w-[80px] w-auto h-auto object-contain object-center" />
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
