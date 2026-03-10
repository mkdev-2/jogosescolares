import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calendar, Search, ChevronLeft, ChevronRight, ArrowRight, Loader2, Newspaper } from 'lucide-react'
import { Select } from 'antd'
import PublicHeader from '../../components/landing/PublicHeader'
import FooterInstitucional from '../../components/landing/FooterInstitucional'
import { noticiasService } from '../../services/noticiasService'

const ITEMS_PER_PAGE = 9

function stripHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body?.textContent?.trim() || ''
}

export default function PublicNoticias() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [noticias, setNoticias] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    noticiasService
      .listar({ status: 'publicado' })
      .then(setNoticias)
      .catch((err) => {
        setError(err)
        setNoticias([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    noticiasService.listarCategorias().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return null
    const c = categorias.find((cat) => cat.slug === selectedCategory)
    return c?.name || null
  }, [selectedCategory, categorias])

  const filteredNoticias = useMemo(() => {
    return (noticias || []).filter((item) => {
      const matchSearch =
        !searchTerm ||
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.summary || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory =
        !selectedCategoryName ||
        (item.categories || []).some((cat) => String(cat).toLowerCase() === selectedCategoryName.toLowerCase())
      return matchSearch && matchCategory
    })
  }, [noticias, searchTerm, selectedCategoryName])

  const totalPages = Math.ceil(filteredNoticias.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedNoticias = filteredNoticias.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (currentPage > 1) params.set('page', String(currentPage))
    setSearchParams(params)
  }, [searchTerm, selectedCategory, currentPage, setSearchParams])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1">
        <section className="bg-primary text-white py-10 sm:py-12">
          <div className="container-portal px-4 sm:px-6">
            <span className="inline-block px-3 py-1.5 bg-white/10 rounded-full text-sm font-medium mb-4 border border-white/20">
              Informativo
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Notícias e comunicados</h1>
            <p className="text-white/90 text-base sm:text-lg max-w-2xl">
              Acompanhe as novidades dos Jogos Escolares Luminenses.
            </p>
          </div>
        </section>

        <section className="py-6 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
          <div className="container-portal px-4 sm:px-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar notícias..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <Select
                value={selectedCategory}
                onChange={(v) => {
                  setSelectedCategory(v)
                  setCurrentPage(1)
                }}
                className="w-full md:w-64 h-[42px]"
                placeholder="Categoria"
                options={[{ value: 'all', label: 'Todas as categorias' }, ...categorias.map((c) => ({ value: c.slug, label: c.name }))]}
              />
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-12">
          <div className="container-portal px-4 sm:px-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p>Carregando notícias...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-100 px-4">
                <Newspaper className="w-16 h-16 text-red-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900 mb-2">Erro ao carregar</h3>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            ) : filteredNoticias.length === 0 ? (
              <div className="text-center py-16 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
                <Newspaper className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma notícia encontrada</h3>
                <p className="text-sm text-slate-600">Ajuste os filtros ou tente outra busca.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {paginatedNoticias.map((item) => (
                    <Link
                      key={item.id}
                      to={`/noticias/${item.slug}`}
                      className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:border-primary/30 transition-all flex flex-col h-full"
                    >
                      <div className="relative aspect-video overflow-hidden bg-slate-100">
                        {item.featured_image_url ? (
                          <img
                            src={noticiasService.getStorageUrl(item.featured_image_url) || item.featured_image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Newspaper className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {(item.categories || []).slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-white/90 text-primary text-xs font-semibold rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.created_at)}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2 flex-1">
                          {item.summary || stripHtml(item.content).slice(0, 120) + '...'}
                        </p>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm mt-3">
                          Ler mais <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-slate-600 px-4">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <p className="text-center text-slate-500 text-sm mt-6">
                  Mostrando {paginatedNoticias.length} de {filteredNoticias.length} notícias
                </p>
              </>
            )}
          </div>
        </section>
      </main>
      <FooterInstitucional />
    </div>
  )
}
