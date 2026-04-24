import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation, useRouter } from "@tanstack/react-router";
import { MessageSquare, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

/**
 * SwipeToComments — Native-grade sibling navigation between
 * `/` (home) and `/comments` (chat).
 *
 * Feel & performance engineering:
 *  - Pointer Capture + rAF-coalesced move → 60fps with zero React re-renders.
 *  - Sliding-window velocity (last 80ms) for accurate flick detection.
 *  - Edge-swipe priority (28px) bypasses interactive children, like iOS.
 *  - Outgoing page parallax (30%) with subtle scale, incoming follows 1:1.
 *  - Predictive route prefetch on touch-start at the active edge.
 *  - Haptic feedback on commit-threshold crossing (vibrate 8ms).
 *  - Critical-damping spring for fast flicks (no terminal jitter).
 *  - prefers-reduced-motion honored: instant nav, no animation.
 *  - Idle hint pulses the edge every 12s to teach the affordance.
 *  - GPU layers (translate3d + backface-visibility) for both surfaces.
 */

type Sample = { x: number; t: number };

export function SwipeToComments() {
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const isRtl = lang === "ar";
  const reduceMotion = useReducedMotion();

  const onComments = location.pathname === "/comments";
  const otherPath = onComments ? "/" : "/comments";

  // Sign that takes you to the OTHER page (commit direction).
  const desiredSign = (() => {
    if (!onComments) return isRtl ? +1 : -1;
    return isRtl ? -1 : +1;
  })();

  const travel = useMotionValue(0); // signed projected travel in commit direction (px)
  const widthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1);

  const [dragging, setDragging] = useState(false);
  const [pulse, setPulse] = useState(false);
  const crossedCommit = useRef(false);

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
    crossedCommit.current = false;
  }, [location.pathname, travel]);

  useEffect(() => {
    const onResize = () => { widthRef.current = window.innerWidth; };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Idle pulse on the edge every 12s while not dragging — teaches affordance.
  useEffect(() => {
    if (!showComments || dragging || reduceMotion) return;
    const id = window.setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1100);
    }, 12000);
    return () => window.clearInterval(id);
  }, [showComments, dragging, reduceMotion]);

  // Prefetch the other route once on mount so navigation is instant.
  useEffect(() => {
    if (!showComments) return;
    router.preloadRoute({ to: otherPath }).catch(() => { /* no-op */ });
  }, [router, otherPath, showComments]);

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

  const haptic = useCallback((ms: number) => {
    try {
      if ("vibrate" in navigator) navigator.vibrate(ms);
    } catch { /* no-op */ }
  }, []);

  // Spring with adaptive damping: critical for fast flicks, bouncy-ish for slow.
  const springTo = useCallback((target: number, onComplete?: () => void, velocity = 0) => {
    const speed = Math.abs(velocity);
    // Higher velocity → tighter damping (no terminal wobble).
    const damping = speed > 1.2 ? 50 : speed > 0.5 ? 46 : 42;
    return animate(travel, target, {
      type: "spring",
      stiffness: 500,
      damping,
      mass: 0.8,
      velocity,
      restDelta: 0.4,
      onComplete,
    });
  }, [travel]);

  // Apply transforms via CSS variables on <html>. Compositor-only, batched.
  useEffect(() => {
    const root = document.documentElement;
    const apply = (v: number) => {
      const w = widthRef.current || 1;
      const ratio = Math.min(1, Math.abs(v) / w);
      // Outgoing page: parallax shift + tiny scale-down for depth.
      const pageTx = -desiredSign * v * 0.28;
      const pageScale = 1 - ratio * 0.04;
      // Incoming: tracks finger 1:1, starts off the commit-side edge.
      const previewTx = -desiredSign * (w - v);
      root.style.setProperty("--swipe-page-x", `${pageTx}px`);
      root.style.setProperty("--swipe-page-scale", `${pageScale}`);
      root.style.setProperty("--swipe-preview-x", `${previewTx}px`);
      root.style.setProperty("--swipe-page-opacity", `${1 - ratio * 0.18}`);
      root.style.setProperty("--swipe-preview-shadow", `${Math.min(0.4, ratio * 0.5)}`);
      root.style.setProperty("--swipe-progress", `${ratio}`);
    };
    apply(travel.get());
    const unsub = travel.on("change", apply);
    return () => {
      unsub();
      root.style.removeProperty("--swipe-page-x");
      root.style.removeProperty("--swipe-page-scale");
      root.style.removeProperty("--swipe-preview-x");
      root.style.removeProperty("--swipe-page-opacity");
      root.style.removeProperty("--swipe-preview-shadow");
      root.style.removeProperty("--swipe-progress");
    };
  }, [travel, desiredSign]);

  useEffect(() => {
    if (!showComments) return;

    const COMMIT_DIST = 0.28;        // 28% of width
    const FLICK_VEL = 0.5;           // px/ms (commit direction)
    const EDGE_PRIORITY_PX = 32;

    const reset = () => {
      active.current = false;
      locked.current = null;
      pointerId.current = null;
      samples.current = [];
      crossedCommit.current = false;
      if (rafPending.current !== null) {
        cancelAnimationFrame(rafPending.current);
        rafPending.current = null;
      }
      setDragging(false);
    };

    const onStart = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const w = window.innerWidth;
      const fromCommitEdge =
        (desiredSign === -1 && e.clientX > w - EDGE_PRIORITY_PX) ||
        (desiredSign === +1 && e.clientX < EDGE_PRIORITY_PX);
      if (!fromCommitEdge && isInteractive(e.target)) return;

      // Predictive prefetch — refresh the warm cache as soon as user touches.
      router.preloadRoute({ to: otherPath }).catch(() => { /* no-op */ });

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
        next = -Math.tanh(-projected / 220) * 70; // rubber-band wrong-way
      }
      travel.set(next);

      // Haptic on first crossing of the commit threshold.
      const w = widthRef.current || 1;
      const past = next >= w * COMMIT_DIST;
      if (past && !crossedCommit.current) {
        crossedCommit.current = true;
        haptic(8);
      } else if (!past && crossedCommit.current) {
        crossedCommit.current = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const w = widthRef.current || window.innerWidth;
        const edgeStart =
          (desiredSign === -1 && startX.current > w - EDGE_PRIORITY_PX) ||
          (desiredSign === +1 && startX.current < EDGE_PRIORITY_PX);
        const horizontalWins = edgeStart
          ? Math.abs(dx) > Math.abs(dy) * 0.85
          : Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horizontalWins) {
          locked.current = "h";
          setDragging(true);
          try { (e.target as Element | null)?.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
        } else {
          locked.current = "v";
          active.current = false;
          return;
        }
      }

      const now = performance.now();
      samples.current.push({ x: e.clientX, t: now });
      while (samples.current.length > 2 && now - samples.current[0].t > 150) {
        samples.current.shift();
      }

      lastEventX.current = e.clientX;
      if (rafPending.current === null) {
        rafPending.current = requestAnimationFrame(flush);
      }
    };

    const finish = (e?: PointerEvent) => {
      if (locked.current !== "h") {
        reset();
        return;
      }
      if (rafPending.current !== null) {
        cancelAnimationFrame(rafPending.current);
        rafPending.current = null;
        flush();
      }

      const x = e ? e.clientX : lastEventX.current;
      const dx = x - startX.current;
      const projected = dx * desiredSign;
      const w = widthRef.current || window.innerWidth;

      const rawVel = computeVelocity();
      const commitVel = rawVel * desiredSign;
      const predicted = projected + commitVel * 100;

      const commit =
        projected >= w * COMMIT_DIST ||
        (commitVel >= FLICK_VEL && projected > 20) ||
        predicted >= w * COMMIT_DIST;

      const handoffVelocity = Math.abs(commitVel);
      reset();

      if (commit) {
        try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
        haptic(12);
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
  }, [computeVelocity, desiredSign, haptic, isInteractive, navigate, otherPath, router, showComments, springTo, travel]);

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
  const previewIcon = !onComments
    ? <MessageSquare className="h-7 w-7" />
    : (isRtl ? <ArrowRight className="h-7 w-7" /> : <ArrowLeft className="h-7 w-7" />);
  const previewTitle = !onComments
    ? t("Guestbook", "دفتر الزوار")
    : t("Back to portfolio", "العودة إلى البروفايل");
  const previewSub = !onComments
    ? t("Leave a note · Real-time", "اترك رسالة · مباشر")
    : t("Fares Ahmed · Engineer", "فارس أحمد · مهندس");

  const navOther = () => {
    try { sessionStorage.setItem("swipe-skip-incoming", "1"); } catch { /* no-op */ }
    navigate({ to: otherPath });
  };

  // Reduced motion: replace swipe with simple fade-on-click only.
  if (reduceMotion) {
    return (
      <button
        type="button"
        aria-label={handleLabel}
        onClick={navOther}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 flex items-center gap-2 ${handleOnRight ? "rounded-l-full pl-3 pr-2.5" : "rounded-r-full pr-3 pl-2.5"} bg-card border border-border py-2.5 soft-shadow text-foreground`}
      >
        {handleIcon}
        <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{handleLabel}</span>
      </button>
    );
  }

  return (
    <>
      {/* Desktop pill */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={navOther}
        initial={{ opacity: 0, x: handleOnRight ? 16 : -16 }}
        animate={{
          opacity: dragging ? 0 : 1,
          x: 0,
          scale: pulse ? 1.06 : 1,
        }}
        transition={{
          opacity: { duration: 0.4, delay: 0.5 },
          scale: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        }}
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

      {/* Mobile thin tab — pulses to teach affordance */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={navOther}
        initial={{ opacity: 0 }}
        animate={{
          opacity: dragging ? 0 : pulse ? 1 : 0.85,
          scaleY: pulse ? 1.4 : 1,
        }}
        transition={{
          opacity: { duration: 0.4, delay: 0.5 },
          scaleY: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 md:hidden h-16 w-1.5 ${handleOnRight ? "rounded-l-full" : "rounded-r-full"} bg-primary/70`}
      />

      {/* Live preview surface — shows a real preview of the destination */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="swipe-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="fixed inset-0 z-[55] pointer-events-none bg-background swipe-preview-layer overflow-hidden"
            aria-hidden
          >
            {/* Faux navbar to mimic destination chrome */}
            <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between border-b border-border/50 backdrop-blur-xl bg-card/40">
              <div className="h-3 w-24 rounded-full bg-foreground/15" />
              <div className="h-3 w-12 rounded-full bg-foreground/10" />
            </div>

            {/* Hero preview */}
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <div className="flex flex-col items-center gap-4 select-none text-center">
                <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/25 text-primary">
                  {previewIcon}
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-display text-2xl tracking-tight text-foreground">{previewTitle}</span>
                  <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{previewSub}</span>
                </div>
                <div
                  className="mt-2 h-1 w-24 rounded-full bg-primary/20 overflow-hidden"
                  style={{ opacity: 0.6 }}
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `calc(var(--swipe-progress, 0) * 100%)`, transition: "width 60ms linear" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        [data-page-wrapper] {
          transform: translate3d(var(--swipe-page-x, 0px), 0, 0) scale(var(--swipe-page-scale, 1));
          transform-origin: center center;
          opacity: var(--swipe-page-opacity, 1);
          will-change: transform, opacity;
          backface-visibility: hidden;
        }
        .swipe-preview-layer {
          transform: translate3d(var(--swipe-preview-x, 100%), 0, 0);
          will-change: transform;
          backface-visibility: hidden;
          box-shadow: -16px 0 50px -10px rgba(0,0,0, var(--swipe-preview-shadow, 0));
        }
      `}</style>
    </>
  );
}
