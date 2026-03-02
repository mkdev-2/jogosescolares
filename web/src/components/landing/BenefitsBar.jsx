import { Activity, Heart, Users, GraduationCap } from 'lucide-react'
import AnimateOnScroll from '../ui/AnimateOnScroll'

const benefits = [
  {
    icon: Activity,
    title: 'Esporte',
    description: 'Promoção da prática esportiva',
  },
  {
    icon: Heart,
    title: 'Saúde',
    description: 'Desenvolvimento físico e mental',
  },
  {
    icon: Users,
    title: 'Integração',
    description: 'União entre escolas e comunidades',
  },
  {
    icon: GraduationCap,
    title: 'Educação',
    description: 'Valores educacionais no esporte',
  },
]

export default function BenefitsBar() {
  return (
    <section className="py-4 sm:py-6 bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] relative z-20">
      <div className="container-portal px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <AnimateOnScroll
                key={index}
                animation="up"
                className={['', 'reveal-delay-100', 'reveal-delay-200', 'reveal-delay-300'][index]}
              >
                <div className="flex items-center gap-2 sm:gap-3 group cursor-default">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-300">
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-base text-primary leading-tight transition-colors break-words">
                    {benefit.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 break-words">
                    {benefit.description}
                  </p>
                </div>
              </div>
              </AnimateOnScroll>
            )
          })}
        </div>
      </div>
    </section>
  )
}
