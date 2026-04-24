import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Github, Star, GitFork, ExternalLink, Users, BookMarked, RefreshCw } from "lucide-react";
import { Reveal } from "./Reveal";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";
import { getGithubBundle, type GithubBundle } from "@/utils/github.functions";
import { GlowDots } from "./GlowDots";
import { Skeleton, DotPulse } from "@/components/ui/skeleton";

const CELL = 12; // px
const GAP = 4; // px
const STEP = CELL + GAP;

const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LABELS_AR = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];

function Heatmap({
  grid,
  t,
}: {
  grid: { cols: { count: number; date: string }[][]; max: number; total: number } | null;
  t: (en: string, ar: string) => string;
}) {
  const cols =
    grid?.cols ||
    (Array.from({ length: 52 }, () => []) as { count: number; date: string }[][]);
  const isAr = t("a", "ا") === "ا";
  const monthNames = isAr ? MONTH_LABELS_AR : MONTH_LABELS_EN;

  const monthMarkers: { col: number; label: string }[] = [];
  let prevMonth = -1;
  cols.forEach((week, wi) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const m = new Date(firstDay.date).getUTCMonth();
    if (m !== prevMonth) {
      monthMarkers.push({ col: wi, label: monthNames[m] });
      prevMonth = m;
    }
  });

  const dayLabels: { row: number; label: string }[] = [
    { row: 1, label: t("Mon", "إث") },
    { row: 3, label: t("Wed", "أر") },
    { row: 5, label: t("Fri", "جم") },
  ];

  const LEFT_PAD = 28;
  const TOP_PAD = 18;
  const gridWidth = cols.length * STEP;
  const gridHeight = 7 * STEP;

  return (
    <div className="relative" dir="ltr" style={{ paddingLeft: LEFT_PAD, paddingTop: TOP_PAD }}>
      <div
        className="absolute top-0 text-[10px] text-muted-foreground"
        style={{ left: LEFT_PAD, width: gridWidth, height: TOP_PAD }}
      >
        {monthMarkers.map((mk) => (
          <span key={`${mk.col}-${mk.label}`} className="absolute" style={{ left: mk.col * STEP }}>
            {mk.label}
          </span>
        ))}
      </div>
      <div
        className="absolute left-0 text-[10px] text-muted-foreground"
        style={{ top: TOP_PAD, width: LEFT_PAD - 4, height: gridHeight }}
      >
        {dayLabels.map((d) => (
          <span
            key={d.label}
            className="absolute right-1"
            style={{ top: d.row * STEP - 1, lineHeight: `${CELL}px` }}
          >
            {d.label}
          </span>
        ))}
      </div>
      <div className="flex" style={{ gap: `${GAP}px` }}>
        {cols.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week[di];
              if (!cell)
                return (
                  <span
                    key={di}
                    className="rounded-[2px]"
                    style={{ width: CELL, height: CELL, background: cellColor(0) }}
                  />
                );
              const level = grid ? bucket(cell.count, grid.max) : 0;
              return (
                <span
                  key={di}
                  title={`${cell.date}: ${cell.count}`}
                  className="rounded-[2px] transition-transform hover:scale-[1.35] hover:ring-2 hover:ring-[#2ea043] hover:z-10 relative cursor-pointer"
                  style={{ width: CELL, height: CELL, background: cellColor(level) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
  Java: "#B07219",
  "C++": "#F34B7D",
  C: "#555555",
  "C#": "#178600",
  HTML: "#E34C26",
  CSS: "#563D7C",
  Shell: "#89E051",
  Dart: "#00B4AB",
  Go: "#00ADD8",
  Rust: "#DEA584",
  Vue: "#41B883",
  Default: "#6B7280",
};

function langColor(lang: string | null): string {
  return (lang && LANG_COLORS[lang]) || LANG_COLORS.Default;
}

export function GithubActivitySection() {
  const { data } = useSiteData();
  const { t, lang } = useLang();
  const username =
    (data.personal as { githubUsername?: string }).githubUsername ||
    "Farisatif";
  const getBundleFn = useServerFn(getGithubBundle);
  const [bundle, setBundle] = useState<GithubBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const b = await getBundleFn({ data: { username } });
      setBundle(b);
    } catch {
      // Keep static fallback.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const profile = bundle?.profile;
  const repos = bundle?.repos ?? [];
  const stats = useMemo(() => {
    return {
      repos: profile?.public_repos ?? data.personal.stats.repos,
      followers: profile?.followers ?? data.personal.stats.followers,
      following: profile?.following ?? 0,
      stars: bundle?.totalStars ?? data.personal.stats.stars,
    };
  }, [profile, bundle, data.personal.stats]);

  // Build 52-week heatmap grid (cols = weeks, rows = day-of-week 0..6).
  const grid = useMemo(() => {
    const days = bundle?.contributions ?? [];
    if (!days.length) return null;
    const cols: { count: number; date: string }[][] = [];
    const totalCells = days.length;
    let i = 0;
    while (i < totalCells) {
      const week: { count: number; date: string }[] = [];
      for (let d = 0; d < 7 && i < totalCells; d++, i++) {
        const day = days[i];
        week.push({ count: day.count, date: day.date });
      }
      cols.push(week);
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    const total = days.reduce((sum, d) => sum + (d.count || 0), 0);
    return { cols, max, total };
  }, [bundle]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <section id="github" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Interactive glowing dots backdrop — reacts to cursor/touch
          across the entire section. pointer-events:none so it never blocks
          card interactions. Auto-themes via currentColor. */}
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
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10 sm:mb-14">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  / 06 — {t("Live from GitHub", "مباشر من جيت‌هاب")}
                </p>
                {bundle?.ok && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2ea043]/40 bg-[#2ea043]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#2ea043]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-[#2ea043] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2ea043]" />
                    </span>
                    {t("Live", "مباشر")}
                  </span>
                )}
              </div>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-[-0.04em] leading-[0.95] max-w-2xl">
                {t("Real activity. ", "نشاط حقيقي. ")}
                <span className="italic gradient-text-primary">
                  {t("Synced live.", "متزامن لحظياً.")}
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background hover:bg-secondary px-4 py-2 text-xs disabled:opacity-50 transition"
            >
              {refreshing ? <DotPulse /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t("Refresh", "تحديث")}
            </button>
          </div>
        </Reveal>

        {/* Profile — corporate identity card. Two-column structure with
            a left identity block and a right stat ledger. Hairline-only
            chrome, no glassy gradients, prioritising legibility. */}
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Top bar — verified ribbon */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-2.5 border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Github className="h-3 w-3" />
                {t("Verified profile", "حساب موثوق")}
              </span>
              <span className="font-mono normal-case tracking-tight tabular-nums opacity-70">
                @{username}
              </span>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-6 p-5 sm:p-7">
              {/* Identity */}
              <div className="flex items-start gap-5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={profile?.avatar_url || (data.personal as { avatar?: string }).avatar || `https://github.com/${username}.png`}
                    alt={profile?.name || username}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover border border-border"
                    loading="lazy"
                  />
                  {bundle?.ok && (
                    <span
                      className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border"
                      title={t("Online", "متصل")}
                    >
                      <span className="h-2 w-2 rounded-full bg-[#2ea043]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <a
                      href={`https://github.com/${username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-display text-2xl sm:text-3xl tracking-tight hover:underline truncate"
                    >
                      {profile?.name || data.personal.name}
                    </a>
                    <span className="font-mono text-xs text-muted-foreground">
                      @{username}
                    </span>
                  </div>
                  {profile?.bio && (
                    <p className="mt-2 text-sm text-foreground/75 leading-relaxed max-w-xl" dir={lang === "ar" ? "rtl" : "ltr"}>
                      {profile.bio}
                    </p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-[12px]">
                    {profile?.location && (
                      <MetaRow label={t("Location", "الموقع")} value={profile.location} />
                    )}
                    {profile?.blog && (
                      <MetaRow
                        label={t("Website", "الموقع الإلكتروني")}
                        value={profile.blog.replace(/^https?:\/\//, "")}
                      />
                    )}
                    <MetaRow
                      label={t("Profile", "البروفايل")}
                      value={`github.com/${username}`}
                    />
                  </dl>
                </div>
              </div>

              {/* Stat ledger */}
              <div className="md:border-l md:rtl:border-l-0 md:rtl:border-r md:border-border md:pl-6 md:rtl:pl-0 md:rtl:pr-6 grid grid-cols-4 md:grid-cols-2 gap-x-6 gap-y-4 md:min-w-[260px] md:self-center">
                <Stat label={t("Repos", "مستودعات")} value={stats.repos} kind="repos" icon={<BookMarked className="h-3.5 w-3.5" />} loading={loading} />
                <Stat label={t("Stars", "نجوم")} value={stats.stars} kind="stars" icon={<Star className="h-3.5 w-3.5" />} loading={loading} />
                <Stat label={t("Followers", "متابعون")} value={stats.followers} kind="followers" icon={<Users className="h-3.5 w-3.5" />} loading={loading} />
                <Stat label={t("Following", "يتابع")} value={stats.following} kind="following" icon={<Users className="h-3.5 w-3.5" />} loading={loading} />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Contribution heatmap */}
        <Reveal delay={0.15}>
          <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium">{t("Contributions", "المساهمات")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {grid
                    ? t(
                        `${grid.total.toLocaleString()} contributions in the last year`,
                        `${grid.total.toLocaleString("ar-EG")} مساهمة خلال السنة الماضية`,
                      )
                    : t(
                        "Last 12 months of public contributions on GitHub.",
                        "آخر ١٢ شهراً من المساهمات العامة على جيت‌هاب.",
                      )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{t("Less", "أقل")}</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span
                    key={l}
                    className="h-3 w-3 rounded-[3px]"
                    style={{ background: cellColor(l) }}
                  />
                ))}
                <span>{t("More", "أكثر")}</span>
              </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              {loading && !grid ? (
                <HeatmapSkeleton />
              ) : (
                <Heatmap grid={grid} t={t} />
              )}
              <div className="sm:hidden flex items-center gap-1.5 text-[10px] text-muted-foreground mt-3 justify-end">
                <span>{t("Less", "أقل")}</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span
                    key={l}
                    className="h-3 w-3 rounded-[3px]"
                    style={{ background: cellColor(l) }}
                  />
                ))}
                <span>{t("More", "أكثر")}</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Top repos */}
        <Reveal delay={0.2}>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {loading && !repos.length
              ? Array.from({ length: 6 }).map((_, i) => <RepoCardSkeleton key={i} />)
              : (repos.length ? repos.slice(0, 6) : data.projects.slice(0, 6).map(staticToRepo)).map((r) => (
              <a
                key={r.html_url}
                href={r.html_url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-border bg-background/80 backdrop-blur-md hover:bg-secondary/60 p-4 sm:p-5 transition flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-display text-lg tracking-tight truncate">{r.name}</div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0 mt-1" />
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2.4em]">
                  {r.description || t("No description", "بدون وصف")}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                  {r.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: langColor(r.language) }} />
                      {r.language}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{r.stargazers_count}</span>
                  <span className="inline-flex items-center gap-1"><GitFork className="h-3 w-3" />{r.forks_count}</span>
                </div>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Skeleton mirror of the contributions heatmap — same exact dimensions. */
function HeatmapSkeleton() {
  const LEFT_PAD = 28;
  const TOP_PAD = 18;
  const COLS = 52;
  const ROWS = 7;
  return (
    <div
      className="relative skeleton-content-in"
      dir="ltr"
      style={{ paddingLeft: LEFT_PAD, paddingTop: TOP_PAD }}
    >
      <div className="flex" style={{ gap: `${GAP}px` }}>
        {Array.from({ length: COLS }).map((_, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
            {Array.from({ length: ROWS }).map((_, di) => (
              <Skeleton
                key={di}
                as="span"
                className="block rounded-[2px]"
                style={{
                  width: CELL,
                  height: CELL,
                  animationDelay: `${(wi + di) * 18}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton mirror of a top-repo card — preserves card height to avoid jump. */
function RepoCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background/60 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-3 skeleton-content-in">
      <div className="flex items-start justify-between gap-3">
        <Skeleton variant="title" className="h-5 w-1/2" />
        <Skeleton className="h-3.5 w-3.5 rounded-md shrink-0 mt-1" />
      </div>
      <div className="space-y-1.5 min-h-[2.4em]">
        <Skeleton variant="text" className="h-2.5 w-[92%]" />
        <Skeleton variant="text" className="h-2.5 w-[70%]" />
      </div>
      <div className="flex items-center gap-3 mt-auto">
        <Skeleton className="h-2.5 w-14 rounded-full" />
        <Skeleton className="h-2.5 w-8 rounded-full" />
        <Skeleton className="h-2.5 w-8 rounded-full" />
      </div>
    </div>
  );
}

type StatKind = "repos" | "stars" | "followers" | "following";

function Stat({
  label,
  value,
  kind,
  icon,
  loading,
}: {
  label: string;
  value: number;
  kind: StatKind;
  icon: React.ReactNode;
  loading: boolean;
}) {
  const level = levelFor(value, kind);
  const color = cellColor(level);
  return (
    <div className="rounded-xl bg-background/70 backdrop-blur-sm border border-border px-3 py-3 sm:py-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className="mt-1 font-display text-2xl sm:text-3xl tabular-nums transition-colors"
        style={{ color: loading ? undefined : color }}
      >
        {loading ? <Skeleton as="span" className="inline-block h-7 w-12 rounded-md align-middle" /> : value}
      </div>
      <div className="mt-2 flex items-center gap-[3px]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="h-1.5 w-3 rounded-[2px] transition-opacity"
            style={{
              background: cellColor(l),
              opacity: l <= level ? 1 : 0.35,
              outline: l === level ? `1px solid ${color}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function levelFor(value: number, kind: StatKind): number {
  if (!value || value <= 0) return 0;
  const thresholds: Record<StatKind, [number, number, number, number]> = {
    repos: [5, 15, 40, 80],
    stars: [10, 50, 200, 500],
    followers: [10, 50, 200, 500],
    following: [10, 50, 200, 500],
  };
  const [a, b, c, d] = thresholds[kind];
  if (value >= d) return 4;
  if (value >= c) return 3;
  if (value >= b) return 2;
  if (value >= a) return 1;
  return 1;
}

function bucket(n: number, max: number): number {
  if (n <= 0) return 0;
  const r = n / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

function cellColor(level: number): string {
  // Authentic GitHub contribution colors.
  // Light: GitHub light theme. Dark: GitHub dark theme.
  const colors = [
    "light-dark(#ebedf0, #161b22)",
    "light-dark(#9be9a8, #0e4429)",
    "light-dark(#40c463, #006d32)",
    "light-dark(#30a14e, #26a641)",
    "light-dark(#216e39, #39d353)",
  ];
  return colors[level] || colors[0];
}

function staticToRepo(p: { name: string; url: string; language: string; stars: number; forks: number; en: { description: string } }) {
  return {
    name: p.name,
    html_url: p.url.startsWith("http") ? p.url : `https://${p.url}`,
    description: p.en.description,
    language: p.language,
    stargazers_count: p.stars,
    forks_count: p.forks,
  };
}

/** Compact label/value row for the corporate profile meta block. */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground/90 truncate font-medium">{value}</dd>
    </div>
  );
}
