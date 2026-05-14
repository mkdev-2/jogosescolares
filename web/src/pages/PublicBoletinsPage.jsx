import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { Input, Pagination, Spin } from 'antd'
import PublicHeader from '../components/landing/PublicHeader'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import { publicBoletinsService } from '../services/publicBoletinsService'
import { getStorageUrl } from '../services/storageService'

const PAGE_SIZE = 10

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

export default function PublicBoletinsPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(searchInput.trim()), 400)
    return () => clearTimeout(id)
  }, [searchInput])

  const lastSyncedSearchRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const searchChanged = lastSyncedSearchRef.current !== debouncedQ
    if (searchChanged) {
      lastSyncedSearchRef.current = debouncedQ
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    setLoading(true)
    publicBoletinsService
      .list({
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        q: debouncedQ,
      })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items || [])
          setTotal(data.total ?? 0)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          setTotal(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, debouncedQ])

  const emptyMessage = debouncedQ
    ? 'Nenhum boletim encontrado para esta busca.'
    : 'Nenhum boletim publicado.'

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PublicHeader />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0f766e] hover:text-[#0d9488] mb-6 no-underline"
        >
          <ArrowLeft size={18} aria-hidden />
          Voltar à página inicial
        </Link>

        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex gap-4 px-5 py-6 sm:px-8 border-b border-slate-100">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)]"
              aria-hidden
            >
              <FileText size={22} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#042f2e] tracking-tight m-0">
                Boletins oficiais
              </h1>
              <p className="text-sm text-slate-500 m-0 mt-1">
                Todos os comunicados e documentos publicados.
              </p>
            </div>
          </div>

          <div className="px-5 py-4 sm:px-8 border-b border-slate-100 bg-slate-50/50">
            <Input.Search
              allowClear
              size="large"
              placeholder="Buscar por título ou descrição…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={(v) => setSearchInput(String(v ?? '').trim())}
              enterButton
            />
          </div>

          {loading && items.length === 0 ? (
            <div className="px-8 py-14 flex justify-center text-slate-500">
              <Spin size="large" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-8 py-14 text-center text-slate-500">{emptyMessage}</div>
          ) : (
            <Spin spinning={loading}>
              <ul className="divide-y divide-slate-100 list-none m-0 p-0">
                {items.map((b) => {
                  const pdfHref = getStorageUrl(b.documento_url)
                  return (
                    <li
                      key={b.id}
                      className="flex flex-col gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:flex-row lg:items-center lg:gap-6"
                    >
                      <div className="flex flex-wrap items-center gap-3 lg:w-[140px] shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 tabular-nums">
                          <Calendar size={16} className="text-slate-400 shrink-0" aria-hidden />
                          {formatDataBoletim(b.data_boletim)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.9375rem] font-bold text-[#0f172a] m-0 leading-snug">{b.titulo}</p>
                        {b.descricao ? (
                          <p className="text-sm text-slate-500 m-0 mt-1 leading-relaxed">{b.descricao}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 lg:ml-auto">
                        <a
                          href={pdfHref || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 min-w-[220px] sm:min-w-[240px] no-underline transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 font-extrabold text-[10px] leading-none border border-red-100">
                            PDF
                          </span>
                          <span className="flex flex-col items-start text-left">
                            <span className="text-sm font-semibold text-[#0f766e]">Baixar PDF</span>
                            <span className="text-xs text-slate-500">{formatFileSize(b.documento_bytes)}</span>
                          </span>
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Spin>
          )}

          {total > PAGE_SIZE ? (
            <div className="flex justify-center px-5 py-5 sm:px-8 border-t border-slate-100 bg-slate-50/30">
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
                showTotal={(t, range) => `${range[0]}–${range[1]} de ${t}`}
              />
            </div>
          ) : null}
        </div>
      </main>
      <FooterInstitucional />
    </div>
  )
}
