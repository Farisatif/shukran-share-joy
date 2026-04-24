import { Reveal } from "./Reveal";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { Counter } from "./motion-primitives";
import {
  GitBranch,
  FolderGit2,
  Star,
  CalendarRange,
  MapPin,
  Github,
  Linkedin,
  Mail,
  Quote,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";

/**
 * AboutSection — editorial, magazine-style profile.
 * - Left rail: portrait card with availability dot, location, contact links
 * - Right column: eyebrow → headline → bilingual lead → pull quote
 * - Below: stat strip with animated counters + delta indicators
 * - Footer: signature toolkit chips
 */
export function AboutSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();
  const stats = data.personal.stats;
  const loc = lang === "ar" ? data.personal.ar : data.personal.en;

  const items = [
    {
      label: t("Commits", "المساهمات"),
      value: stats.commits,
      delta: "+24 / mo",
      icon: GitBranch,
    },
    {
      label: t("Repositories", "المستودعات"),
      value: stats.repos,
      delta: "+3 / yr",
      icon: FolderGit2,
    },
    {
      label: t("Stars earned", "النجوم"),
      value: stats.stars,
      delta: t("organic", "عضوي"),
      icon: Star,
    },
    {
      label: t("Coding since", "البرمجة منذ"),
      value: stats.since,
      delta: `${new Date().getFullYear() - stats.since}+ yrs`,
      icon: CalendarRange,
    },
  ];

  const initials = data.personal.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Highlighted toolkit — a curated subset that signals identity at a glance.
  const signature = [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Tailwind",
    "Supabase",
  ];

  return (
    <section id="about" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Atmospheric backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--primary) 55%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 30% 20%, black 30%, transparent 75%)",
        }}
      />

      <div className="container mx-auto px-6 max-w-7xl relative">
        {/* Top: eyebrow + headline */}
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
            / 01 — {t("About", "نبذة")}
          </p>
          <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-[-0.045em] leading-[0.92] max-w-5xl">
            {t("Crafting software ", "أصنع برمجيات ")}
            <span className="italic gradient-text-primary">
              {t("that ships.", "تصل للمستخدم.")}
            </span>
          </h2>
        </Reveal>

        {/* Body grid */}
        <div className="mt-14 sm:mt-16 grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LEFT — portrait / identity card */}
          <Reveal delay={0.1} className="lg:col-span-4">
            <ProfileCard
              name={data.personal.name}
              title={loc.title}
              location={loc.location}
              initials={initials}
              avatar={data.personal.avatar}
              github={data.personal.github}
              linkedin={data.personal.linkedin}
              email={data.personal.email}
              labels={{
                available: t("Available for work", "متاح للعمل"),
                connect: t("Connect", "تواصل"),
                location: t("Location", "الموقع"),
              }}
            />
          </Reveal>

          {/* RIGHT — bio + quote */}
          <Reveal delay={0.18} className="lg:col-span-8 space-y-8">
            {/* Lead paragraph */}
            <p className="text-xl sm:text-2xl leading-relaxed text-foreground/85 font-light">
              {loc.bio}
            </p>

            {/* Pull quote */}
            <blockquote
              className="relative rounded-3xl p-6 sm:p-8"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--primary) 8%, transparent), color-mix(in oklab, var(--primary) 2%, transparent))",
                border:
                  "1px solid color-mix(in oklab, var(--primary) 25%, transparent)",
              }}
            >
              <Quote
                className="absolute -top-3 -left-3 rtl:left-auto rtl:-right-3 h-7 w-7 p-1 rounded-full"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              />
              <p className="font-display text-xl sm:text-2xl leading-snug tracking-[-0.01em]">
                {t(
                  "I care about details: spacing, motion, edge cases, and the small joys that make software feel alive.",
                  "أهتم بالتفاصيل: التباعد، الحركة، الحالات الحدية، والتفاصيل الصغيرة التي تمنح البرمجيات حياة.",
                )}
              </p>
              <footer className="mt-3 text-xs uppercase tracking-[0.22em] opacity-60">
                — {data.personal.name}
              </footer>
            </blockquote>

            {/* Secondary paragraph */}
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(
                "I started coding in 2019 — middle school. Today I build full-stack web apps, mobile experiences, and systems-level tools.",
                "بدأت البرمجة في ٢٠١٩ في المرحلة الإعدادية. اليوم أبني تطبيقات ويب متكاملة وتجارب جوال وأدوات أنظمة.",
              )}
            </p>

            {/* Signature toolkit chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                {t("Signature stack", "العتاد المميز")}
              </span>
              <span className="opacity-30">·</span>
              {signature.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur"
                  style={{
                    backgroundColor:
                      "color-mix(in oklab, var(--foreground) 5%, transparent)",
                    border:
                      "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Stats strip — magazine-style, animated counters */}
        <Reveal delay={0.25}>
          <div
            className="mt-16 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden"
            style={{
              backgroundColor:
                "color-mix(in oklab, var(--foreground) 12%, transparent)",
              boxShadow:
                "0 30px 80px -40px color-mix(in oklab, var(--primary) 30%, transparent)",
            }}
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="group relative overflow-hidden bg-card p-6 sm:p-8 transition-colors hover:bg-secondary/40"
                >
                  {/* Hover glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700"
                    style={{
                      background:
                        "color-mix(in oklab, var(--primary) 50%, transparent)",
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            "color-mix(in oklab, var(--primary) 14%, transparent)",
                          color: "var(--primary)",
                          border:
                            "1px solid color-mix(in oklab, var(--primary) 28%, transparent)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-60"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight tabular-nums">
                      <Counter to={item.value} duration={1.4} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor:
                            "color-mix(in oklab, var(--primary) 12%, transparent)",
                          color:
                            "color-mix(in oklab, var(--primary) 80%, currentColor)",
                        }}
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        {item.delta}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Profile card ---------- */
function ProfileCard({
  name,
  title,
  location,
  initials,
  avatar,
  github,
  linkedin,
  email,
  labels,
}: {
  name: string;
  title: string;
  location: string;
  initials: string;
  avatar?: string;
  github?: string;
  linkedin?: string;
  email?: string;
  labels: { available: string; connect: string; location: string };
}) {
  return (
    <div className="relative group">
      {/* Gradient hairline */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-3xl p-px opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--primary) 60%, transparent), color-mix(in oklab, var(--foreground) 8%, transparent) 50%, color-mix(in oklab, var(--primary) 35%, transparent))",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div
        className="relative rounded-3xl overflow-hidden backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 88%, transparent))",
          boxShadow:
            "0 40px 90px -50px color-mix(in oklab, var(--primary) 50%, transparent)",
        }}
      >
        {/* Portrait area */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center font-display text-7xl tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--primary) 35%, transparent), color-mix(in oklab, var(--primary-glow) 25%, transparent))",
                color: "var(--primary-foreground)",
              }}
            >
              {initials}
            </div>
          )}

          {/* Gradient veil */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 40%, oklch(0.09 0.02 268 / 0.85) 100%)",
            }}
          />

          {/* Availability badge */}
          <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] backdrop-blur"
              style={{
                backgroundColor: "oklch(0.18 0.02 268 / 0.7)",
                color: "oklch(0.97 0.005 255)",
                border:
                  "1px solid color-mix(in oklab, white 18%, transparent)",
              }}
            >
              <span className="relative inline-flex h-2 w-2">
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-75"
                  style={{ background: "oklch(0.78 0.18 145)" }}
                />
                <span
                  className="relative inline-block h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.78 0.18 145)" }}
                />
              </span>
              {labels.available}
            </span>
          </div>

          {/* Bottom name plate */}
          <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
            <p
              className="font-display text-2xl sm:text-3xl tracking-[-0.02em] leading-tight"
              style={{ color: "oklch(0.985 0.004 255)" }}
            >
              {name}
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "oklch(0.85 0.04 255)" }}
            >
              {title}
            </p>
          </div>
        </div>

        {/* Footer block */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location}</span>
          </div>

          <div className="flex items-center gap-2">
            {github && (
              <SocialLink href={`https://${github}`} icon={<Github className="h-3.5 w-3.5" />} label="GitHub" />
            )}
            {linkedin && (
              <SocialLink
                href={`https://${linkedin}`}
                icon={<Linkedin className="h-3.5 w-3.5" />}
                label="LinkedIn"
              />
            )}
            {email && (
              <SocialLink
                href={`mailto:${email}`}
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
              />
            )}
          </div>

          <div
            className="flex items-center justify-between gap-2 pt-2 mt-1 border-t text-[11px]"
            style={{
              borderColor:
                "color-mix(in oklab, var(--foreground) 10%, transparent)",
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CircleDot className="h-3 w-3" style={{ color: "oklch(0.78 0.18 145)" }} />
              Online
            </span>
            <span className="font-mono uppercase tracking-[0.2em] opacity-50">
              v · {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background/60 text-xs font-medium transition hover:border-[color:var(--primary)]/60 hover:text-[color:var(--primary)]"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
