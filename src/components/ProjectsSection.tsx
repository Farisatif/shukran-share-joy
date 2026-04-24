import { Reveal } from "./Reveal";
import { ArrowUpRight, GitFork, Star, Github, Sparkles, Code2 } from "lucide-react";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { GlowDots } from "./GlowDots";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const LANG_ACCENT: Record<string, string> = {
  JavaScript: "48 96% 58%",
  TypeScript: "217 91% 60%",
  Java: "16 85% 55%",
  Python: "210 75% 55%",
  "C++": "275 70% 60%",
  C: "220 15% 55%",
  "C#": "270 60% 55%",
  Default: "200 80% 55%",
};

function langColor(lang?: string) {
  return LANG_ACCENT[lang ?? "Default"] ?? LANG_ACCENT.Default;
}

/* -------------------------------------------------------------------------- */
/*  Section heading                                                            */
/* -------------------------------------------------------------------------- */

function SectionHeader({ count }: { count: number }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Reveal>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
            <span className="inline-flex h-px w-10 bg-foreground/40" />
            <span>/ 04 — {t("Selected work", "أعمال مختارة")}</span>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display text-5xl sm:text-7xl lg:text-[5.5rem] tracking-[-0.04em] leading-[0.92]">
            {t("Projects ", "مشاريع ")}
            <span className="italic text-primary">
              {t("in the wild.", "على أرض الواقع.")}
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t(
              "A curated set of products I've designed, engineered, and shipped — open source, in production, and built for real users.",
              "مجموعة مختارة من المنتجات التي صمّمتها وطوّرتها وأطلقتها — مفتوحة المصدر، في الإنتاج، ومبنيّة لمستخدمين حقيقيين.",
            )}
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.18}>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="font-display text-4xl tracking-tight tabular-nums">
              {String(count).padStart(2, "0")}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {t("Shipped", "مكتمل")}
            </span>
          </div>
          <span className="h-12 w-px bg-border" />
          <a
            href="https://github.com/Farisatif"
            target="_blank"
            rel="noreferrer"
            data-cursor="view"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-5 py-3 text-sm font-medium hover:border-foreground/40 transition-all hover:-translate-y-0.5"
          >
            <Github className="h-4 w-4" />
            {t("All on GitHub", "كل المشاريع على GitHub")}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </Reveal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Project card                                                               */
/* -------------------------------------------------------------------------- */

type ProjectShape = {
  name: string;
  stars: number;
  forks: number;
  language: string;
  tags_en: string[];
  tags_ar: string[];
  url: string;
  en: { description: string };
  ar: { description: string };
};

function ProjectCard({
  p,
  index,
  featured,
}: {
  p: ProjectShape;
  index: number;
  featured: boolean;
}) {
  const { lang, t } = useLang();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const tags = lang === "ar" ? p.tags_ar : p.tags_en;
  const desc = lang === "ar" ? p.ar.description : p.en.description;
  const accent = langColor(p.language);
  const number = String(index + 1).padStart(2, "0");

  return (
    <Reveal delay={index * 0.06}>
      <motion.a
        href={`https://${p.url}`}
        target="_blank"
        rel="noreferrer"
        data-cursor="view"
        data-cursor-label={t("Open", "افتح")}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        whileHover={reduce ? undefined : { y: -6 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`group relative block overflow-hidden rounded-[2rem] border border-border bg-card/70 backdrop-blur-sm h-full ${
          featured ? "lg:col-span-2" : ""
        }`}
        style={{
          boxShadow:
            "0 1px 0 0 hsl(var(--foreground) / 0.04), 0 30px 60px -30px hsl(var(--foreground) / 0.12)",
        }}
      >
        {/* hover gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(120% 80% at 100% 0%, hsl(${accent} / 0.18), transparent 60%), radial-gradient(80% 60% at 0% 100%, hsl(${accent} / 0.10), transparent 70%)`,
          }}
        />

        {/* grid overlay removed for a cleaner, formal look */}

        {/* corner index + open chip */}
        <div className="relative flex items-start justify-between p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              {number}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/80 backdrop-blur"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `hsl(${accent})` }}
              />
              {p.language}
            </span>
          </div>

          <div
            className="relative h-11 w-11 rounded-full bg-secondary flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:bg-foreground group-hover:text-background"
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{
                background: `radial-gradient(circle, hsl(${accent} / 0.5), transparent 70%)`,
                filter: "blur(8px)",
              }}
            />
          </div>
        </div>

        {/* body */}
        <div className="relative px-7 sm:px-9 pb-7 sm:pb-9">
          <h3
            className={`font-display tracking-tight ${
              featured
                ? "text-4xl sm:text-5xl lg:text-6xl"
                : "text-3xl sm:text-4xl"
            }`}
          >
            <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {p.name}
            </span>
          </h3>

          <p
            className={`mt-4 text-muted-foreground leading-relaxed ${
              featured ? "text-base sm:text-lg max-w-2xl" : "text-sm sm:text-base"
            }`}
          >
            {desc}
          </p>

          {/* tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tg) => (
              <span
                key={tg}
                className="text-[11px] font-medium uppercase tracking-[0.12em] px-3 py-1.5 rounded-full border border-border bg-background/40 text-foreground/80 backdrop-blur transition-colors group-hover:border-foreground/30"
              >
                {tg}
              </span>
            ))}
          </div>
        </div>

        {/* footer stats */}
        <div className="relative mt-auto border-t border-border/70 bg-background/30 backdrop-blur px-7 sm:px-9 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs sm:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="tabular-nums">{p.stars}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="tabular-nums">{p.forks}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>{p.language}</span>
            </span>
          </div>

          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-foreground/70 hidden sm:inline-flex items-center gap-2">
            <motion.span
              animate={hover && !reduce ? { x: [0, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.8, repeat: hover ? Infinity : 0 }}
            >
              {t("Visit repo", "زر المستودع")}
            </motion.span>
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>

        {/* glow ring on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 0 1px hsl(${accent} / 0.35)`,
          }}
        />
      </motion.a>
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export function ProjectsSection() {
  const { data } = useSiteData();
  const { t } = useLang();

  const projects = data.projects as ProjectShape[];

  // language distribution for footer strip
  const stack = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => map.set(p.language, (map.get(p.language) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  return (
    <section
      id="projects"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Interactive glowing dots backdrop — same as GitHub section */}
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-80 dark:opacity-70">
        <GlowDots
          asBackground
          height="100%"
          dotColor="currentColor"
          glowColor="oklch(0.62 0.24 268)"
          spacing={32}
        />
      </div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <SectionHeader count={projects.length} />

        {/* projects grid — first card spans 2 cols on lg as featured */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
          {projects.map((p, i) => (
            <ProjectCard key={p.name} p={p} index={i} featured={i === 0} />
          ))}
        </div>

        {/* footer stack strip */}
        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-2xl border border-border bg-card/60 backdrop-blur px-6 sm:px-8 py-5">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-foreground/70" />
              <span className="uppercase tracking-[0.22em] text-xs text-muted-foreground">
                {t("Stack across projects", "التقنيات عبر المشاريع")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {stack.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `hsl(${langColor(name)})` }}
                  />
                  {name}
                  <span className="text-muted-foreground tabular-nums">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
