import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Code2, GitBranch, Layers, TrendingUp } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

/**
 * LanguageProfile — editorial, data-rich panel that visualizes the language
 * mix three ways at once:
 *  - a stacked horizontal proportion bar (hero element)
 *  - a donut/ring chart with the leader pulled out
 *  - per-language rows with animated fills
 *
 * Designed to live on a dark band (oklch(0.085 ...)) and signal a real
 * "engineering profile", not a generic stats list.
 */

const PALETTE = [
  "oklch(0.78 0.16 60)", // JavaScript — amber
  "oklch(0.62 0.18 30)", // Java — terracotta
  "oklch(0.7 0.15 145)", // Python — green
  "oklch(0.68 0.18 240)", // TypeScript — blue
  "oklch(0.62 0.2 295)", // C++ — violet
  "oklch(0.6 0.18 255)", // C — indigo
  "oklch(0.65 0.2 330)", // C# — magenta
  "oklch(0.55 0.02 260)", // Other — neutral
];

export function LanguageProfile() {
  const { data } = useSiteData();
  const { t } = useLang();
  const [active, setActive] = useState<number | null>(0);

  const items = useMemo(() => {
    const sorted = [...data.languages].sort((a, b) => b.percent - a.percent);
    return sorted.map((language, index) => ({
      ...language,
      color: PALETTE[index % PALETTE.length],
    }));
  }, [data.languages]);

  const total = items.reduce((sum, x) => sum + x.percent, 0);
  const dominant = items[0];
  const leadGap = items.length > 1 ? items[0].percent - items[1].percent : 0;
  const typed = items.find((x) => x.name === "TypeScript")?.percent ?? 0;

  // Donut math
  const R = 58;
  const C = 2 * Math.PI * R;
  let cursor = 0;
  const arcs = items.map((item) => {
    const len = (item.percent / Math.max(total, 1)) * C;
    const arc = { dash: len, offset: -cursor, color: item.color, name: item.name };
    cursor += len;
    return arc;
  });

  return (
    <div className="relative">
      {/* Header — editorial, no card chrome */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8 border-b border-foreground/10">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Code2 className="h-3 w-3" />
            <span>{t("Stack signal", "بصمة التقنية")}</span>
          </div>
          <h3 className="mt-3 font-display text-3xl sm:text-4xl tracking-[-0.03em]">
            {t("Language footprint", "البصمة اللغوية")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
            {t(
              "Real distribution across shipped repositories — measured, not curated.",
              "توزيع حقيقي عبر المستودعات المشحونة — مقاس، لا منتقى.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Stat label={t("Languages", "لغة")} value={items.length.toString()} />
          <Stat label={t("Lead", "الصدارة")} value={`+${leadGap}%`} />
          <Stat label="TS" value={`${typed}%`} accent />
        </div>
      </div>

      {/* Stacked proportion bar */}
      <div className="relative mt-8">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "color-mix(in oklab, var(--foreground) 8%, transparent)" }}
        >
          {items.map((item, index) => (
            <motion.button
              key={item.name}
              type="button"
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              initial={{ width: 0 }}
              whileInView={{ width: `${(item.percent / total) * 100}%` }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full transition-[filter,transform] hover:brightness-125 focus:outline-none"
              style={{
                background: item.color,
                transform: active === index ? "scaleY(1.35)" : "scaleY(1)",
                transformOrigin: "center",
              }}
              aria-label={`${item.name} ${item.percent}%`}
            />
          ))}
        </div>
        {/* Percentage axis */}
        <div className="mt-2 flex justify-between text-[10px] tabular-nums opacity-40">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Body grid: donut + list */}
      <div className="relative mt-7 grid gap-7 lg:grid-cols-[180px_1fr]">
        {/* Donut */}
        <div className="relative mx-auto flex h-[180px] w-[180px] items-center justify-center">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              strokeWidth="14"
              stroke="color-mix(in oklab, var(--foreground) 8%, transparent)"
            />
            {arcs.map((arc, index) => (
              <motion.circle
                key={arc.name}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                strokeWidth={active === index ? 18 : 14}
                stroke={arc.color}
                strokeDasharray={`${arc.dash} ${C}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
                style={{ transition: "stroke-width 200ms ease" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase tracking-[0.25em] opacity-50">
              {active != null ? items[active].name : t("Top", "الصدارة")}
            </span>
            <span className="font-display text-3xl tabular-nums">
              {active != null ? items[active].percent : dominant.percent}%
            </span>
          </div>
        </div>

        {/* List */}
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <li key={item.name}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseLeave={() => setActive(0)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus:outline-none"
                style={{
                  backgroundColor:
                    active === index
                      ? "color-mix(in oklab, var(--foreground) 8%, transparent)"
                      : "transparent",
                }}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: item.color,
                    boxShadow: `0 0 12px ${item.color}`,
                  }}
                />
                <span className="flex-1 truncate text-sm">{item.name}</span>
                <span className="font-mono text-xs tabular-nums opacity-70 group-hover:opacity-100">
                  {item.percent.toString().padStart(2, "0")}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer meta */}
      <div
        className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-[11px] opacity-70"
        style={{ borderColor: "color-mix(in oklab, var(--foreground) 12%, transparent)" }}
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> {items.length} {t("languages", "لغة")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="h-3 w-3" /> {data.personal.stats.repos}{" "}
            {t("repos", "مستودعًا")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> {data.personal.stats.commits}{" "}
            {t("commits", "مساهمة")}
          </span>
        </div>
        <span className="font-mono uppercase tracking-[0.2em]">
          {t("source", "المصدر")} · github
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: accent
          ? "color-mix(in oklab, var(--primary) 18%, transparent)"
          : "color-mix(in oklab, var(--foreground) 7%, transparent)",
        border: `1px solid ${
          accent
            ? "color-mix(in oklab, var(--primary) 45%, transparent)"
            : "color-mix(in oklab, var(--foreground) 12%, transparent)"
        }`,
        color: accent ? "var(--primary)" : "inherit",
      }}
    >
      <span className="opacity-65">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}