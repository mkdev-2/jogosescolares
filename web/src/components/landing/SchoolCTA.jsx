import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function SchoolCTA() {
  const navigate = useNavigate();

  return (
    <section className="container-portal pt-0 pb-4">
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.05, backgroundColor: "#fbbf24", boxShadow: "0 20px 50px -12px rgba(251, 191, 36, 0.5)" }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: ["0 10px 40px -10px rgba(251,191,36,0.4)", "0 10px 40px 0px rgba(251,191,36,0.7)", "0 10px 40px -10px rgba(251,191,36,0.4)"]
        }}
        transition={{
          boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        onClick={() => navigate('/cadastro')}
        className="relative w-full md:w-auto flex items-center justify-center px-6 md:px-10 py-4 md:py-6 rounded-xl md:rounded-2xl bg-[#facc15] text-black font-display font-black uppercase tracking-[0.12em] md:tracking-[0.15em] text-lg md:text-xl shadow-[0_10px_40px_-10px_rgba(251,191,36,0.6)] border-b-[3px] md:border-b-4 border-yellow-600 active:border-b-0 transition-all mx-auto"
      >
        Fazer Inscrição da Escola
      </motion.button>
    </section>
  );
}
