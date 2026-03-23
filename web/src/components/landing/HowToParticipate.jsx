import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, LayoutGrid, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Cadastre sua escola",
    description: "Informe os dados da escola"
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
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="container-portal py-3 md:py-6">
      <div className="text-center mb-8 px-4">
        <h2 className="text-base sm:text-xl font-black text-primary uppercase tracking-[0.2em] mb-2 px-2">PARTICIPE DOS JOGOS ESCOLARES</h2>
      </div>

      <div className="relative max-w-5xl mx-auto mt-6 px-4 md:px-0">
        {/* Desktop: linha e ícones centralizados (linha com highlight até o passo atual) */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center w-full">
            {steps.map((step, idx) => (
              <Fragment key={idx}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12 }}
                  onMouseEnter={() => setActiveStep(idx)}
                  onFocus={() => setActiveStep(idx)}
                  tabIndex={0}
                  className="flex-shrink-0 group relative flex items-center justify-center"
                >
                  <div className="relative w-[68px] h-[68px] rounded-full bg-slate-50 border border-emerald-100 flex items-center justify-center shadow-[0_18px_40px_-18px_rgba(4,47,46,0.45)] z-10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_26px_70px_-28px_rgba(4,47,46,0.65)]">
                    <step.icon className="w-8 h-8 text-emerald-800 transition-all duration-300 group-hover:scale-110" />

                    <div className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-yellow-400 border-2 border-white shadow-[0_14px_28px_-18px_rgba(0,0,0,0.45)] flex items-center justify-center text-[16px] font-black text-black transition-all duration-300 group-hover:scale-105">
                      {idx + 1}
                    </div>
                  </div>
                </motion.div>

                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[4px] mx-4 relative rounded-full">
                    {/* Linha base */}
                    <div className="absolute inset-0 rounded-full bg-emerald-200/80 shadow-[0_0_18px_rgba(16,185,129,0.25)]" />
                    {/* Highlight até o passo atual */}
                    <div
                      className="absolute inset-0 rounded-full bg-emerald-500 shadow-[0_0_26px_rgba(16,185,129,0.6)] transition-transform duration-300"
                      style={{
                        transformOrigin: "left",
                        transform: activeStep >= idx + 1 ? "scaleX(1)" : "scaleX(0)",
                      }}
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Textos (alinhados aos ícones) */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.12 + 0.05 }}
                onMouseEnter={() => setActiveStep(idx)}
                onFocus={() => setActiveStep(idx)}
                tabIndex={0}
                className="text-center cursor-default"
              >
                <h4 className="text-[15px] font-black text-[#014737] uppercase tracking-tight mb-0.5">{step.title}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-snug">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: mantém cards em coluna (sem linha/escala de conectores) */}
        <div className="md:hidden flex flex-col gap-4">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              onMouseEnter={() => setActiveStep(idx)}
              className="bg-white p-4 rounded-[16px] border border-emerald-50/50 shadow-lg shadow-emerald-900/10"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-[60px] h-[60px] rounded-full bg-slate-50 border border-emerald-100 flex items-center justify-center shadow-[0_18px_40px_-18px_rgba(4,47,46,0.45)] shrink-0">
                  <step.icon className="w-7 h-7 text-emerald-800" />
                  <div className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-yellow-400 border-2 border-white shadow-[0_14px_28px_-18px_rgba(0,0,0,0.45)] flex items-center justify-center text-[15px] font-black text-black">
                    {idx + 1}
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-black text-[#014737] uppercase tracking-tight mb-1">{step.title}</h4>
                  <p className="text-[13px] text-slate-500 font-medium leading-snug">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
