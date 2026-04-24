import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Layers,
  Search,
  Gauge,
  Wand2,
  ArrowDownRight,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { PhysicsPills, type PhysicsPillsHandle } from "./PhysicsPills";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

type Skill = {
  id?: string;
  name: string;
  level?: number;
  category_en?: string;
  category_ar?: string;
};

export function SkillsSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const skills = data.skills as Skill[];

  const physicsRef = useRef<PhysicsPillsHandle>(null);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Build category list with counts
  const categories = useMemo(() => {
    const map = new Map<string, { en: string; ar: string; count: number }>();
    skills.forEach((s) => {
      const en = s.category_en || "Other";
      const ar = s.category_ar || "أخرى";
      const existing = map.get(en);
      if (existing) existing.count += 1;
      else map.set(en, { en, ar, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [skills]);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchCat = activeCat === "all" || (s.category_en || "Other") === activeCat;
      const matchQ =
        !query.trim() ||
        s.name.toLowerCase().includes(query.trim().toLowerCase());
      return matchCat && matchQ;
    });
  }, [skills, activeCat, query]);

  const pills = filtered.map((s, i) => ({
    label: s.name,
    variant: i % 12,
    level: s.level,
  }));

  const avgLevel = useMemo(() => {
    const levels = skills.map((s) => s.level || 0).filter(Boolean);
    if (!levels.length) return 0;
    return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
  }, [skills]);

  const topSkill = useMemo(() => {
    return [...skills].sort((a, b) => (b.level || 0) - (a.level || 0))[0];
  }, [skills]);

  const [height, setHeight] = useState(900);
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const fluid = Math.round(
        Math.max(820, Math.min(1320, h * 1.05, w * 0.75 + 480)),
      );
      setHeight(fluid);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <section
      id="skills"
      className="relative pt-0 pb-0 mb-0"
      style={{ overflow: "visible" }}
    >
      {/* Soft accent backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-[oklch(0.85_0.12_250)] opacity-30 blur-3xl" />
        <div className="absolute -top-20 right-10 h-[300px] w-[300px] rounded-full bg-[oklch(0.8_0.13_270)] opacity-25 blur-3xl" />
      </div>

      <Reveal delay={0.05}>
        <div className="relative w-full mt-0">
          {/* Physics layer behind everything */}
          <div className="relative z-0">
            <PhysicsPills ref={physicsRef} pills={pills} height={height} key={activeCat + query} />
          </div>

          {/* Editorial header overlay */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 sm:px-6 pt-8 sm:pt-10 md:pt-14">
            <div className="pointer-events-auto w-full max-w-5xl">
              {/* Eyebrow + counter chip */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  / 02 — {t("Toolkit", "الأدوات")}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 backdrop-blur px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="tabular-nums text-foreground font-medium">
                    {filtered.length}
                  </span>
                  /{" "}
                  <span className="tabular-nums">{skills.length}</span>{" "}
                  {t("tech", "تقنية")}
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-center font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.045em] leading-[0.92]">
                {t("Drag the things ", "اسحب الأشياء ")}
                <span className="italic text-primary relative">
                  {t("I build with.", "التي أبني بها.")}
                  <span className="absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
                </span>
              </h2>

              <p className="mt-3 text-center text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                {t(
                  `${skills.length} technologies, frameworks and platforms — toss them around. Real physics, no walls.`,
                  `${skills.length} تقنية وإطار ومنصة — حرّكها كما تريد. فيزياء حقيقية، بلا حواجز.`,
                )}
              </p>

              {/* Toolbar — stats + search + replay */}
              <div className="mt-6 sm:mt-7 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                {/* Stats strip */}
                <div className="flex flex-wrap items-stretch gap-2">
                  <MiniStat
                    icon={<Layers className="h-3.5 w-3.5" />}
                    label={t("Categories", "تصنيفات")}
                    value={categories.length.toString()}
                  />
                  <MiniStat
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    label={t("Avg level", "متوسط المستوى")}
                    value={`${avgLevel}%`}
                  />
                  {topSkill && (
                    <MiniStat
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      label={t("Top skill", "الأبرز")}
                      value={`${topSkill.name} · ${topSkill.level ?? 0}%`}
                      accent
                    />
                  )}
                </div>

                {/* Search + replay */}
                <div className="flex items-center gap-2 justify-end">
                  <div
                    className="group relative flex items-center"
                    style={{ minWidth: 180 }}
                  >
                    <Search className="pointer-events-none absolute left-3 rtl:left-auto rtl:right-3 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("Search…", "ابحث…")}
                      className="h-9 w-full rounded-full border border-border/60 bg-background/80 backdrop-blur pl-9 pr-3 rtl:pl-3 rtl:pr-9 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => physicsRef.current?.replay()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 text-xs font-medium backdrop-blur transition hover:border-primary/60 hover:text-primary"
                    title={t("Replay physics", "إعادة العرض")}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {t("Replay", "إعادة")}
                  </button>
                </div>
              </div>

              {/* Category filter pills */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                <CategoryChip
                  label={t("All", "الكل")}
                  count={skills.length}
                  active={activeCat === "all"}
                  onClick={() => setActiveCat("all")}
                />
                {categories.map((c) => (
                  <CategoryChip
                    key={c.en}
                    label={lang === "ar" ? c.ar : c.en}
                    count={c.count}
                    active={activeCat === c.en}
                    onClick={() => setActiveCat(c.en)}
                  />
                ))}
              </div>

              {/* Hint */}
              <div className="mt-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                  <ArrowDownRight className="h-3 w-3" />
                  {t(
                    "Drag pills below · hover for level",
                    "اسحب العناصر أدناه · مرّر لرؤية المستوى",
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Helpers ---------- */
function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 backdrop-blur"
      style={{
        backgroundColor: accent
          ? "color-mix(in oklab, var(--primary) 14%, transparent)"
          : "color-mix(in oklab, var(--foreground) 5%, transparent)",
        border: `1px solid ${
          accent
            ? "color-mix(in oklab, var(--primary) 38%, transparent)"
            : "color-mix(in oklab, var(--foreground) 12%, transparent)"
        }`,
      }}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-md"
        style={{
          backgroundColor: accent
            ? "color-mix(in oklab, var(--primary) 30%, transparent)"
            : "color-mix(in oklab, var(--foreground) 8%, transparent)",
          color: accent ? "var(--primary)" : undefined,
        }}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
          {label}
        </span>
        <span className="text-xs font-medium tabular-nums">{value}</span>
      </span>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] backdrop-blur transition"
      style={{
        backgroundColor: active
          ? "var(--primary)"
          : "color-mix(in oklab, var(--background) 70%, transparent)",
        color: active ? "var(--primary-foreground)" : "var(--foreground)",
        border: `1px solid ${
          active
            ? "color-mix(in oklab, var(--primary) 80%, transparent)"
            : "color-mix(in oklab, var(--foreground) 14%, transparent)"
        }`,
        boxShadow: active
          ? "0 6px 18px -8px color-mix(in oklab, var(--primary) 60%, transparent)"
          : undefined,
      }}
    >
      <span>{label}</span>
      <span
        className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] tabular-nums"
        style={{
          backgroundColor: active
            ? "color-mix(in oklab, white 22%, transparent)"
            : "color-mix(in oklab, var(--foreground) 9%, transparent)",
        }}
      >
        {count}
      </span>
    </button>
  );
}
