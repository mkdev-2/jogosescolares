import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, UserPlus, LayoutGrid, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Cadastre sua escola" },
  { icon: LayoutGrid, title: "Escolha as modalidades" },
  { icon: CheckCircle2, title: "Aguarde confirmação" },
];

function StepConnector() {
  return (
    <>
      <div className="flex justify-center py-1 md:hidden" aria-hidden>
        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
      </div>
      <div
        className="hidden min-h-[3.5rem] min-w-0 flex-1 items-center gap-1.5 px-1 md:flex"
        aria-hidden
      >
        <div className="h-1.5 min-w-[8px] flex-1 rounded-full bg-emerald-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]" />
        <ArrowRight className="h-5 w-5 shrink-0 text-emerald-700" strokeWidth={2.5} />
        <div className="h-1.5 min-w-[8px] flex-1 rounded-full bg-emerald-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]" />
      </div>
    </>
  );
}

export default function HowToParticipate() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="container-portal shrink-0 py-2 md:py-3">
      <div className="relative mx-auto flex max-w-5xl flex-col px-4 md:flex-row md:items-stretch md:px-0">
        {steps.map((step, idx) => (
          <Fragment key={idx}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              onMouseEnter={() => setActiveStep(idx)}
              className={`min-w-0 flex-1 rounded-xl border bg-white p-3 shadow-sm transition-all sm:p-4 ${
                activeStep === idx
                  ? "border-emerald-400 shadow-emerald-900/20 ring-1 ring-emerald-200/80"
                  : "border-emerald-100/80 shadow-emerald-900/10"
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-emerald-100 bg-slate-50 sm:h-14 sm:w-14">
                  <step.icon className="h-6 w-6 text-emerald-800 sm:h-7 sm:w-7" />
                  <div className="absolute -right-0.5 -top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-yellow-400 text-xs font-black text-black shadow-sm sm:h-8 sm:w-8 sm:text-sm">
                    {idx + 1}
                  </div>
                </div>
                <h4 className="text-[11px] font-black uppercase leading-tight tracking-tight text-[#014737] sm:text-xs md:text-sm">
                  {step.title}
                </h4>
              </div>
            </motion.div>

            {idx < steps.length - 1 && <StepConnector />}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
