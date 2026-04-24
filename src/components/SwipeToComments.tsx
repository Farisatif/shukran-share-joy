import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

/**
 * SwipeToComments — WhatsApp-grade sibling navigation between
 * `/` (home) and `/comments` (chat).
 *
 * Engineering goals (matching native messenger feel):
 *  1. The page tracks the finger 1:1, in real time, with zero render churn —
 *     we use framer-motion's `useMotionValue` so the transform updates on
 *     the compositor without React re-renders.
 *  2. Direction lock is strict: vertical scroll always wins until horizontal
 *     dominance is unambiguous (12px and >1.4× vertical).
 *  3. Release physics: distance OR velocity commits navigation. On release we
 *     animate the page the rest of the way (or back) with a tuned spring
 *     (stiffness 380 / damping 38) — that's the WhatsApp signature feel.
 *  4. We never animate twice — when committed, we hand off the final slide
 *     to <PageTransition> by setting a "skip-incoming-anim" flag for the
 *     other route's first frame. Result: zero double-animation jank.
 *  5. Edge handle / mobile tab remains as discoverable affordance.
 *  6. Keyboard arrows still work (mirrored in RTL).
 */

export type SwipeProgress = {
  /** Signed -1..1 where positive means "moving toward the other page". */
  value: number;
  /** Direction sign that takes you to the other page (+1 or -1). */
  desiredSign: number;
  /** Whether a drag is currently in progress. */
  active: boolean;
};

