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
    <section className="container-portal py-2 md:py-4">
      <div className="text-center mb-6">
        <h2 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-2">COMO PARTICIPAR DOS JOGOS ESCOLARES?</h2>
      </div>

      <div className="relative max-w-5xl mx-auto mt-6">
        {/* Connection line for desktop */}
        <div className="hidden md:block absolute top-[32px] left-[15%] right-[15%] h-1 bg-emerald-200/50 z-0" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center group bg-white p-4 rounded-[24px] shadow-2xl shadow-emerald-900/15 border border-emerald-50/50 hover:shadow-[0_30px_60px_-15px_rgba(4,47,46,0.3)] hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-full bg-white border border-emerald-100 flex items-center justify-center mb-2 transition-all duration-500 group-hover:scale-110 relative ring-4 ring-emerald-500/5 shadow-md shadow-emerald-500/10">
                <step.icon className="w-7 h-7 text-emerald-800 drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]" />
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black text-black">
                  {idx + 1}
                </div>
              </div>

              <h4 className="text-sm font-black text-[#014737] uppercase tracking-tight mb-2">
                {step.title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-2">
                {step.description}
              </p>

              {idx < steps.length - 1 && (
                <div className="md:hidden mt-6">
                  <div className="w-px h-8 bg-emerald-100 mx-auto" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
