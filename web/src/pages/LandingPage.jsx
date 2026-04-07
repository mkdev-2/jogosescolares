import PublicHeader from '../components/landing/PublicHeader'
import HeroSection from '../components/landing/HeroSection'
import HowToParticipate from '../components/landing/HowToParticipate'
import GallerySection from '../components/landing/GallerySection'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import InstagramWidget from '../components/landing/InstagramWidget'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Seção Superior */}
      <div className="flex h-screen min-h-[680px] flex-col">
        <PublicHeader />
        <div className="flex min-h-0 flex-1 flex-col">
          <HeroSection />
          <div className="relative shrink-0 bg-[#f0fdf4] py-2 md:py-3 overflow-hidden border-y border-emerald-100/60 shadow-[0_-4px_20px_-8px_rgba(4,47,46,0.16)]">
            {/* Decorações de fundo sutis */}
            <div className="absolute -left-20 top-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-20 bottom-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <HowToParticipate />
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
