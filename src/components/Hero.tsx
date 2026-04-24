import { motion } from "framer-motion";
import { ArrowDown, Github, Mail, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MagneticButton } from "./MagneticButton";
import faresImg from "@/assets/fares.jpg";
import { DotPattern } from "./Patterns";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export function Hero() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const p = data.personal;
  const loc = lang === "ar" ? p.ar : p.en;
  const heroWords =
    lang === "ar"
      ? data.hero?.words_ar?.length
        ? data.hero.words_ar
        : ["مهندس.", "صانع.", "ثنائي اللغة."]
      : data.hero?.words_en?.length
        ? data.hero.words_en
        : ["Engineer.", "Builder.", "Bilingual."];

  return (
    <section id="top" className="relative min-h-screen pt-32 pb-24 overflow-hidden">
      {/* Toned-down dot pattern for subtle texture */}
      <DotPattern className="absolute inset-0 -z-10 opacity-40">
        <div className="h-full w-full" />
      </DotPattern>
      {/* Soft mesh atmosphere — much dimmer so content stays primary */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mesh-bg opacity-30 dark:opacity-40" />
      {/* Single calm accent halo, off to one side */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-primary/[0.07] dark:bg-primary/15 blur-3xl"
      />
      {/* Faint grid for depth, masked to fade at edges */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-25 dark:opacity-30" />

      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2.5 mb-10 px-3.5 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur-md soft-shadow"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground tracking-wide font-medium">
            {t("Available for new opportunities", "متاح لفرص جديدة")}
          </span>
        </motion.div>

        <h1 className="font-display text-[clamp(2.8rem,9vw,8.5rem)] leading-[0.92] tracking-[-0.045em]">
          {heroWords.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          className={`block ${i === 1 ? "italic font-normal text-primary" : ""}`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <div className="mt-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="max-w-lg"
          >
            <p className="text-base sm:text-lg text-foreground/75 leading-relaxed">
              {t("Hi — I'm ", "مرحباً — أنا ")}
              <span className="text-foreground font-semibold">{p.name}</span>
              {t(", ", "، ")}
              {loc.bio}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" hash="contact" className="inline-block">
                <MagneticButton>
                  <Mail className="h-4 w-4" />
                  {t("Get in touch", "تواصل معي")}
                </MagneticButton>
              </Link>
              <MagneticButton href={`https://${p.github}`} variant="ghost">
                <Github className="h-4 w-4" />
                {t("GitHub", "جيت‌هاب")}
              </MagneticButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="relative"
          >
            {/* Subtle halo ring — dimmer in light, slightly stronger in dark */}
            <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/[0.08] dark:bg-primary/20 blur-2xl" />
            <div
              data-cursor="view"
              data-cursor-label={p.name}
              className="relative h-36 w-36 sm:h-44 sm:w-44 rounded-full overflow-hidden ring-2 ring-border elevated-shadow animate-float-slow"
            >
              <img src={faresImg} alt={p.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-foreground text-background text-xs px-3 py-1.5 rounded-full font-medium tracking-wide soft-shadow">
              {loc.location}
            </div>
          </motion.div>
        </div>

        {/* Bottom strip — credibility row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-20 pt-8 border-t border-border/40 flex items-center justify-between gap-6 flex-wrap"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            {t("Scroll to explore", "مرر للاستكشاف")}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="tracking-wide">
              {t("Engineering · Systems · Product", "هندسة · أنظمة · منتج")}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
