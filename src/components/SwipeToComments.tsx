import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

/**
 * SwipeToComments — Native-grade sibling navigation between
 * `/` (home) and `/comments` (chat).
 *
 * Performance / feel engineering:
 *  - Pointer Capture for stable tracking even when finger leaves a child el.
 *  - rAF-coalesced move handler: at most one DOM/style write per frame.
 *  - useMotionValue + CSS variables → compositor-only updates, zero React
 *    re-renders during drag (verified by no setState in the move path).
 *  - Sliding-window velocity tracker (last 80ms) — matches iOS Page Sheet
 *    and WhatsApp release physics; avoids the "stuck at threshold" feel.
 *  - Outgoing page parallax: leaving page moves at 30% of finger travel,
 *    incoming page tracks 100%. This depth cue is the WhatsApp signature.
 *  - Spring tuned for natural settle: stiffness 420 / damping 42.
 *  - Skips re-animating on the destination route via session flag handoff.
 */

type Sample = { x: number; t: number };

export function SwipeToComments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const isRtl = lang === "ar";

  const onComments = location.pathname === "/comments";
  const otherPath = onComments ? "/" : "/comments";

  // Sign that takes you to the OTHER page (commit direction).
  const desiredSign = (() => {
    if (!onComments) return isRtl ? +1 : -1;
    return isRtl ? -1 : +1;
  })();

  // The signed projected travel in commit direction (px, ≥ 0 normally).
  // We expose it as a motion value for compositor-only updates.
  const travel = useMotionValue(0);
  const widthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1);

  const [dragging, setDragging] = useState(false);

  // Pointer / gesture state
  const startX = useRef(0);
  const startY = useRef(0);
  const samples = useRef<Sample[]>([]);
  const active = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);
  const pointerId = useRef<number | null>(null);
  const rafPending = useRef<number | null>(null);
  const lastEventX = useRef(0);

  // Reset whenever route actually changes.
  useEffect(() => {
    travel.set(0);
    setDragging(false);
  }, [location.pathname, travel]);

  useEffect(() => {
    const onResize = () => { widthRef.current = window.innerWidth; };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isInteractive = useCallback((el: EventTarget | null): boolean => {
    if (!(el instanceof Element)) return false;
    let node: Element | null = el;
    while (node && node !== document.body) {
      if (node.hasAttribute("data-no-swipe")) return true;
      const tag = node.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "canvas") return true;
      if ((node as HTMLElement).isContentEditable) return true;
      const style = window.getComputedStyle(node);
      const overflowX = style.overflowX;
      if (
        (overflowX === "auto" || overflowX === "scroll") &&
        (node as HTMLElement).scrollWidth > (node as HTMLElement).clientWidth + 1
      ) return true;
      node = node.parentElement;
    }
    return false;
  }, []);

  // Velocity in px/ms over a sliding window (last 80ms).
  const computeVelocity = useCallback((): number => {
    const now = performance.now();
    const window_ms = 80;
    const arr = samples.current;
    let i = arr.length - 1;
    while (i > 0 && now - arr[i - 1].t < window_ms) i--;
    if (arr.length < 2 || i >= arr.length - 1) return 0;
    const a = arr[i];
    const b = arr[arr.length - 1];
    const dt = Math.max(1, b.t - a.t);
    return (b.x - a.x) / dt; // px/ms (signed in screen coords)
  }, []);

  const springTo = useCallback((target: number, onComplete?: () => void, velocity = 0) => {
    return animate(travel, target, {
      type: "spring",
      stiffness: 420,
      damping: 42,
      mass: 0.85,
      velocity,
      restDelta: 0.4,
      onComplete,
    });
  }, [travel]);

  // Apply transforms via CSS variables on <html>. Compositor-only.
  useEffect(() => {
    const root = document.documentElement;
    const apply = (v: number) => {
      const w = widthRef.current || 1;
      // Outgoing page: parallax (30%), in screen-x direction.
      const pageTx = -desiredSign * v * 0.3;
      // Incoming page: starts off-screen at desiredSign * w (i.e. opposite
      // side from where it slides toward 0). Tracks finger 1:1.
      const previewTx = -desiredSign * (w - v);
      const ratio = Math.min(1, Math.abs(v) / w);
      root.style.setProperty("--swipe-page-x", `${pageTx}px`);
      root.style.setProperty("--swipe-preview-x", `${previewTx}px`);
      root.style.setProperty("--swipe-page-opacity", `${1 - ratio * 0.18}`);
      root.style.setProperty("--swipe-preview-shadow", `${Math.min(0.35, ratio * 0.4)}`);
    };
    apply(travel.get());
    const unsub = travel.on("change", apply);
    return () => {
      unsub();
      root.style.removeProperty("--swipe-page-x");
      root.style.removeProperty("--swipe-preview-x");
      root.style.removeProperty("--swipe-page-opacity");
      root.style.removeProperty("--swipe-preview-shadow");
    };
  }, [travel, desiredSign]);

  useEffect(() => {
    if (!showComments) return;

    const COMMIT_DIST = 0.3;       // 30% of width
    const FLICK_VEL = 0.55;        // px/ms (in commit direction)
    const EDGE_PRIORITY_PX = 28;   // touches that start within 28px of an edge bypass interactive checks

    const reset = () => {
      active.current = false;
      locked.current = null;
      pointerId.current = null;
      samples.current = [];
      if (rafPending.current !== null) {
        cancelAnimationFrame(rafPending.current);
        rafPending.current = null;
      }
      setDragging(false);
    };

    const onStart = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const w = window.innerWidth;
      // Edge swipe gets priority — start regardless of underlying interactive.
      const fromCommitEdge =
        (desiredSign === -1 && e.clientX > w - EDGE_PRIORITY_PX) ||
        (desiredSign === +1 && e.clientX < EDGE_PRIORITY_PX);
      if (!fromCommitEdge && isInteractive(e.target)) return;

      startX.current = e.clientX;
      startY.current = e.clientY;
      lastEventX.current = e.clientX;
      samples.current = [{ x: e.clientX, t: performance.now() }];
      active.current = true;
      locked.current = null;
      pointerId.current = e.pointerId;
      widthRef.current = w;
    };

    const flush = () => {
      rafPending.current = null;
      if (!active.current || locked.current !== "h") return;
      const dx = lastEventX.current - startX.current;
      const projected = dx * desiredSign;
      let next: number;
      if (projected >= 0) {
        next = projected;
      } else {
        // Rubber-band on wrong-way pull.
        next = -Math.tanh(-projected / 220) * 70;
      }
      travel.set(next);
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        // Edge-start gestures are eager-horizontal (lower bar).
        const w = widthRef.current || window.innerWidth;
        const edgeStart =
          (desiredSign === -1 && startX.current > w - 28) ||
          (desiredSign === +1 && startX.current < 28);
        const horizontalWins = edgeStart
          ? Math.abs(dx) > Math.abs(dy) * 0.9
          : Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horizontalWins) {
          locked.current = "h";
          setDragging(true);
          // Capture so we keep getting events even if pointer crosses other els.
          try {
            (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
          } catch { /* no-op */ }
        } else {
          locked.current = "v";
          active.current = false;
          return;
        }
      }

      // Sample for velocity tracker (signed in screen coords).
      const now = performance.now();
      samples.current.push({ x: e.clientX, t: now });
      // Keep last ~150ms.
      while (samples.current.length > 2 && now - samples.current[0].t > 150) {
        samples.current.shift();
      }

      lastEventX.current = e.clientX;
      // Coalesce DOM writes to one per frame.
      if (rafPending.current === null) {
        rafPending.current = requestAnimationFrame(flush);
      }
    };

    const finish = (e?: PointerEvent) => {
      if (locked.current !== "h") {
        reset();
        return;
      }
      // Ensure the last move is applied before measuring.
      if (rafPending.current !== null) {
        cancelAnimationFrame(rafPending.current);
        rafPending.current = null;
        flush();
      }

      const x = e ? e.clientX : lastEventX.current;
      const dx = x - startX.current;
      const projected = dx * desiredSign;
      const w = widthRef.current || window.innerWidth;

      // Velocity in commit direction (px/ms).
      const rawVel = computeVelocity();
      const commitVel = rawVel * desiredSign;

      // Predicted final position with momentum (helps snappy flicks).
      const predicted = projected + commitVel * 90;

      const commit =
        projected >= w * COMMIT_DIST ||
        (commitVel >= FLICK_VEL && projected > 24) ||
        predicted >= w * COMMIT_DIST;

      const handoffVelocity = Math.abs(commitVel); // spring takes |velocity|

      reset();

      if (commit) {
        try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
        // Animate travel to full width, then navigate at the visual peak.
        springTo(w, () => navigate({ to: otherPath }), handoffVelocity);
      } else {
        springTo(0, undefined, -handoffVelocity);
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
  }, [computeVelocity, desiredSign, isInteractive, navigate, otherPath, showComments, springTo, travel]);

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
        try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
        navigate({ to: otherPath });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRtl, navigate, onComments, otherPath, showComments]);

  if (!showComments) return null;

  const handleOnRight = !onComments ? !isRtl : isRtl;
  const edgeClass = handleOnRight ? "right-0" : "left-0";
  const Arrow = handleOnRight ? ChevronLeft : ChevronRight;
  const handleLabel = !onComments ? t("Comments", "التعليقات") : t("Portfolio", "البروفايل");
  const handleIcon = !onComments ? <MessageSquare className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;

  const navOther = () => {
    try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
    navigate({ to: otherPath });
  };

  return (
    <>
      {/* Desktop pill */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={navOther}
        initial={{ opacity: 0, x: handleOnRight ? 16 : -16 }}
        animate={{ opacity: dragging ? 0 : 1, x: 0 }}
        transition={{ opacity: { duration: 0.4, delay: 0.5 } }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 hidden md:flex items-center gap-2 ${handleOnRight ? "rounded-l-full pl-3 pr-2.5" : "rounded-r-full pr-3 pl-2.5"} bg-card/85 backdrop-blur-xl border border-border py-2.5 soft-shadow text-foreground/85 hover:text-foreground hover:bg-card transition-colors group`}
      >
        {handleOnRight ? (
          <>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">{handleIcon}</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{handleLabel}</span>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-x-0.5" />
          </>
        ) : (
          <>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{handleLabel}</span>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">{handleIcon}</span>
          </>
        )}
      </motion.button>

      {/* Mobile thin tab */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={navOther}
        initial={{ opacity: 0 }}
        animate={{ opacity: dragging ? 0 : 0.85 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 md:hidden h-16 w-1.5 ${handleOnRight ? "rounded-l-full" : "rounded-r-full"} bg-primary/70`}
      />

      {/* Live preview surface. Pure CSS-var driven, no React updates per frame. */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="swipe-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[55] pointer-events-none bg-background swipe-preview-layer"
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
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        [data-page-wrapper] {
          transform: translate3d(var(--swipe-page-x, 0px), 0, 0);
          opacity: var(--swipe-page-opacity, 1);
          will-change: transform, opacity;
          backface-visibility: hidden;
        }
        .swipe-preview-layer {
          transform: translate3d(var(--swipe-preview-x, 100%), 0, 0);
          will-change: transform;
          backface-visibility: hidden;
          box-shadow: -16px 0 40px -8px rgba(0,0,0, var(--swipe-preview-shadow, 0));
        }
      `}</style>
    </>
  );
}
