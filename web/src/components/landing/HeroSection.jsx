import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HERO_BANNER = "/BANNER.jpeg";

export default function HeroSection() {
  return (
    <section className="relative min-h-0 flex-1 w-full overflow-hidden bg-slate-100">
      <div className="relative mx-auto h-full w-full max-w-[1920px]">
        <img
          src={HERO_BANNER}
          alt="Banner principal dos Jogos Escolares"
          className="block h-full w-full object-cover object-center"
          loading="eager"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10"
          aria-hidden
        />
      </div>

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container-portal w-full px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12">
          <div className="max-w-2xl text-left">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-primary-foreground backdrop-blur-sm animate-fade-in-up sm:mb-5 sm:px-4 sm:py-2 sm:text-xs md:mb-6 md:px-5"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 md:h-2.5 md:w-2.5" />
              JELS — Jogos Escolares Luminenses
            </div>

            <h1
              className="mb-4 font-display text-3xl font-black leading-tight text-white animate-fade-in-up sm:mb-5 sm:text-4xl md:mb-6 md:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.15s" }}
            >
              Participe dos{" "}
              <span className="text-emerald-300">Jogos Escolares</span>
            </h1>

            <p
              className="mb-6 max-w-xl text-sm leading-relaxed text-white/90 animate-fade-in-up sm:mb-8 sm:text-base md:mb-10 md:text-lg"
              style={{ animationDelay: "0.25s" }}
            >
              Inscreva sua escola e leve seus alunos para viver a emoção dos Jogos Escolares de Paço do Lumiar.
            </p>

            <div
              className="flex flex-wrap justify-start gap-3 animate-fade-in-up"
              style={{ animationDelay: "0.35s" }}
            >
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-2.5 rounded-full border-2 border-white/25 bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[0_12px_40px_-8px_rgba(15,118,110,0.65),0_0_0_1px_rgba(255,255,255,0.15)] transition duration-200 hover:scale-[1.03] hover:border-white/40 hover:shadow-[0_20px_50px_-10px_rgba(15,118,110,0.75),0_0_0_1px_rgba(255,255,255,0.25)] hover:brightness-110 active:scale-[0.98] md:gap-3 md:px-10 md:py-4 md:text-base md:tracking-wider"
              >
                Fazer Inscrição da Escola
                <ArrowRight className="shrink-0" size={22} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
