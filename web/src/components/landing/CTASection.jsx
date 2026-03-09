import { Link } from 'react-router-dom'
import AnimateOnScroll from '../ui/AnimateOnScroll'

export default function CTASection() {
  return (
    <section className="py-20 px-4 bg-primary">
      <AnimateOnScroll animation="up" className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold uppercase text-white mb-4">
          Sua Escola Pode Participar!
        </h2>
        <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
          Cadastre sua escola agora e garanta a participação nos Jogos Escolares Municipais 2026.
          O prazo de adesão é limitado!
        </p>
        <Link
          to="/cadastro"
          className="inline-flex items-center justify-center rounded-full px-10 py-4 text-lg font-semibold bg-teal-300 text-gray-900 hover:bg-teal-200 transition-all duration-200 hover:scale-105 uppercase tracking-wider"
        >
          Cadastre sua Escola
        </Link>
      </AnimateOnScroll>
    </section>
  )
}
