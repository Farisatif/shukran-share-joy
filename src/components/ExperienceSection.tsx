import { Reveal } from "./Reveal";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { useRef, useState, type MouseEvent } from "react";
import {
  Building2,
  MapPin,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  Briefcase,
  Clock3,
} from "lucide-react";

export function ExperienceSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();

  const labels = {
    period: t("Period", "الفترة"),
    company: t("Company", "الجهة"),
    highlights: t("Highlights", "أبرز الإنجازات"),
    present: t("Present", "حاليًا"),
  };

  const totalRoles = data.experience.length;
  const yearsActive = (() => {
    const years = data.experience
      .map((exp) => parseInt(exp.period.slice(0, 4), 10))
      .filter((value) => Number.isFinite(value));
    if (!years.length) return 0;
    const earliest = Math.min(...years);
    return new Date().getFullYear() - earliest;
  })();

  return (
    <section
      id="work"
      className="py-24 sm:py-32 relative overflow-hidden"
    >
      {/* Atmospheric background — primary glow + soft grid texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--primary) 60%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--primary) 80%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />

      <div className="container mx-auto px-6 max-w-6xl relative">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.25em] opacity-55 mb-4">
                / 03 — {t("Experience", "الخبرة")}
              </p>
              <h2 className="font-display text-5xl sm:text-7xl tracking-[-0.04em] leading-[0.95]">
                {t("Where I've ", "أين قضيت ")}
                <span
                  className="italic"
                  style={{
                    color:
                      "color-mix(in oklab, var(--primary) 70%, currentColor)",
                  }}
                >
                  {t("put in the hours.", "ساعات العمل.")}
                </span>
              </h2>
              <p className="mt-5 text-base sm:text-lg opacity-65 max-w-2xl leading-relaxed">
                {t(
                  "A timeline of roles where I've shipped real software, collaborated with thoughtful teams, and grown as an engineer.",
                  "سجلٌّ مهني يرصد المحطات التي شحنت فيها برمجيات حقيقية وتعاونت مع فرق مميزة ونمَوت فيها كمهندس.",
                )}
              </p>
            </div>

            {/* Quick stat strip */}
            <div className="flex flex-wrap items-stretch gap-2.5">
              <StatChip
                icon={<Briefcase className="h-3.5 w-3.5" />}
                label={t("Roles", "أدوار")}
                value={totalRoles.toString()}
              />
              <StatChip
                icon={<Clock3 className="h-3.5 w-3.5" />}
                label={t("Years active", "سنوات الخبرة")}
                value={`${yearsActive}+`}
              />
              <StatChip
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label={t("Status", "الحالة")}
                value={labels.present}
                accent
              />
            </div>
          </div>
        </Reveal>

        {/* Timeline rail + cards */}
        <div className="relative mt-16 sm:mt-20">
          {/* Vertical rail — gradient, fades at both ends. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 left-4 sm:left-1/2 sm:-translate-x-1/2 w-px"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--primary) 35%, transparent) 12%, color-mix(in oklab, var(--primary) 35%, transparent) 88%, transparent 100%)",
            }}
          />

          <ol className="relative space-y-8 sm:space-y-12">
            {data.experience.map((exp, i) => {
              const l = lang === "ar" ? exp.ar : exp.en;
              const isPresent = /present|حالي/i.test(exp.period);
              const side = i % 2 === 0 ? "left" : "right";
              return (
                <Reveal key={exp.company} delay={i * 0.07}>
                  <ExperienceRow
                    period={exp.period}
                    company={exp.company}
                    role={l.role}
                    location={l.location}
                    description={l.description}
                    highlights={l.highlights}
                    index={i}
                    total={totalRoles}
                    side={side}
                    isPresent={isPresent}
                    labels={labels}
                  />
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stat chip ---------- */
function StatChip({
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
      className="inline-flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur"
      style={{
        backgroundColor: accent
          ? "color-mix(in oklab, var(--primary) 16%, transparent)"
          : "color-mix(in oklab, currentColor 5%, transparent)",
        border: `1px solid ${
          accent
            ? "color-mix(in oklab, var(--primary) 38%, transparent)"
            : "color-mix(in oklab, currentColor 12%, transparent)"
        }`,
      }}
    >
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
        style={{
          backgroundColor: accent
            ? "color-mix(in oklab, var(--primary) 35%, transparent)"
            : "color-mix(in oklab, currentColor 8%, transparent)",
          color: accent ? "var(--primary-foreground)" : undefined,
        }}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.18em] opacity-60">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">{value}</span>
      </span>
    </div>
  );
}

/* ---------- Timeline row ---------- */
function ExperienceRow({
  period,
  company,
  role,
  location,
  description,
  highlights,
  index,
  total,
  side,
  isPresent,
  labels,
}: {
  period: string;
  company: string;
  role: string;
  location: string;
  description: string;
  highlights: string[];
  index: number;
  total: number;
  side: "left" | "right";
  isPresent: boolean;
  labels: { period: string; company: string; highlights: string; present: string };
}) {
  const initials = company
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="relative">
      {/* Mobile rail dot anchor (positioned on the left rail) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-10">
        {/* Left column (always content on mobile) */}
        <div
          className={`${
            side === "right"
              ? "sm:col-start-2 sm:row-start-1"
              : "sm:col-start-1 sm:row-start-1"
          } pl-12 sm:pl-0 ${side === "right" ? "sm:pl-12" : "sm:pr-12 sm:text-right rtl:sm:text-left"}`}
        >
          <ExperienceCard
            period={period}
            company={company}
            role={role}
            location={location}
            description={description}
            highlights={highlights}
            index={index}
            total={total}
            isPresent={isPresent}
            initials={initials}
            labels={labels}
            alignRight={side === "left"}
          />
        </div>

        {/* Spacer column on the opposite side (desktop only) */}
        <div
          className={`hidden sm:block ${
            side === "right" ? "sm:col-start-1 sm:row-start-1" : "sm:col-start-2 sm:row-start-1"
          }`}
          aria-hidden
        />
      </div>

      {/* Rail node */}
      <div
        className="absolute top-7 left-4 sm:left-1/2 -translate-x-1/2 z-10"
        aria-hidden
      >
        <span
          className="relative inline-flex h-3.5 w-3.5 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-glow))",
            boxShadow:
              "0 0 0 4px color-mix(in oklab, var(--background) 90%, transparent), 0 0 0 5px color-mix(in oklab, var(--primary) 35%, transparent), 0 0 22px color-mix(in oklab, var(--primary) 60%, transparent)",
          }}
        >
          {isPresent && (
            <span
              className="absolute inset-0 animate-ping rounded-full"
              style={{
                background: "color-mix(in oklab, var(--primary) 70%, transparent)",
              }}
            />
          )}
        </span>
      </div>
    </li>
  );
}

