import { ArrowRight, Trophy, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdesaoEscolasAberta } from "../../hooks/useAdesaoEscolasAberta";

const HERO_BANNER = "/BANNER.jpeg";

const heroInscricaoClass =
  "inline-flex items-center gap-2.5 rounded-full border-2 border-white/25 bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_12px_40px_-8px_rgba(15,118,110,0.65),0_0_0_1px_rgba(255,255,255,0.15)] transition duration-200 hover:scale-[1.03] hover:border-white/40 hover:shadow-[0_20px_50px_-10px_rgba(15,118,110,0.75)] hover:brightness-110 active:scale-[0.98] md:gap-3 md:px-10 md:py-4 md:text-base md:tracking-wider";

const heroBannerCtaBase =
  "inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition duration-200 active:scale-[0.98] sm:px-7 sm:py-3 sm:text-sm";

function HeroCtaInscricao({ to, children }) {
  return (
    <Link to={to} className={heroInscricaoClass}>
      {children}
      <ArrowRight className="shrink-0" size={22} strokeWidth={2.5} />
    </Link>
  );
}

function HeroCtaResultados({ to, children }) {
  return (
    <Link
      to={to}
      className={`${heroBannerCtaBase} bg-emerald-500 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.45)] hover:bg-emerald-400`}
    >
      {children}
      <ArrowRight className="shrink-0" size={18} strokeWidth={2.5} />
    </Link>
  );
}

function HeroCtaAgenda({ to, children }) {
  return (
    <Link
      to={to}
      className={`${heroBannerCtaBase} border border-white bg-transparent hover:bg-white/10`}
    >
      {children}
      <CalendarDays className="shrink-0" size={18} strokeWidth={2} />
    </Link>
  );
}

function HeroAtalhoCard({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex w-full items-center gap-4 rounded-2xl border border-teal-500/40 bg-teal-800/70 px-5 py-4 shadow-xl backdrop-blur-md transition duration-200 hover:scale-[1.02] hover:border-teal-400/55 hover:bg-teal-700/80 hover:shadow-2xl active:scale-[0.99] no-underline sm:w-64"
    >
      <div className="shrink-0 rounded-xl border border-teal-400/40 bg-teal-400/25 p-2.5">
        <Icon size={20} className="text-teal-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold leading-tight text-white">{title}</p>
        <p className="m-0 mt-0.5 text-xs leading-snug text-teal-200/75">{description}</p>
      </div>
      <ArrowRight
        size={15}
        className="shrink-0 text-teal-300/50 transition duration-200 group-hover:translate-x-0.5 group-hover:text-teal-200"
      />
    </Link>
  );
}

export default function HeroSection() {
  const { adesaoAberta } = useAdesaoEscolasAberta();

  return (
    <section className="relative min-h-0 flex-1 w-full overflow-hidden bg-slate-100">
      <div className="relative mx-auto h-full w-full max-w-[1920px]">
        <img
          src={HERO_BANNER}
          alt="Banner principal dos Jogos Escolares"
          className="block h-full w-full object-cover object-center"
          loading="eager"
          referrerPolicy="no-referrer"
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
                {adesaoAberta ? (
                  <>
                    Participe dos{" "}
                    <span className="text-emerald-300">Jogos Escolares</span>
                  </>
                ) : (
                  <>
                    Acompanhe os{" "}
                    <span className="text-emerald-300">Jogos Escolares</span>
                  </>
                )}
              </h1>

              <p
                className="mb-6 max-w-xl text-sm leading-relaxed text-white/90 animate-fade-in-up sm:mb-8 sm:text-base md:mb-10 md:text-lg"
                style={{ animationDelay: "0.25s" }}
              >
                {adesaoAberta
                  ? "Inscreva sua escola e leve seus alunos para viver a emoção dos Jogos Escolares de Paço do Lumiar."
                  : "Confira placares, classificações e a agenda oficial dos Jogos Escolares de Paço do Lumiar."}
              </p>

              <div
                className="flex flex-wrap items-center justify-start gap-2.5 animate-fade-in-up sm:gap-3"
                style={{ animationDelay: "0.35s" }}
              >
                {adesaoAberta ? (
                  <HeroCtaInscricao to="/cadastro">Fazer Inscrição da Escola</HeroCtaInscricao>
                ) : (
                  <>
                    <HeroCtaResultados to="/resultados">Ver Resultados</HeroCtaResultados>
                    <HeroCtaAgenda to="/agenda">Agenda Oficial</HeroCtaAgenda>
                  </>
                )}
              </div>

              {adesaoAberta ? (
                <div
                  className="mt-5 flex gap-2 animate-fade-in-up lg:hidden"
                  style={{ animationDelay: "0.45s" }}
                >
                  <Link
                    to="/resultados"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition duration-200 hover:bg-white/25 active:scale-95"
                  >
                    <Trophy size={13} />
                    Resultados
                  </Link>
                  <Link
                    to="/agenda"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition duration-200 hover:bg-white/25 active:scale-95"
                  >
                    <CalendarDays size={13} />
                    Agenda
                  </Link>
                </div>
              ) : null}

          </div>
        </div>

        {adesaoAberta ? (
          <div
            className="absolute top-6 right-6 hidden animate-fade-in-up flex-col gap-3 lg:flex"
            style={{ animationDelay: "0.45s" }}
          >
            <HeroAtalhoCard
              to="/resultados"
              icon={Trophy}
              title="Resultados"
              description="Placares e classificações"
            />
            <HeroAtalhoCard
              to="/agenda"
              icon={CalendarDays}
              title="Agenda"
              description="Horários e locais das partidas"
            />
          </div>
        ) : null}

      </div>
    </section>
  );
}
