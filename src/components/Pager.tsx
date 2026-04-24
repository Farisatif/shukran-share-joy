import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, Link } from "@tanstack/react-router";
import { useMotionValue, animate, motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";
import { HomePage } from "./HomePage";
import { CommentsPage } from "./CommentsPage";

/**
 * Pager — both /  and /comments are mounted side-by-side at all times in a
 * single horizontal track. Swiping translates the track. There is no route
 * navigation, no remount, no fetching — switching pages is purely visual.
 *
 * - The URL is updated silently (history.replaceState) after the page settles
 *   so deep links and shares work, but no router round-trip happens.
 * - Each page keeps its own vertical scroll position via a saved scrollTop.
 * - Page order in LTR: [Home (0), Comments (1)]. RTL flips visually only via
 *   the desiredSign math; the DOM order is kept stable so refs/state survive.
 */

const PAGES = ["/", "/comments"] as const;
type PagePath = (typeof PAGES)[number];

type Sample = { x: number; t: number };

export function Pager() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const isRtl = lang === "ar";
  const reduceMotion = useReducedMotion();

  // Active index derived from URL (only changes when URL truly changes).
  const activeIdx: 0 | 1 = location.pathname === "/comments" ? 1 : 0;

  // If comments are disabled by CMS, render only the home page (no pager).
  // Hooks below must still run unconditionally — guarded by `showComments`.
  const trackRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Saved vertical scroll for each page.
  const scrollMemory = useRef<Record<PagePath, number>>({ "/": 0, "/comments": 0 });

  // Motion value: index (0..1) of the visible page.
  const idxMV = useMotionValue<number>(activeIdx);

  // Track width = window.innerWidth.
  const widthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 0);

  // Drag state.
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startIdx = useRef(activeIdx as number);
  const samples = useRef<Sample[]>([]);
  const active = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);
  const pointerId = useRef<number | null>(null);
  const rafPending = useRef<number | null>(null);
  const lastEventX = useRef(0);

  // Sync motion value to active index when URL changes from outside (links).
  useEffect(() => {
    const current = idxMV.get();
    if (Math.abs(current - activeIdx) > 0.001) {
      animate(idxMV, activeIdx, {
        type: "spring",
        stiffness: 500,
        damping: 44,
        mass: 0.85,
        restDelta: 0.001,
      });
    }
  }, [activeIdx, idxMV]);

  // Apply translation via CSS variable on the track. Compositor-only.
  useLayoutEffect(() => {
    const apply = (i: number) => {
      const w = widthRef.current || window.innerWidth;
      // In RTL we visually mirror by translating the OPPOSITE direction.
      const sign = isRtl ? +1 : -1;
      const tx = sign * i * w;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${tx}px, 0, 0)`;
      }
    };
    apply(idxMV.get());
    const unsub = idxMV.on("change", apply);
    return () => unsub();
  }, [idxMV, isRtl]);

  // Save / restore vertical scroll per page.
  // When the user lands on the page (via swipe end or URL change), restore.
  // While they scroll, save continuously for the active page.
  useEffect(() => {
    const onScroll = () => {
      const path = activeIdx === 0 ? "/" : "/comments";
      scrollMemory.current[path] = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeIdx]);

  const restoreScroll = useCallback((idx: 0 | 1) => {
    const path = idx === 0 ? "/" : "/comments";
    const y = scrollMemory.current[path] ?? 0;
    window.scrollTo({ top: y, left: 0, behavior: "auto" });
  }, []);

  // On URL change from outside (link click), restore that page's scroll.
  useEffect(() => {
    if (!dragging) {
      requestAnimationFrame(() => restoreScroll(activeIdx));
    }
  }, [activeIdx, dragging, restoreScroll]);

  // Update the URL silently after settle (no router navigation).
  const setUrlSilently = useCallback((idx: 0 | 1) => {
    const target = idx === 0 ? "/" : "/comments";
    if (window.location.pathname === target) return;
    window.history.replaceState({}, "", target);
    // Notify TanStack router so its location state matches the URL.
    // This avoids a re-mount because the URL was changed via replaceState.
    navigate({ to: target, replace: true, resetScroll: false }).catch(() => { /* no-op */ });
  }, [navigate]);

  // Velocity over last 80ms.
  const computeVelocity = useCallback(() => {
    const now = performance.now();
    const arr = samples.current;
    let i = arr.length - 1;
    while (i > 0 && now - arr[i - 1].t < 80) i--;
    if (arr.length < 2 || i >= arr.length - 1) return 0;
    const a = arr[i];
    const b = arr[arr.length - 1];
    const dt = Math.max(1, b.t - a.t);
    return (b.x - a.x) / dt; // px/ms (signed in screen coords)
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
      const ox = style.overflowX;
      if ((ox === "auto" || ox === "scroll") && (node as HTMLElement).scrollWidth > (node as HTMLElement).clientWidth + 1) return true;
      node = node.parentElement;
    }
    return false;
  }, []);

  const haptic = (ms: number) => {
    try { if ("vibrate" in navigator) navigator.vibrate(ms); } catch { /* no-op */ }
  };

  // Pointer-driven swipe.
  useEffect(() => {
    if (!showComments || reduceMotion) return;

    const COMMIT_FRACTION = 0.25; // 25% of width to commit
    const FLICK_VEL = 0.45;       // px/ms
    const EDGE_PRIORITY_PX = 32;

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
      const idx = Math.round(idxMV.get()) as 0 | 1;
      // For commit-direction edge priority:
      const desiredSign = idx === 0 ? (isRtl ? +1 : -1) : (isRtl ? -1 : +1);
      const fromCommitEdge =
        (desiredSign === -1 && e.clientX > w - EDGE_PRIORITY_PX) ||
        (desiredSign === +1 && e.clientX < EDGE_PRIORITY_PX);
      if (!fromCommitEdge && isInteractive(e.target)) return;

      startX.current = e.clientX;
      startY.current = e.clientY;
      lastEventX.current = e.clientX;
      startIdx.current = idxMV.get();
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
      const w = widthRef.current || 1;
      // RTL: dragging RIGHT moves toward higher index. LTR: dragging LEFT moves toward higher index.
      const dragDelta = isRtl ? dx / w : -dx / w;
      let next = startIdx.current + dragDelta;
      // Rubber-band beyond edges.
      if (next < 0) next = -Math.tanh(-next * 1.5) * 0.12;
      if (next > 1) next = 1 + Math.tanh((next - 1) * 1.5) * 0.12;
      idxMV.set(next);
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const w = widthRef.current || window.innerWidth;
        const edgeStart = startX.current < 32 || startX.current > w - 32;
        const horizontalWins = edgeStart
          ? Math.abs(dx) > Math.abs(dy) * 0.85
          : Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horizontalWins) {
          locked.current = "h";
          setDragging(true);
          // Save current page's scroll BEFORE we start dragging.
          const idx = Math.round(startIdx.current) as 0 | 1;
          const path = idx === 0 ? "/" : "/comments";
          scrollMemory.current[path] = window.scrollY;
          try { (e.target as Element | null)?.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
        } else {
          locked.current = "v";
          active.current = false;
          return;
        }
      }

      const now = performance.now();
      samples.current.push({ x: e.clientX, t: now });
      while (samples.current.length > 2 && now - samples.current[0].t > 150) samples.current.shift();
      lastEventX.current = e.clientX;
      if (rafPending.current === null) rafPending.current = requestAnimationFrame(flush);
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
      const w = widthRef.current || window.innerWidth;

      // Convert finger velocity to "index velocity" (units per ms).
      const rawVel = computeVelocity();
      const idxVel = isRtl ? rawVel / w : -rawVel / w;

      const current = idxMV.get();
      const fractional = current - Math.floor(current);
      const startedAt = Math.round(startIdx.current) as 0 | 1;

      // Direction we're moving in based on net dx and rtl.
      const movingForward = (isRtl ? dx > 0 : dx < 0); // toward higher index
      // Predicted final index using momentum.
      const predicted = current + idxVel * 90;
      const predictedSnap = predicted >= startedAt + COMMIT_FRACTION ? 1
        : predicted <= startedAt - COMMIT_FRACTION ? 0
        : startedAt;

      const flickCommit = Math.abs(idxVel) > FLICK_VEL / w * 1; // normalized flick
      const distCommit = startedAt === 0
        ? fractional >= COMMIT_FRACTION
        : 1 - fractional >= COMMIT_FRACTION;

      let target: 0 | 1;
      if (flickCommit) {
        target = movingForward ? Math.min(1, startedAt + 1) as 0 | 1 : Math.max(0, startedAt - 1) as 0 | 1;
      } else if (distCommit) {
        target = startedAt === 0 ? 1 : 0;
      } else {
        target = predictedSnap as 0 | 1;
      }

      const willCommit = target !== startedAt;
      const handoffVel = idxVel; // signed, in idx/ms

      reset();

      if (willCommit) haptic(10);

      animate(idxMV, target, {
        type: "spring",
        stiffness: 520,
        damping: 46,
        mass: 0.8,
        velocity: handoffVel,
        restDelta: 0.001,
        onComplete: () => {
          // Update URL silently — NO remount.
          setUrlSilently(target);
          // Restore vertical scroll for the new page.
          requestAnimationFrame(() => restoreScroll(target));
        },
      });
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
  }, [computeVelocity, idxMV, isRtl, isInteractive, reduceMotion, restoreScroll, setUrlSilently, showComments]);

  // Keyboard nav.
  useEffect(() => {
    if (!showComments) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = Math.round(idxMV.get()) as 0 | 1;
      const wantsForward = isRtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
      const next: 0 | 1 = wantsForward ? 1 : 0;
      if (next === idx) return;
      e.preventDefault();
      const path = idx === 0 ? "/" : "/comments";
      scrollMemory.current[path] = window.scrollY;
      animate(idxMV, next, {
        type: "spring",
        stiffness: 520,
        damping: 46,
        mass: 0.8,
        restDelta: 0.001,
        onComplete: () => {
          setUrlSilently(next);
          requestAnimationFrame(() => restoreScroll(next));
        },
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idxMV, isRtl, restoreScroll, setUrlSilently, showComments]);

  // If comments are hidden, render just the active page without pager.
  if (!showComments) {
    return activeIdx === 1 ? <CommentsPage /> : <HomePage />;
  }

  // Edge affordance — points to the OTHER page.
  const isOnHome = activeIdx === 0;
  const handleOnRight = isOnHome ? !isRtl : isRtl;
  const edgeClass = handleOnRight ? "right-0" : "left-0";
  const Arrow = handleOnRight ? ChevronLeft : ChevronRight;
  const handleLabel = isOnHome ? t("Comments", "التعليقات") : t("Portfolio", "البروفايل");
  const handleIcon = isOnHome ? <MessageSquare className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;
  const otherPath: PagePath = isOnHome ? "/comments" : "/";

  const navOther = () => {
    const next: 0 | 1 = isOnHome ? 1 : 0;
    const path = isOnHome ? "/" : "/comments";
    scrollMemory.current[path] = window.scrollY;
    animate(idxMV, next, {
      type: "spring",
      stiffness: 520,
      damping: 46,
      mass: 0.8,
      restDelta: 0.001,
      onComplete: () => {
        setUrlSilently(next);
        requestAnimationFrame(() => restoreScroll(next));
      },
    });
  };

  return (
    <>
      {/* The horizontal track — both pages mounted, side-by-side. */}
      <div className="relative w-full overflow-x-clip">
        <div
          ref={trackRef}
          className={`flex w-[200vw] ${isRtl ? "flex-row-reverse" : "flex-row"} will-change-transform`}
          style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
        >
          <div ref={homeRef} className="w-screen shrink-0">
            <HomePage />
          </div>
          <div ref={commentsRef} className="w-screen shrink-0">
            <CommentsPage />
          </div>
        </div>
      </div>

      {/* Desktop edge pill */}
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

      {/* Mobile thin edge tab */}
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

      {/* Hidden anchor for SEO crawlers — real <Link> ensures the route is in the sitemap. */}
      <AnimatePresence>
        {false && <Link to={otherPath} className="sr-only">{handleLabel}</Link>}
      </AnimatePresence>
    </>
  );
}