/* ---------- Card ---------- */
function ExperienceCard({
  period,
  company,
  role,
  location,
  description,
  highlights,
  index,
  total,
  isPresent,
  initials,
  labels,
  alignRight,
}: {
  period: string;
  company: string;
  role: string;
  location: string;
  description: string;
  highlights: string[];
  index: number;
  total: number;
  isPresent: boolean;
  initials: string;
  labels: { period: string; company: string; highlights: string; present: string };
  alignRight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(index === 0);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      className="group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-1"
    >
      {/* Gradient hairline border */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-3xl p-px opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 55%, transparent), color-mix(in oklab, var(--foreground) 8%, transparent) 40%, color-mix(in oklab, var(--primary) 35%, transparent))",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Glass surface — themed via tokens, adapts to light/dark */}
      <div
        className="relative rounded-3xl backdrop-blur-xl border border-border/60 bg-card text-card-foreground"
        style={{
          backgroundImage:
            "linear-gradient(160deg, color-mix(in oklab, var(--surface-1) 100%, transparent) 0%, color-mix(in oklab, var(--surface-2) 100%, transparent) 55%, color-mix(in oklab, var(--surface-3) 100%, transparent) 100%)",
          boxShadow:
            "0 30px 70px -30px color-mix(in oklab, var(--primary) 35%, transparent), inset 0 1px 0 color-mix(in oklab, var(--foreground) 6%, transparent)",
        }}
      >
        {/* Mouse-tracked spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
          }}
        />

        {/* Shine sweep */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden"
        >
          <div
            className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-1000 ease-out"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, white 8%, transparent), transparent)",
            }}
          />
        </div>

        <div className="relative p-6 sm:p-8">
          {/* Top row: monogram + title block + meta */}
          <div className={`flex items-start gap-4 ${alignRight ? "rtl:flex-row sm:flex-row-reverse rtl:sm:flex-row" : ""}`}>
            {/* Monogram tile */}
            <div
              className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-base font-display tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--primary) 90%, transparent), color-mix(in oklab, var(--primary-deep) 80%, transparent))",
                border:
                  "1px solid color-mix(in oklab, var(--primary) 45%, transparent)",
                color: "var(--primary-foreground)",
                boxShadow:
                  "inset 0 1px 0 color-mix(in oklab, white 18%, transparent)",
              }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-55">
                  {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tabular-nums"
                  style={{
                    background: isPresent
                      ? "color-mix(in oklab, var(--primary) 18%, transparent)"
                      : "color-mix(in oklab, var(--foreground) 6%, transparent)",
                    color: isPresent
                      ? "var(--primary)"
                      : "var(--foreground)",
                    border: `1px solid ${
                      isPresent
                        ? "color-mix(in oklab, var(--primary) 40%, transparent)"
                        : "color-mix(in oklab, var(--foreground) 12%, transparent)"
                    }`,
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {period}
                  {isPresent && (
                    <span
                      className="ml-1 inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ background: "oklch(0.7 0.2 145)" }}
                    />
                  )}
                </span>
              </div>

              <h3 className="mt-3 font-display text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
                {role}
              </h3>
              <div className="mt-1.5 flex items-center gap-2 text-sm flex-wrap opacity-80">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 opacity-70" />
                  <span className="font-medium text-primary">
                    {company}
                  </span>
                </span>
                <span className="opacity-30">·</span>
                <span className="inline-flex items-center gap-1.5 opacity-70">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              </div>
            </div>
          </div>

          {/* Hairline */}
          <div
            className="h-px my-5"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, currentColor 18%, transparent), transparent)",
            }}
          />

          {/* Description */}
          <p className="text-[14.5px] sm:text-[15px] leading-[1.7] opacity-80">
            {description}
          </p>

          {/* Highlights — collapsible */}
          {highlights.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] opacity-65 hover:opacity-100 transition-opacity"
                aria-expanded={open}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{labels.highlights}</span>
                <span
                  className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums"
                  style={{
                    background: "color-mix(in oklab, var(--foreground) 8%, transparent)",
                  }}
                >
                  {highlights.length}
                </span>
                <ArrowUpRight
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    open ? "rotate-90" : ""
                  }`}
                />
              </button>

              <div
                className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                style={{
                  gridTemplateRows: open ? "1fr" : "0fr",
                  opacity: open ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <ul className="mt-4 space-y-2.5">
                    {highlights.map((h, hi) => (
                      <li
                        key={h}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed opacity-90 transition-colors hover:bg-foreground/[0.04]"
                      >
                        <span
                          className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] tabular-nums"
                          style={{
                            background:
                              "linear-gradient(135deg, color-mix(in oklab, var(--primary) 85%, transparent), color-mix(in oklab, var(--primary) 55%, transparent))",
                            color: "var(--primary-foreground)",
                            border:
                              "1px solid color-mix(in oklab, var(--primary) 50%, transparent)",
                          }}
                        >
                          {String(hi + 1).padStart(2, "0")}
                        </span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
