import { motion } from "framer-motion";
import { School, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SchoolCTA() {
  const navigate = useNavigate();

  return (
    <section className="container-portal pt-0 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-600 to-[#064e3b] p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-2xl shadow-emerald-900/40 border border-emerald-400/20"
      >
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
            <School className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>

        <div className="relative flex-1 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight font-display text-white mb-1.5 md:mb-2 leading-tight">
            INSCRIÇÕES ABERTAS PARA O JELS
          </h2>
          <p className="text-white/85 font-sans text-[11px] sm:text-sm max-w-xl mx-auto md:mx-0">
            Cadastre sua escola agora e garanta a participação nos Jogos Escolares de Paço do Lumiar.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#fbbf24", boxShadow: "0 20px 50px -12px rgba(251, 191, 36, 0.5)" }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: ["0 10px 40px -10px rgba(251,191,36,0.4)", "0 10px 40px 0px rgba(251,191,36,0.7)", "0 10px 40px -10px rgba(251,191,36,0.4)"]
          }}
          transition={{
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          onClick={() => navigate('/cadastro')}
          className="relative w-full md:w-auto shrink-0 flex items-center justify-center gap-2 md:gap-3 px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#facc15] text-black font-display font-black uppercase tracking-[0.12em] md:tracking-[0.15em] text-sm md:text-base shadow-[0_10px_40px_-10px_rgba(251,191,36,0.6)] border-b-[3px] md:border-b-4 border-yellow-600 active:border-b-0 transition-all"
        >
          CADASTRAR
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </motion.button>
      </motion.div>
    </section>
  );
}
