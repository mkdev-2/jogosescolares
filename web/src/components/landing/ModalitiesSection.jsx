import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Dribbble, 
  Trophy, 
  Swords, 
  Waves, 
  Bike, 
  Flame, 
  Target, 
  Mountain, 
  Wind, 
  Volleyball, 
  Dumbbell, 
  Footprints, 
  Compass, 
  Anchor, 
  Zap, 
  Star, 
  Shield, 
  Flag, 
  Snowflake, 
  Heart 
} from "lucide-react";
import { esportesService } from "../../services/esportesService";

// Mapeamento de ícones do banco (react-icons) para Lucide
const iconMapping = {
  "PiSoccerBall": Dribbble,
  "GiVolleyballBall": Volleyball,
  "MdSportsKabaddi": Shield,
  "GiKimono": Swords,
  "MdOutlineSurfing": Wind,
  "TbSkateboarding": Zap,
  "FaChess": Trophy,
  "GrSwim": Waves,
  "MdSportsMma": Heart,
  "GiContortionist": Star,
  "MdDirectionsBike": Bike,
  "FaTableTennis": Target,
  "Zap": Zap // Fallback padrão
};

export default function ModalitiesSection() {
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadModalities() {
      try {
        const data = await esportesService.list();
        // Filtra apenas as ativas e mapeia os ícones
        const activeModalities = data
          .filter(mod => mod.ativa)
          .map(mod => ({
            ...mod,
            IconComponent: iconMapping[mod.icone] || Zap
          }));
        setModalities(activeModalities);
      } catch (error) {
        console.error("Erro ao carregar modalidades:", error);
      } finally {
        setLoading(false);
      }
    }
    loadModalities();
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }
  };

  if (loading || modalities.length === 0) return null;

  return (
    <section className="container-portal pt-4 md:pt-6 pb-2">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="section-title !text-slate-800 font-black">MODALIDADES</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll(-1)} 
            className="hero-arrow h-10 w-10 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm" 
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button 
            onClick={() => scroll(1)} 
            className="hero-arrow h-10 w-10 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm" 
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-6 px-4"
      >
        {modalities.map((mod, i) => (
          <motion.div
            key={mod.id || i}
            whileHover={{ y: -6, scale: 1.02 }}
            className="snap-start shrink-0 flex flex-col items-center justify-center gap-3 p-5 min-w-[140px] cursor-pointer group bg-white border border-slate-100 shadow-sm rounded-[24px]"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center transition-all duration-300 group-hover:bg-[#0f766e] group-hover:shadow-lg group-hover:shadow-emerald-900/20">
              <mod.IconComponent className="w-8 h-8 text-[#0f766e] transition-colors duration-300 group-hover:text-white" />
            </div>
            <span className="text-[12px] font-bold uppercase tracking-wider font-display text-slate-700 text-center leading-tight">
              {mod.nome}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
