import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube } from 'lucide-react'
import AnimateOnScroll from '../ui/AnimateOnScroll'

const socialLinks = [
  { platform: 'facebook', url: '#', Icon: Facebook },
  { platform: 'instagram', url: '#', Icon: Instagram },
  { platform: 'youtube', url: '#', Icon: Youtube },
]

export default function FooterInstitucional() {
  return (
    <footer className="bg-[#134e4a] text-white">
      <div className="container-portal px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center md:text-left">
          <AnimateOnScroll animation="left" className="flex flex-col items-center md:items-start space-y-4 sm:space-y-6">
            <img
              src="/Jels-2026-vertical.png"
              alt="JELS - Jogos Escolares Luminenses"
              className="h-24 sm:h-28 w-auto max-w-[100px] sm:max-w-[120px] object-contain"
            />
            <p className="font-sans text-xs sm:text-sm leading-relaxed text-white/80 max-w-md md:max-w-none mx-auto md:mx-0">
              Uma iniciativa da Prefeitura Municipal para promover o esporte, a saúde e a integração
              entre as escolas da nossa cidade.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll animation="up" className="reveal-delay-100 flex flex-col items-center justify-center space-y-3 sm:space-y-6">
            <h3 className="font-display font-bold text-base sm:text-lg">Siga-nos</h3>
            <div className="flex justify-center items-center gap-3 sm:gap-4 flex-wrap">
              {socialLinks.map(({ platform, url, Icon }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-200 flex-shrink-0"
                  aria-label={platform}
                >
                  <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                </a>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll animation="left" className="reveal-delay-200 flex flex-col items-center md:items-end justify-center space-y-3 sm:space-y-6 text-center md:text-right">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors duration-200 border border-white/20"
            >
              Cadastre sua Escola
            </Link>
          </AnimateOnScroll>
        </div>
      </div>

      <div className="bg-[#042f2e] border-t border-white/10">
        <div className="container-portal px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 md:gap-6 text-center">
            <p className="font-sans text-xs sm:text-sm text-white/80">
              © 2026 Prefeitura Municipal — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
