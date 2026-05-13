import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, Spin } from 'antd'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MapPinned,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { publicLocaisService } from '../../services/publicLocaisService'
import { publicCampeonatosService } from '../../services/publicCampeonatosService'
import StorageImage from '../StorageImage'
import { resultadosConfrontoHref } from '../../utils/resultadosConfrontoHref'

function mapsHref(local) {
  const link = local.link_maps?.trim()
  if (link) return link
  const q = (local.endereco_completo || local.nome || '').trim()
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function horarioCurto(iso) {
  if (iso == null || String(iso).trim() === '') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function badgeInfoJogoModal(inicioEm) {
  if (inicioEm == null || String(inicioEm).trim() === '') {
    return { label: '—', pill: 'bg-slate-100 text-slate-500' }
  }
  const d = new Date(inicioEm)
  const t = d.getTime()
  if (Number.isNaN(t)) {
    return { label: '—', pill: 'bg-slate-100 text-slate-500' }
  }
  if (t <= Date.now()) {
    return { label: 'Em andamento', pill: 'bg-emerald-100 text-emerald-800' }
  }
  const dataStr = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return { label: dataStr, pill: 'bg-sky-100 text-sky-800' }
}

export default function LocaisCarousel() {
  const [locais, setLocais] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [jogosModalLocal, setJogosModalLocal] = useState(null)
  const [modalJogos, setModalJogos] = useState([])
  const [modalJogosLoading, setModalJogosLoading] = useState(false)
  const carouselRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    publicLocaisService
      .list()
      .then((data) => {
        if (!cancelled) setLocais(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setLocais([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!jogosModalLocal) {
      setModalJogos([])
      setModalJogosLoading(false)
      return
    }
    let cancelled = false
    setModalJogosLoading(true)
    setModalJogos([])
    publicCampeonatosService
      .getProximosConfrontos(null, 40, null, jogosModalLocal.id)
      .then((data) => {
        if (!cancelled) setModalJogos(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setModalJogos([])
      })
      .finally(() => {
        if (!cancelled) setModalJogosLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [jogosModalLocal])

  const closeJogosModal = () => {
    setJogosModalLocal(null)
    setModalJogos([])
    setModalJogosLoading(false)
  }

  const updateActiveFromScroll = useCallback(() => {
    const el = carouselRef.current
    if (!el || !locais.length) return
    const cards = el.querySelectorAll('[data-local-card]')
    if (!cards.length) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    cards.forEach((card, i) => {
      const left = card.offsetLeft
      const w = card.offsetWidth
      const dist = Math.abs(mid - (left + w / 2))
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setActiveIndex(best)
  }, [locais.length])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    updateActiveFromScroll()
    el.addEventListener('scroll', updateActiveFromScroll, { passive: true })
    return () => el.removeEventListener('scroll', updateActiveFromScroll)
  }, [locais, updateActiveFromScroll])

  const scroll = (direction) => {
    const el = carouselRef.current
    if (!el) return
    const card = el.querySelector('[data-local-card]')
    const gap = 16
    const step = (card?.offsetWidth ?? 288) + gap
    el.scrollTo({
      left: direction === 'left' ? el.scrollLeft - step : el.scrollLeft + step,
      behavior: 'smooth',
    })
  }

  const scrollToIndex = (i) => {
    const el = carouselRef.current
    const card = el?.querySelectorAll('[data-local-card]')?.[i]
    if (!card || !el) return
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
  }

  if (loading || locais.length === 0) return null

  return (
    <section
      id="locais-edicao"
      className="relative overflow-hidden border-y border-emerald-100/70 bg-gradient-to-b from-[#f0fdf4] to-white py-12 md:py-16"
    >
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-teal-100/40 blur-3xl" />

      <Modal
        open={Boolean(jogosModalLocal)}
        onCancel={closeJogosModal}
        footer={null}
        closable={false}
        width={520}
        centered
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
        classNames={{ content: 'rounded-2xl overflow-hidden' }}
      >
        {jogosModalLocal && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-black uppercase tracking-widest text-teal-700">
                    Próximos jogos
                  </p>
                  <h3 className="m-0 mt-0.5 font-display text-lg font-bold leading-tight text-[#042f2e]">
                    {jogosModalLocal.nome}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeJogosModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {modalJogosLoading ? (
              <div className="flex justify-center py-14">
                <Spin size="large" />
              </div>
            ) : modalJogos.length === 0 ? (
              <p className="m-0 py-6 text-center text-sm text-slate-500">
                Não há jogos agendados neste local no momento.
              </p>
            ) : (
              <ul className="m-0 max-h-[min(60vh,420px)] list-none space-y-0 overflow-y-auto p-0">
                {modalJogos.map((j) => {
                  const st = badgeInfoJogoModal(j.inicio_em)
                  return (
                    <li key={j.partida_id} className="border-b border-slate-100 last:border-0">
                      <Link
                        to={resultadosConfrontoHref(j)}
                        onClick={closeJogosModal}
                        className="flex flex-col gap-2 rounded-lg py-3 text-inherit no-underline outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 sm:grid sm:grid-cols-[3.25rem_minmax(0,6.5rem)_1fr_auto] sm:items-center sm:gap-3"
                      >
                        <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold tabular-nums text-slate-700">
                          {horarioCurto(j.inicio_em)}
                        </div>
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-bold text-slate-800">{j.esporte_nome}</p>
                          <p className="m-0 mt-0.5 text-[11px] leading-snug text-slate-500">
                            {[j.categoria_nome, j.naipe_nome].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <p className="m-0 min-w-0 text-xs font-semibold leading-snug text-slate-700 sm:px-1">
                          <span className="line-clamp-2">
                            {j.mandante_nome}
                            <span className="mx-1 font-normal text-slate-400">×</span>
                            {j.visitante_nome}
                          </span>
                        </p>
                        <div className="flex shrink-0 sm:justify-end">
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${st.pill}`}
                          >
                            {st.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="border-t border-slate-100 pt-3 text-center">
              <Link
                to="/resultados"
                onClick={closeJogosModal}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-primary no-underline transition hover:underline"
              >
                <Calendar size={16} className="shrink-0" />
                Ver programação completa
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <div className="container-portal relative z-10">
        <div className="mb-8 flex flex-col items-center text-center md:mb-10">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
              <MapPinned size={18} strokeWidth={2.25} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
              Onde competimos
            </span>
          </div>
          <h2 className="m-0 font-display text-2xl font-black uppercase tracking-tight text-[#042f2e] md:text-3xl">
            Locais da <span className="text-emerald-600">edição</span>
          </h2>
        </div>

        <div className="group/carousel px-2 md:px-12">
          <div className="relative">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-emerald-50 bg-white/90 p-2 text-emerald-600 shadow-xl shadow-emerald-900/10 transition-all duration-300 hover:bg-emerald-600 hover:text-white active:scale-95 md:left-0 md:-translate-x-6 md:p-3"
            >
              <ChevronLeft size={20} className="md:h-6 md:w-6" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Próximo"
              className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-emerald-50 bg-white/90 p-2 text-emerald-600 shadow-xl shadow-emerald-900/10 transition-all duration-300 hover:bg-emerald-600 hover:text-white active:scale-95 md:right-0 md:translate-x-6 md:p-3"
            >
              <ChevronRight size={20} className="md:h-6 md:w-6" />
            </button>

            <div
              ref={carouselRef}
              className="scrollbar-hide flex items-stretch snap-x snap-mandatory gap-4 overflow-x-auto pb-6 pt-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {locais.map((local, i) => {
                const chegarHref = mapsHref(local)
                return (
                  <motion.article
                    key={local.id}
                    data-local-card
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.06, 0.3) }}
                    className="flex w-72 shrink-0 snap-center self-stretch md:w-80"
                  >
                    <div className="group flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-emerald-900/5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-200/90 hover:shadow-xl hover:shadow-emerald-900/12">
                      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-br from-emerald-100 to-slate-200">
                        {local.foto_url ? (
                          <StorageImage
                            path={local.foto_url}
                            alt={local.nome}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-emerald-800/35 transition-transform duration-500 ease-out group-hover:scale-105">
                            <MapPin className="h-14 w-14" strokeWidth={1.15} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Sem foto</span>
                          </div>
                        )}
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 px-3 py-3 md:px-4 md:py-3.5">
                        <h3 className="m-0 line-clamp-2 min-h-[2.75rem] shrink-0 font-display text-sm font-black uppercase leading-tight tracking-tight text-[#042f2e] transition-colors duration-300 group-hover:text-emerald-950 md:min-h-[3.25rem] md:text-base">
                          {local.nome}
                        </h3>
                        <div className="mt-2 flex min-h-[3.75rem] flex-1 flex-col md:min-h-[4rem]">
                          {local.endereco_completo ? (
                            <p className="flex flex-1 items-start gap-1.5 text-[11px] leading-snug text-slate-600 md:text-xs">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary md:h-4 md:w-4" strokeWidth={2.25} />
                              <span className="line-clamp-3">{local.endereco_completo}</span>
                            </p>
                          ) : (
                            <span className="flex-1" aria-hidden />
                          )}
                        </div>
                        <div className="mt-auto flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setJogosModalLocal(local)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow-md shadow-emerald-900/20 transition-all duration-300 hover:brightness-110 active:scale-[0.98] md:text-xs"
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" strokeWidth={2.5} />
                            Ver jogos
                          </button>
                          {chegarHref ? (
                            <a
                              href={chegarHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-primary shadow-sm transition-all duration-300 hover:bg-emerald-50 group-hover:border-primary group-hover:shadow-md md:text-xs"
                            >
                              <MapPin className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" strokeWidth={2.5} />
                              Como chegar
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </div>

          {locais.length > 1 ? (
            <div className="-mt-2 mb-2 flex justify-center gap-2" role="tablist" aria-label="Slide do carrossel">
              {locais.map((local, i) => (
                <button
                  key={local.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Local ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'w-8 bg-primary' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
