import PublicHeader from '../components/landing/PublicHeader'
import HeroSection from '../components/landing/HeroSection'
import BenefitsBar from '../components/landing/BenefitsBar'
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
        <BenefitsBar />
      </div>
      <InfoSection />
      <GallerySection />
      <CTASection />
      <FooterInstitucional />
    </div>
  )
}
