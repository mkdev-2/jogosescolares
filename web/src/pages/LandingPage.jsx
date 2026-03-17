import PublicHeader from '../components/landing/PublicHeader'
import HeroSection from '../components/landing/HeroSection'
import SchoolCTA from '../components/landing/SchoolCTA'
import ModalitiesSection from '../components/landing/ModalitiesSection'
import InfoSection from '../components/landing/InfoSection'
import GallerySection from '../components/landing/GallerySection'
import CTASection from '../components/landing/CTASection'
import FooterInstitucional from '../components/landing/FooterInstitucional'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <div className="flex flex-col flex-1">
        <HeroSection />
        <div className="relative bg-[#f8fafc] bg-gradient-to-b from-white via-slate-50 to-[#f1f5f9] pt-6 md:pt-10 pb-10 md:pb-16 overflow-hidden border-y border-slate-100">
          <ModalitiesSection />
          <SchoolCTA />
        </div>
      </div>
      <InfoSection />
      <GallerySection />
      <CTASection />
      <FooterInstitucional />
    </div>
  )
}
