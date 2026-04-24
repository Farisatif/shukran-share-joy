import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Comments } from "@/components/Comments";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { useEffect, useRef } from "react";
import { useLang } from "@/components/LanguageProvider";

export const Route = createFileRoute("/comments")({
  head: () => ({
    meta: [
      { title: "Guestbook — Fares Ahmed" },
      {
        name: "description",
        content:
          "Leave a comment for Fares Ahmed. A real-time guestbook for visitors to share notes, feedback, and questions.",
      },
      { property: "og:title", content: "Guestbook — Fares Ahmed" },
      {
        property: "og:description",
        content: "Real-time guestbook — drop a note, a kind word, or a question.",
      },
    ],
  }),
  component: CommentsPage,
});

function CommentsPage() {
  const { t } = useLang();
  const blob1 = useRef<HTMLDivElement>(null);
  const blob2 = useRef<HTMLDivElement>(null);

  // Subtle parallax on hero blobs (rAF-batched scroll listener).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      const y = window.scrollY;
      if (blob1.current) blob1.current.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
      if (blob2.current) blob2.current.style.transform = `translate3d(0, ${y * -0.1}px, 0)`;
      frame = 0;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="pt-32 pb-24 sm:pt-40 sm:pb-32 relative overflow-hidden">
        <div ref={blob1} className="pointer-events-none absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-[oklch(0.85_0.1_240)] opacity-50 blur-3xl animate-blob" />
        <div ref={blob2} className="pointer-events-none absolute bottom-10 right-0 h-[380px] w-[380px] rounded-full bg-[oklch(0.78_0.12_270)] opacity-40 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <Reveal>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10"
              data-cursor="link"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Back to portfolio", "العودة إلى الصفحة الرئيسية")}
            </Link>
          </Reveal>
          <Comments />
        </div>
      </section>
    </div>
  );
}