export function SwipeToComments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const isRtl = lang === "ar";

  const onComments = location.pathname === "/comments";
  const otherPath = onComments ? "/" : "/comments";

  // Direction sign that takes you to the OTHER page.
  // LTR + on /  → swipe LEFT  (negative dx)  → /comments  (sign = -1)
  // LTR + on /comments → swipe RIGHT (positive dx) → /     (sign = +1)
  const desiredSign = (() => {
    if (!onComments) return isRtl ? +1 : -1;
    return isRtl ? -1 : +1;
  })();

  // The signed translation in px applied to the current page during drag.
  // Positive sign always means "moving in the commit direction".
  const drag = useMotionValue(0);
  const widthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1);

  // Visual transforms derived from drag — no React re-renders.
  // The current page slides off-screen as the user drags toward commit.
  const pageX = useTransform(drag, (v) => `${v}px`);
  // The "next page preview" slides in from the opposite edge.
  const previewX = useTransform(drag, (v) => {
    const w = widthRef.current || 1;
    // Start fully off-screen on the opposite side, slide to 0.
    const off = -desiredSign * w;
    return `${off + v}px`;
  });
  // Subtle dimming of the leaving page for depth.
  const pageOpacity = useTransform(drag, (v) => {
    const w = widthRef.current || 1;
    const ratio = Math.min(1, Math.abs(v) / w);
    return 1 - ratio * 0.25;
  });

  const [dragging, setDragging] = useState(false);

  // Pointer state.
  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const active = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);

  // Reset drag whenever the route actually changes (after commit/cancel).
  useEffect(() => {
    drag.set(0);
    setDragging(false);
  }, [location.pathname, drag]);

  // Track viewport size changes.
  useEffect(() => {
    const onResize = () => {
      widthRef.current = window.innerWidth;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isInteractive = useCallback((el: EventTarget | null): boolean => {
    if (!(el instanceof Element)) return false;
    let node: Element | null = el;
    while (node && node !== document.body) {
      if (node.hasAttribute("data-no-swipe")) return true;
      const tag = node.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "canvas") {
        return true;
      }
      if ((node as HTMLElement).isContentEditable) return true;
      // Horizontally scrollable container — let it own horizontal gestures.
      const style = window.getComputedStyle(node);
      const overflowX = style.overflowX;
      if (
        (overflowX === "auto" || overflowX === "scroll") &&
        (node as HTMLElement).scrollWidth > (node as HTMLElement).clientWidth + 1
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }, []);

  // Spring used for both "snap back" and "complete commit". WhatsApp-tuned.
  const springTo = useCallback(
    (target: number, onComplete?: () => void) => {
      const controls = animate(drag, target, {
        type: "spring",
        stiffness: 380,
        damping: 38,
        mass: 0.9,
        velocity: 0, // velocity is added by gesture release if needed
        restDelta: 0.5,
        onComplete,
      });
      return controls;
    },
    [drag],
  );

  // Pointer-driven swipe with motion values (no setState in the hot path).
  useEffect(() => {
    if (!showComments) return;

    const COMMIT_DIST = 0.28; // 28% of width
    const FLICK_VEL = 0.6; // px/ms

    const reset = () => {
      active.current = false;
      locked.current = null;
      setDragging(false);
    };

    const onStart = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      lastX.current = e.clientX;
      lastT.current = performance.now();
      startT.current = lastT.current;
      active.current = true;
      locked.current = null;
      widthRef.current = window.innerWidth;
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.4) {
          locked.current = "h";
          setDragging(true);
        } else {
          locked.current = "v";
          active.current = false;
          return;
        }
      }

      // Project onto desired direction; mild rubber-band on the wrong way.
      const projected = dx * desiredSign;
      let translate: number;
      if (projected >= 0) {
        translate = -desiredSign * projected; // page slides off-screen
      } else {
        // Wrong-way pull: rubber band, capped.
        const resist = Math.tanh(-projected / 200) * 60;
        translate = desiredSign * resist;
      }
      drag.set(translate);

      lastX.current = e.clientX;
      lastT.current = performance.now();
    };

    const finish = (e?: PointerEvent) => {
      if (locked.current !== "h") {
        reset();
        return;
      }
      const x = e ? e.clientX : lastX.current;
      const dx = x - startX.current;
      const projected = dx * desiredSign;
      const w = widthRef.current || window.innerWidth;

      // Velocity from the last few ms of movement.
      const dt = Math.max(1, performance.now() - startT.current);
      const vel = (projected / dt); // px/ms in commit direction

      const commit =
        projected >= w * COMMIT_DIST || (vel >= FLICK_VEL && projected > 30);

      reset();

      if (commit) {
        // Slide the rest of the way out, then navigate. The new route's
        // PageTransition will start at offset 0 (already in place visually).
        const target = -desiredSign * w;
        // Mark so PageTransition skips the incoming animation once.
        try {
          sessionStorage.setItem("swipe-skip-incoming", "1");
        } catch {
          /* no-op */
        }
        springTo(target, () => {
          navigate({ to: otherPath });
        });
      } else {
        // Snap back to origin.
        springTo(0);
      }
    };

    window.addEventListener("pointerdown", onStart, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", finish, { passive: true });
    window.addEventListener("pointercancel", () => finish(), { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onStart);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
    };
  }, [desiredSign, drag, isInteractive, navigate, otherPath, showComments, springTo]);

  // Keyboard arrows (mirrored in RTL).
  useEffect(() => {
    if (!showComments) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const wantsOther = onComments
        ? (isRtl ? e.key === "ArrowLeft" : e.key === "ArrowRight")
        : (isRtl ? e.key === "ArrowRight" : e.key === "ArrowLeft");
      if (wantsOther) {
        e.preventDefault();
        try {
          sessionStorage.setItem("swipe-skip-incoming", "1");
        } catch {
          /* no-op */
        }
        navigate({ to: otherPath });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRtl, navigate, onComments, otherPath, showComments]);

  // Apply live transform to the page wrapper rendered by PageTransition.
  // We do this by writing CSS variables on <html> so the wrapper can react.
  useEffect(() => {
    const root = document.documentElement;
    const unsub = drag.on("change", (v) => {
      root.style.setProperty("--swipe-x", `${v}px`);
      const w = widthRef.current || 1;
      const off = -desiredSign * w;
      root.style.setProperty("--swipe-preview-x", `${off + v}px`);
      const ratio = Math.min(1, Math.abs(v) / w);
      root.style.setProperty("--swipe-page-opacity", `${1 - ratio * 0.25}`);
    });
    return () => {
      unsub();
      root.style.removeProperty("--swipe-x");
      root.style.removeProperty("--swipe-preview-x");
      root.style.removeProperty("--swipe-page-opacity");
    };
  }, [drag, desiredSign]);

  if (!showComments) return null;

  const handleOnRight = !onComments ? !isRtl : isRtl;
  const edgeClass = handleOnRight ? "right-0" : "left-0";
  const Arrow = handleOnRight ? ChevronLeft : ChevronRight;
  const handleLabel = !onComments ? t("Comments", "التعليقات") : t("Portfolio", "البروفايل");
  const handleIcon = !onComments ? <MessageSquare className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;

  return (
    <>
      {/* Desktop edge pill — discoverable affordance */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={() => {
          try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
          navigate({ to: otherPath });
        }}
        initial={{ opacity: 0, x: handleOnRight ? 16 : -16 }}
        animate={{ opacity: dragging ? 0 : 1, x: 0 }}
        transition={{ opacity: { duration: 0.4, delay: 0.5 } }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 hidden md:flex items-center gap-2 ${handleOnRight ? "rounded-l-full pl-3 pr-2.5" : "rounded-r-full pr-3 pl-2.5"} bg-card/85 backdrop-blur-xl border border-border py-2.5 soft-shadow text-foreground/85 hover:text-foreground hover:bg-card transition-colors group`}
      >
        {handleOnRight ? (
          <>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              {handleIcon}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{handleLabel}</span>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-x-0.5" />
          </>
        ) : (
          <>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{handleLabel}</span>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              {handleIcon}
            </span>
          </>
        )}
      </motion.button>

      {/* Mobile thin edge tab */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={() => {
          try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
          navigate({ to: otherPath });
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: dragging ? 0 : 0.85 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 md:hidden h-16 w-1.5 ${handleOnRight ? "rounded-l-full" : "rounded-r-full"} bg-primary/70`}
      />

      {/* Live preview surface that follows the finger. Rendered as a fixed
          overlay so we don't need to mount the whole other route. */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="swipe-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ x: previewX }}
            className="fixed inset-0 z-[55] pointer-events-none bg-background"
            aria-hidden
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 select-none text-foreground/80">
                <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25 text-primary">
                  {!onComments ? <MessageSquare className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </div>
                <span className="font-display text-lg tracking-tight">{handleLabel}</span>
                <span className="text-[11px] uppercase tracking-[0.25em] opacity-60">
                  {t("Release to open", "أفلت للفتح")}
                </span>
              </div>
            </div>
            {/* Soft shadow on the trailing edge for depth */}
            <div
              className={`pointer-events-none absolute top-0 bottom-0 w-8 ${handleOnRight ? "right-full" : "left-full"}`}
              style={{
                background: handleOnRight
                  ? "linear-gradient(to left, color-mix(in oklab, black 18%, transparent), transparent)"
                  : "linear-gradient(to right, color-mix(in oklab, black 18%, transparent), transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live transform applied to the current page wrapper via CSS var. */}
      <style>{`
        [data-page-wrapper] {
          transform: translate3d(var(--swipe-x, 0px), 0, 0);
          opacity: var(--swipe-page-opacity, 1);
          will-change: transform, opacity;
        }
      `}</style>

      {/* Page-level placeholder so motion-value-derived states are also
          available to consumers if needed. */}
      <motion.div style={{ x: pageX, opacity: pageOpacity }} className="hidden" aria-hidden />
    </>
  );
}
