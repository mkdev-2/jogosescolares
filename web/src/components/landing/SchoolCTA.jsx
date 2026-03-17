import { motion } from "framer-motion";
import { School, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SchoolCTA() {
  const navigate = useNavigate();

  return (
    <section className="container-portal pt-0 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="relative overflow-hidden rounded-[32px] bg-primary p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-emerald-900/10"
      >
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center">
             <School className="w-7 h-7 md:w-9 md:h-9 text-white" />
          </div>
        </div>

        <div className="relative flex-1 text-center md:text-left">
          <h2 className="text-xl md:text-3xl font-bold uppercase tracking-tight font-display text-white mb-2 leading-tight">
            Sua Escola Pode Participar!
          </h2>
          <p className="text-white/85 font-sans text-sm md:text-base max-w-xl">
            Cadastre sua escola agora e garanta a participação nos Jogos Escolares Municipais 2026.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#fcd34d" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/cadastro')}
          className="relative shrink-0 flex items-center gap-3 px-10 py-4 rounded-2xl bg-[#fbbf24] text-[#042f2e] font-display font-black uppercase tracking-widest text-sm shadow-lg transition-all"
        >
          CADASTRAR
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </section>
  );
}
