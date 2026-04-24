import { Reveal } from "./Reveal";
import { GlowDots } from "./GlowDots";
import { LanguageProfile } from "./LanguageProfile";
import {
  Award,
  Code2,
  CheckCircle2,
  Users,
  Briefcase,
  Layers,
  Clock,
  Star,
  Zap,
  Sparkles,
  Rocket,
  Trophy,
} from "lucide-react";
import { useSiteData } from "./SiteDataProvider";
import { useLang } from "./LanguageProvider";

export const ACHIEVEMENT_ICONS: Record<string, typeof Award> = {
  code: Code2,
  check: CheckCircle2,
  users: Users,
  briefcase: Briefcase,
  layers: Layers,
  clock: Clock,
  award: Award,
  star: Star,
  zap: Zap,
  sparkles: Sparkles,
  rocket: Rocket,
  trophy: Trophy,
};

/**
 * Signature "inverted" section — wrapped by <SectionBand variant="dark"> so the
 * background is pure black in light mode and pure white in dark mode.
 *
 * All inner colors are expressed via `currentColor`-mixed tokens
 * (text-current/foreground/background) so the section auto-flips with the
 * theme without any duplicate light/dark utility classes.
 */
export function AchievementsSection() {
  const { data } = useSiteData();
  const { lang, t } = useLang();

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      {/* Interactive glowing-dots field — full-bleed, reacts to cursor / touch.
          Uses currentColor so dots/glow inherit the inverted band color
          (white in light mode, black in dark mode). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <GlowDots
          asBackground
          height="100%"
          dotColor="currentColor"
          glowColor="currentColor"
          spacing={38}
        />
      </div>
      {/* Soft radial glow centered on the title for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center top, color-mix(in oklab, currentColor 8%, transparent), transparent 70%)",
        }}
      />

      <div className="relative container mx-auto px-6 max-w-7xl">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] opacity-60 mb-5">
              / 05 — {t("Milestones", "إنجازات")}
            </p>
            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-[-0.045em] leading-[0.95]">
              {t("A few ", "بعض ")}
              <span className="italic opacity-70">
                {t("proud moments.", "اللحظات المُشرّفة.")}
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg opacity-60 leading-relaxed max-w-xl mx-auto">
              {t(
                "Milestones from a journey of building, shipping, and learning in public.",
                "محطات من رحلة البناء والشحن والتعلّم على الملأ.",
              )}
            </p>
          </div>
        </Reveal>

        {/* Language distribution — premium editorial panel above the cards. */}
        <Reveal delay={0.05}>
          <div className="mt-16 sm:mt-20">
            <LanguageProfile />
          </div>
        </Reveal>

        {/* Achievement cards — currentColor-driven, auto-invert with the band. */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.achievements.map((a, i) => {
            const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Award;
            const title = lang === "ar" ? a.title_ar : a.title_en;
            const desc = lang === "ar" ? a.desc_ar : a.desc_en;
            const badge = lang === "ar" ? a.badge_ar : a.badge_en;
            return (
              <Reveal key={a.id} delay={i * 0.06}>
                <div
                  data-cursor="view"
                  data-cursor-label={t("View", "عرض")}
                  className="group relative h-full rounded-3xl p-7 overflow-hidden transition-all duration-500 hover-lift"
                  style={{
                    backgroundColor: "color-mix(in oklab, currentColor 5%, transparent)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "color-mix(in oklab, currentColor 12%, transparent)",
                  }}
                >
                  <div
                    className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-0 group-hover:opacity-70 blur-3xl transition-opacity duration-700"
                    style={{ background: `hsl(${a.accent} / 0.5)` }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ring-1 ring-white/20"
                        style={{ background: `hsl(${a.accent})` }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                        {badge}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl tracking-tight">{title}</h3>
                    <p className="mt-3 text-sm opacity-65 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}