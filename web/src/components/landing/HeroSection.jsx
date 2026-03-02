import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative flex-1 flex items-center overflow-hidden min-h-[550px] md:min-h-[85vh]">
      <img
        src="/hero-bg.jpg"
        alt="Jogos Escolares Municipais - Jovens atletas em ação"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

      <div className="container-portal relative z-10 py-12 md:py-20 px-6 sm:px-8">
        <div className="mb-6 md:mb-8 inline-flex items-center gap-2 rounded-full bg-primary/80 px-4 md:px-5 py-2 text-[10px] md:text-sm font-medium text-white backdrop-blur-sm uppercase tracking-widest">
          <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-teal-300" />
          Prefeitura Municipal
        </div>

        <h1 className="mb-6 max-w-2xl font-display text-4xl sm:text-5xl md:text-7xl font-black leading-tight text-white">
          Jogos Escolares
        </h1>
        <h2 className="mb-6 max-w-2xl font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white">
          Municipais 2026
        </h2>

        <p className="mb-10 max-w-xl text-base md:text-lg text-white/90 leading-relaxed">
          Incentivando o esporte, a integração e o desenvolvimento dos nossos estudantes.
          Inscreva sua escola e faça parte desta competição!
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href="#informacoes"
            className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold bg-white/20 text-white border-2 border-white backdrop-blur-sm hover:bg-white/30 transition"
          >
            Informações
            <ArrowRight size={20} />
          </a>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold shadow-lg transition hover:shadow-xl hover:brightness-110 bg-primary text-white"
          >
            Cadastre sua Escola
            <ExternalLink size={18} className="opacity-90" />
          </Link>
        </div>
      </div>
    </section>
  )
}
