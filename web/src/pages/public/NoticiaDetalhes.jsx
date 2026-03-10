import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Loader2, Newspaper, Share2 } from 'lucide-react'
import PublicHeader from '../../components/landing/PublicHeader'
import FooterInstitucional from '../../components/landing/FooterInstitucional'
import { noticiasService } from '../../services/noticiasService'

export default function NoticiaDetalhes() {
  const { slug } = useParams()
  const [noticia, setNoticia] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    noticiasService
      .buscarPorSlug(slug)
      .then((data) => {
        setNoticia(data)
        const cat = data?.categories?.[0]
        if (cat) {
          noticiasService
            .listar({ status: 'publicado', category: cat, limit: 6 })
            .then((list) => setRelated(list.filter((n) => n.id !== data.id).slice(0, 4)))
            .catch(() => setRelated([]))
        } else {
          setRelated([])
        }
      })
      .catch((err) => {
        setError(err)
        setNoticia(null)
      })
      .finally(() => setLoading(false))
  }, [slug])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: noticia?.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-500">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p>Carregando...</p>
        </div>
        <FooterInstitucional />
      </div>
    )
  }

  if (error || !noticia) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-32 px-6">
          <Newspaper className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Notícia não encontrada</h2>
          <Link
            to="/noticias"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar às notícias
          </Link>
        </div>
        <FooterInstitucional />
      </div>
    )
  }

  const imageUrl = noticia.featured_image_url
    ? noticiasService.getStorageUrl(noticia.featured_image_url) || noticia.featured_image_url
    : null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1">
        <article className="container-portal px-4 sm:px-6 py-8 max-w-4xl mx-auto">
          <Link
            to="/noticias"
            className="inline-flex items-center gap-2 text-primary font-medium mb-6 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar às notícias
          </Link>

          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-3">
              {(noticia.categories || []).map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-lg"
                >
                  {cat}
                </span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              {noticia.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(noticia.created_at)}
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </button>
            </div>
          </header>

          {imageUrl && (
            <div className="rounded-xl overflow-hidden mb-8 border border-slate-200">
              <img
                src={imageUrl}
                alt={noticia.title}
                className="w-full h-auto object-cover max-h-[400px]"
              />
            </div>
          )}

          <div
            className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-primary whitespace-pre-wrap text-slate-700 leading-relaxed"
          >
            {noticia.content}
          </div>

          {related.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Outras notícias</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    to={`/noticias/${item.slug}`}
                    className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    {item.featured_image_url ? (
                      <img
                        src={noticiasService.getStorageUrl(item.featured_image_url) || item.featured_image_url}
                        alt=""
                        className="w-24 h-24 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Newspaper className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(item.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <FooterInstitucional />
    </div>
  )
}
