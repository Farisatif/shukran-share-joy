import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Comments } from "@/components/Comments";
import { Reveal } from "@/components/Reveal";
import { useLang } from "@/components/LanguageProvider";
import { navigateToPagerIndex } from "@/components/Pager";

export function CommentsPage() {
  const { t } = useLang();
  const blob1 = useRef<HTMLDivElement>(null);
  const blob2 = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Parallax for the blobs is now driven by the page's own scroll container
  // (the parent supplied by Pager) instead of window scroll.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = rootRef.current;
    if (!el) return;
    // Find nearest ancestor with vertical overflow.
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller) {
      const ox = window.getComputedStyle(scroller).overflowY;
      if (ox === "auto" || ox === "scroll") break;
      scroller = scroller.parentElement;
    }
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const update = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      if (blob1.current) blob1.current.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
      if (blob2.current) blob2.current.style.transform = `translate3d(0, ${y * -0.1}px, 0)`;
      frame = 0;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    target.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    update();
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="min-h-full bg-background text-foreground">
      <section className="pt-32 pb-24 sm:pt-40 sm:pb-32 relative overflow-hidden">
        <div ref={blob1} className="pointer-events-none absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-[oklch(0.85_0.1_240)] opacity-50 blur-3xl animate-blob" />
        <div ref={blob2} className="pointer-events-none absolute bottom-10 right-0 h-[380px] w-[380px] rounded-full bg-[oklch(0.78_0.12_270)] opacity-40 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <Reveal>
            <button
              type="button"
              onClick={() => navigateToPagerIndex(0)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10"
              data-cursor="link"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Back to portfolio", "العودة إلى الصفحة الرئيسية")}
            </button>
          </Reveal>
          <Comments />
        </div>
      </section>
    </div>
  );
}
