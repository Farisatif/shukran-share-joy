import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeLangToggle } from "./ThemeLangToggle";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";
import { getPagerIndexMV, navigateToPagerIndex } from "./Pager";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const nav = data.navigation;
  const showComments = nav?.showComments !== false;
  const contactLabel = lang === "ar"
    ? nav?.contactLabelAr || "تواصل"
    : nav?.contactLabelEn || "Contact";

  // Pager-aware scroll state — listens to the active page's internal scroll.
  useEffect(() => {
    const onPagerScroll = (e: Event) => {
      const ce = e as CustomEvent<{ top: number }>;
      setScrolled((ce.detail?.top ?? 0) > 40);
    };
    window.addEventListener("pager:scroll", onPagerScroll);
    // Fallback: window scroll (for pages outside the pager, e.g. CMS).
    const onWindowScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => {
      window.removeEventListener("pager:scroll", onPagerScroll);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, []);

  // Refs for tab buttons and the moving pill.
  const portfolioRef = useRef<HTMLButtonElement>(null);
  const commentsRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Position the pill indicator from the live pager motion value (range 0..1).
  // Falls back to the URL-based active state if the pager isn't mounted.
  useLayoutEffect(() => {
    if (!showComments) return;
    const pill = pillRef.current;
    const a = portfolioRef.current;
    const b = commentsRef.current;
    const container = tabsContainerRef.current;
    if (!pill || !a || !b || !container) return;

    const apply = (idx: number) => {
      const cRect = container.getBoundingClientRect();
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      // Lerp left + width between the two tabs.
      const clamped = Math.max(0, Math.min(1, idx));
      const left = aRect.left - cRect.left + (bRect.left - aRect.left) * clamped;
      const width = aRect.width + (bRect.width - aRect.width) * clamped;
      pill.style.transform = `translate3d(${left}px, 0, 0)`;
      pill.style.width = `${width}px`;
    };

    const mv = getPagerIndexMV();
    const initial = mv ? mv.get() : (loc.pathname === "/comments" ? 1 : 0);
    apply(initial);

    let unsub: (() => void) | undefined;
    if (mv) unsub = mv.on("change", apply);
    const onResize = () => apply(mv ? mv.get() : (loc.pathname === "/comments" ? 1 : 0));
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      unsub?.();
      window.removeEventListener("resize", onResize);
    };
  }, [showComments, loc.pathname, lang]);

  const onComments = loc.pathname === "/comments";

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3 transition-opacity duration-300 [body.cms-open_&]:opacity-0 [body.cms-open_&]:pointer-events-none"
    >
      <nav
        className={`flex items-center gap-1 rounded-full px-1.5 py-1.5 transition-all ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl soft-shadow border border-border/60"
            : "bg-background/60 backdrop-blur-md border border-border/40"
        }`}
      >
        <Link to="/" className="px-3 py-1.5 font-display text-sm sm:text-base shrink-0">
          Fares.
        </Link>
        {showComments && (
          <>
            <span className="w-px h-5 bg-border mx-0.5" />
            {/* Tabs with sliding pill indicator — synced with Pager motion. */}
            <div
              ref={tabsContainerRef}
              className="relative flex items-center"
              role="tablist"
              aria-label="Sections"
            >
              {/* Pill indicator */}
              <span
                ref={pillRef}
                aria-hidden="true"
                className="absolute top-0 left-0 h-full rounded-full bg-secondary will-change-transform pointer-events-none"
                style={{ transform: "translate3d(0,0,0)", width: 0 }}
              />
              <button
                ref={portfolioRef}
                type="button"
                role="tab"
                aria-selected={!onComments}
                onClick={() => navigateToPagerIndex(0)}
                className={`relative z-10 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
                  !onComments ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("Portfolio", "البروفايل")}
              </button>
              <button
                ref={commentsRef}
                type="button"
                role="tab"
                aria-selected={onComments}
                onClick={() => navigateToPagerIndex(1)}
                className={`relative z-10 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
                  onComments ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("Comments", "التعليقات")}
              </button>
            </div>
          </>
        )}
        <span className="w-px h-5 bg-border mx-0.5" />
        <ThemeLangToggle />
        <Link
          to="/"
          hash="contact"
          className="ml-1 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
        >
          {contactLabel}
        </Link>
      </nav>
    </motion.header>
  );
}
