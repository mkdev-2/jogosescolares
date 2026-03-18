import PublicHeader from '../components/landing/PublicHeader'
import HeroSection from '../components/landing/HeroSection'
import SchoolCTA from '../components/landing/SchoolCTA'
import HowToParticipate from '../components/landing/HowToParticipate'
import GallerySection from '../components/landing/GallerySection'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import InstagramWidget from '../components/landing/InstagramWidget'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Seção Superior */}
      <div className="flex flex-col">
        <PublicHeader />
        <div className="flex flex-col">
          <HeroSection />
          <div className="relative bg-[#f0fdf4] bg-gradient-to-b from-emerald-50/50 via-white to-emerald-50/30 pt-1 pb-8 md:pt-2 md:pb-12 overflow-hidden border-y border-emerald-100/50 shadow-[inner_0_2px_10px_rgba(16,185,129,0.05)]">
            {/* Decorações de fundo sutis */}
            <div className="absolute -left-20 top-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-20 bottom-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <HowToParticipate />
              <SchoolCTA />
            </div>
          </div>
        </div>
      </div>

      {/* Restante do Conteúdo */}
      <GallerySection />
      
      {/* Widget do Instagram */}
      <InstagramWidget />
      
      <FooterInstitucional />
    </div>
  )
}
