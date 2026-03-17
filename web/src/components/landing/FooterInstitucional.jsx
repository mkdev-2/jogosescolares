import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FooterInstitucional() {
  const socialLinks = [
    { platform: 'facebook', url: 'https://facebook.com/prefeituradepacodolumiar', Icon: Facebook },
    { platform: 'instagram', url: 'https://instagram.com/prefeituradepacodolumiar', Icon: Instagram },
    { platform: 'youtube', url: 'https://youtube.com/prefeituradepacodolumiar', Icon: Youtube },
  ]

  return (
    <footer className="bg-[#0d5e38] text-white">
      {/* Conteúdo Principal do Rodapé */}
      <div className="container-portal px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 text-center md:text-left">

          {/* Coluna 1: Logo e Descrição */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center md:items-start space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <img
                  src="/Jels-2026-vertical.png"
                  alt="JELS"
                  className="h-20 sm:h-24 w-auto brightness-0 invert"
                />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <img
                  src="/logo-semcej.png"
                  alt="Prefeitura"
                  className="h-20 sm:h-24 w-auto brightness-0 invert"
                />
              </div>
            </div>
            <p className="font-sans text-xs sm:text-sm leading-relaxed text-emerald-50/80 max-w-md md:max-w-none mx-auto md:mx-0">
              JELS - Jogos Escolares Luminenses. Uma iniciativa da Prefeitura de Paço do Lumiar para promover a integração, saúde e o espírito esportivo entre os jovens de nossa cidade através do esporte e educação.
            </p>
          </motion.div>

          {/* Coluna 2: Redes Sociais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center space-y-4 sm:space-y-6"
          >
            <h3 className="font-black text-base sm:text-lg uppercase tracking-widest text-emerald-200">Siga-nos</h3>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              {socialLinks.map(({ platform, url, Icon }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all duration-300 border border-white/5 shadow-lg group"
                  aria-label={platform}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Coluna 3: Informações da Prefeita */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center md:items-end justify-center space-y-4 text-center md:text-right"
          >
            <div className="flex flex-col items-center md:items-end space-y-3">
              <img
                src="/prefeito.jpeg"
                alt="Fred Campos"
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white/20 shadow-xl"
              />
              <div className="md:text-right">
                <h3 className="font-black text-base sm:text-lg text-white m-0 uppercase tracking-tight">
                  Frederico de Abreu Silva Campos
                </h3>
                <p className="font-sans text-[10px] sm:text-[11px] text-emerald-50/70 max-w-[280px] leading-relaxed mb-4 md:ml-auto">
                  Frederico de Abreu Silva Campos ( FRED CAMPOS ) é o 19º prefeito de Paço do Lumiar, eleito em 2024 com uma votação histórica de 46.957 votos, equivalente a 69,92% dos votos válidos.
                </p>
                <a
                  href="https://pacodolumiar.ma.gov.br/estrutura-organizacional/perfil-prefeito-vice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10"
                >
                  Conheça o Prefeito
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Barra de Direitos Autorais */}
      <div className="bg-[#054427] border-t border-white/5 py-6">
        <div className="container-portal px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="font-sans text-[10px] sm:text-xs text-emerald-100/50 uppercase tracking-[0.2em] text-center">
              © 2026 PREFEITURA MUNICIPAL DE PAÇO DO LUMIAR — TODOS OS DIREITOS RESERVADOS
            </p>
            <div className="flex items-center gap-6">
              <Link to="/politica-privacidade" className="text-[10px] uppercase font-bold text-white/30 hover:text-white transition-colors">Privacidade</Link>
              <Link to="/termos" className="text-[10px] uppercase font-bold text-white/30 hover:text-white transition-colors">Termos</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
