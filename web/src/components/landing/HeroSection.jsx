import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { configuracoesService } from "../../services/configuracoesService";
import { getStorageUrl } from "../../services/storageService";

const FALLBACK_SLIDES = ["/BANNER.jpeg"];

const slideVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.8 } },
  exit: { opacity: 0, transition: { duration: 0.8 } },
};

export default function HeroSection() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);

  const loadBanners = async () => {
    try {
      const data = await configuracoesService.get();
      const bannersStr = data?.banners_hero || '';
      const banners = bannersStr.split(',').filter(b => !!b.trim());
      
      if (banners.length > 0) {
        setSlides(banners.map(b => getStorageUrl(b)));
      }
    } catch (err) {
      console.error('Erro ao carregar banners do Hero:', err);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const next = useCallback(() => setSlides(prevSlides => {
    setCurrent(c => (c + 1) % prevSlides.length);
    return prevSlides;
  }), []);

  const prev = useCallback(() => setSlides(prevSlides => {
    setCurrent(c => (c - 1 + prevSlides.length) % prevSlides.length);
    return prevSlides;
  }), []);

  useEffect(() => {
    const timer = setInterval(() => {
       if (slides.length > 1) next();
    }, 6000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden group" style={{ aspectRatio: '1900/460' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current}-${slides[current]}`}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <motion.img
            src={slides[current]}
            alt=""
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: "linear" }}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Arrows (only show if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hero-arrow absolute left-3 md:left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            className="hero-arrow absolute right-3 md:right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`hero-indicator ${i === current ? "hero-indicator-active" : "hero-indicator-inactive"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
