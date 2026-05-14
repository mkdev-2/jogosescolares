import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, FileText } from 'lucide-react'
import { publicBoletinsService } from '../../services/publicBoletinsService'
import { getStorageUrl } from '../../services/storageService'

function formatDataBoletim(isoOrDate) {
  if (isoOrDate == null || String(isoOrDate).trim() === '') return '—'
  const s = String(isoOrDate).trim()
  const d = s.length <= 10 ? new Date(`${s}T12:00:00`) : new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatFileSize(bytes) {
  if (bytes == null || bytes === '' || Number(bytes) <= 0) return '—'
  const n = Number(bytes)
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1)
  const v = n / k ** i
  const rounded = i === 0 ? Math.round(v) : Math.round(v * 10) / 10
  return `${rounded} ${sizes[i]}`
}

export default function BoletinsOficiaisSection({ limit = 4 }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    publicBoletinsService
      .list({ limit })
      .then((data) => {
        if (!cancelled) setItems(data.items || [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [limit])

  return (
    <section className="relative bg-[#f8fafc] py-12 md:py-16 border-y border-slate-200/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-5 py-5 sm:px-6 sm:py-6 border-b border-slate-100">
            <div className="flex gap-4 min-w-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)]"
                aria-hidden
              >
                <FileText size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#042f2e] tracking-tight m-0">
                  BOLETINS OFICIAIS
                </h2>
                <p className="text-sm text-slate-500 m-0 mt-1 leading-snug">
                  Acesse os comunicados, avisos e decisões oficiais dos Jogos Escolares.
                </p>
              </div>
            </div>
            <Link
              to="/boletins"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] hover:text-[#0d9488] shrink-0 self-start sm:self-center"
            >
              Ver todos os boletins
              <ChevronRight size={18} className="opacity-80" aria-hidden />
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">Carregando boletins…</div>
          ) : items.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">
              Nenhum boletim publicado no momento.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 list-none m-0 p-0">
              {items.map((b) => {
                const pdfHref = getStorageUrl(b.documento_url)
                return (
                  <li key={b.id} className="flex flex-col gap-2 px-4 py-2.5 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:gap-4">
                    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:w-[128px] shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-slate-500 tabular-nums">
                        <Calendar size={14} className="text-slate-400 shrink-0" aria-hidden />
                        {formatDataBoletim(b.data_boletim)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-sm font-bold text-[#0f172a] m-0 leading-tight">{b.titulo}</p>
                      {b.descricao ? (
                        <p className="text-xs text-slate-500 m-0 mt-0.5 leading-snug line-clamp-2">{b.descricao}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 lg:ml-auto">
                      <a
                        href={pdfHref || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 min-w-[200px] sm:min-w-[220px] no-underline transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600 font-extrabold text-[9px] leading-none border border-red-100">
                          PDF
                        </span>
                        <span className="flex flex-col items-start text-left gap-0">
                          <span className="text-xs font-semibold text-[#0f766e] leading-none">Baixar PDF</span>
                          <span className="text-[11px] text-slate-500 leading-tight mt-0.5">{formatFileSize(b.documento_bytes)}</span>
                        </span>
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
