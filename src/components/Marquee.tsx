import { useLang } from "./LanguageProvider";

export function Marquee({ items, itemsAr }: { items: string[]; itemsAr?: string[] }) {
  const { lang } = useLang();
  const list = lang === "ar" && itemsAr?.length ? itemsAr : items;
  // Repeat the list enough times to guarantee the track is at least 2× the
  // widest viewport (so the -50% loop never reveals an empty edge). We
  // duplicate the *full* set an even number of times so both halves of the
  // animation are identical — the wrap-around becomes invisible.
  const REPEATS = 6;
  const looped = Array.from({ length: REPEATS }, () => list).flat();
  return (
    <div className="relative overflow-hidden py-3 sm:py-4 border-y border-border bg-secondary/40">
      <div
        className={`flex gap-8 marquee whitespace-nowrap ${lang === "ar" ? "marquee-rtl" : ""}`}
        style={{ width: "max-content" }}
      >
        {looped.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-8">
            <span className="font-display text-lg sm:text-2xl text-foreground/80">{item}</span>
            <span className="text-lg sm:text-2xl text-[oklch(0.42_0.2_255)]">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
