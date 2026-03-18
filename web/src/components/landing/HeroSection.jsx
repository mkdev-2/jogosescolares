import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { configuracoesService } from "../../services/configuracoesService";
import { getStorageUrl } from "../../services/storageService";

const FALLBACK_SLIDES = ["/BANNER.jpeg"];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }
  },
  exit: (direction) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }
  })
};

export default function HeroSection() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [[page, direction], setPage] = useState([0, 0]);

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

  const paginate = useCallback((newDirection) => {
    setPage(([prevPage]) => [
      (prevPage + newDirection + slides.length) % slides.length,
      newDirection
    ]);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(() => {
       if (slides.length > 1) paginate(1);
    }, 6000);
    return () => clearInterval(timer);
  }, [paginate, slides.length]);

  if (!slides || slides.length === 0) return null;

  const current = page;

  return (
    <div className="relative w-full overflow-hidden group aspect-[1900/450]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
           key={page}
           custom={direction}
           variants={slideVariants}
           initial="enter"
           animate="center"
           exit="exit"
           className="absolute inset-0"
        >
          <img
            src={slides[current]}
            alt=""
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Arrows (only show if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => paginate(-1)}
            className="hero-arrow absolute left-3 md:left-6 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="hero-arrow absolute right-3 md:right-6 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
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
              onClick={() => {
                const newDirection = i > page ? 1 : -1;
                setPage([i, newDirection]);
              }}
              className={`hero-indicator ${i === current ? "hero-indicator-active" : "hero-indicator-inactive"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
