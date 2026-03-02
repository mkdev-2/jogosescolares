import { Link } from 'react-router-dom'

export default function CTASection() {
  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold uppercase text-white mb-4">
          Sua Escola Pode Participar!
        </h2>
        <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10">
          Cadastre sua escola agora e garanta a participação nos Jogos Escolares Municipais 2026.
          O prazo de inscrição é limitado!
        </p>
        <Link
          to="/cadastro"
          className="inline-flex items-center justify-center rounded-full px-10 py-4 text-lg font-semibold bg-teal-300 text-gray-900 hover:bg-teal-200 transition uppercase tracking-wider"
        >
          Cadastre sua Escola
        </Link>
      </div>
    </section>
  )
}
