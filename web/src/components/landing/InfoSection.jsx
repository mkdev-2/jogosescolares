import { Trophy, Calendar, MapPin, Users } from 'lucide-react'

const infoCards = [
  {
    icon: Calendar,
    title: 'Datas',
    description: 'As datas serão divulgadas em breve. Fique atento às atualizações!',
  },
  {
    icon: MapPin,
    title: 'Local',
    description: 'Os jogos acontecerão em diversas instalações esportivas da cidade.',
  },
  {
    icon: Trophy,
    title: 'Modalidades',
    description: 'Futsal, Vôlei, Basquete, Handebol, Atletismo e muito mais.',
  },
  {
    icon: Users,
    title: 'Quem Participa',
    description: 'Alunos de escolas municipais e particulares do ensino fundamental e médio.',
  },
]

export default function InfoSection() {
  return (
    <section id="informacoes" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Informações do <span className="text-primary">Evento</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Tudo que você precisa saber sobre os Jogos Escolares Municipais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {infoCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-primary/30 transition-colors group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
