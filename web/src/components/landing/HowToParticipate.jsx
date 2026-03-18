import { motion } from "framer-motion";
import { UserPlus, LayoutGrid, CheckCircle2, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Cadastre sua escola",
    description: "Preencha os dados básicos da instituição e do responsável."
  },
  {
    icon: LayoutGrid,
    title: "Escolha as modalidades",
    description: "Defina em quais esportes sua escola vai competir"
  },
  {
    icon: CheckCircle2,
    title: "Aguarde confirmação",
    description: "Pronto! Agora é só aguardar a validação"
  }
];

export default function HowToParticipate() {
  return (
    <section className="container-portal py-3 md:py-6">
      <div className="text-center mb-4 px-4">
        <h2 className="text-sm sm:text-base font-black text-primary uppercase tracking-[0.2em] mb-2 px-2">COMO PARTICIPAR DOS JOGOS ESCOLARES?</h2>
      </div>

      <div className="relative max-w-5xl mx-auto mt-3">
        {/* Connection line for desktop */}
        <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-1 bg-emerald-200/50 z-0" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 relative px-4 md:px-0">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative z-10 flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 group bg-white p-2.5 md:p-3 rounded-[14px] md:rounded-[20px] shadow-lg md:shadow-2xl shadow-emerald-900/10 border border-emerald-50/50 hover:shadow-[0_20px_40px_-10px_rgba(4,47,46,0.25)] transition-all duration-500"
            >
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-slate-50 border border-emerald-100 flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative shrink-0">
                <step.icon className="w-5 h-5 md:w-6 md:h-6 text-emerald-800" />
                <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-yellow-400 border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-black text-black">
                  {idx + 1}
                </div>
              </div>

              <div className="flex flex-col">
                <h4 className="text-[12px] md:text-[13px] font-black text-[#014737] uppercase tracking-tight mb-0.5 md:mb-1">
                  {step.title}
                </h4>
                <p className="text-[12px] md:text-[13px] text-slate-500 font-medium leading-snug">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
