import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useMotionValue, animate, useReducedMotion, type MotionValue } from "framer-motion";
import { useSiteData } from "./SiteDataProvider";
import { HomePage } from "./HomePage";
import { CommentsPage } from "./CommentsPage";
import { Navbar } from "./Navbar";

/**
 * Pager — WhatsApp-style tabbed surface holding `/` and `/comments`.
 *
 * Architecture (the part that fixes the "pages overlap / endless scroll" bug):
 *  - The Pager itself is a `fixed inset-0 overflow-hidden` stage. The document
 *    body never scrolls; only each page's own container does.
 *  - Each page lives inside its own `overflow-y-auto overscroll-contain`
 *    container. Their scroll positions are completely independent.
 *  - The horizontal track translates via `translate3d(x, 0, 0)` only — no
 *    scale, blur, parallax, or perspective. Pure GPU compositor work.
 *
 * Motion language (matches WhatsApp / iOS tab feel):
 *  - tween easing `cubic-bezier(0.32, 0.72, 0, 1)` (the iOS standard curve).
 *  - 260 ms for taps, ≤ 220 ms for finishing a swipe (velocity-aware).
 *  - subtle opacity dim of the outgoing page (1 → 0.55) — quiet, not flashy.
 *  - light edge resistance instead of bouncy rubber-band.
 *
 * Cross-component sync:
 *  - The motion value `idxMV` is mirrored onto `<html>` as a CSS variable
 *    `--pager-idx` (range 0..1). Navbar reads this to glide the pill
 *    indicator perfectly in sync with the page motion (drag or tap).
 *  - A custom event `pager:scroll` is dispatched from the active page so
 *    Navbar can know whether the active page is scrolled (for its blur).
 */

const PAGES = ["/", "/comments"] as const;
type PagePath = (typeof PAGES)[number];

type Sample = { x: number; t: number };

// iOS / WhatsApp standard easing.
const EASE_OUT: [number, number, number, number] = [0.32, 0.72, 0, 1];

// One shared motion value module-scoped so any component (Navbar) can read
// the live pager position without prop drilling. It's a singleton because
// there's only ever one pager mounted at a time.
let sharedIdxMV: MotionValue<number> | null = null;

export function getPagerIndexMV(): MotionValue<number> | null {
  return sharedIdxMV;
}

export function navigateToPagerIndex(idx: 0 | 1) {
  // Dispatched by Navbar tabs so Pager can run the animation through its
  // own engine (keeps motion source single).
  window.dispatchEvent(new CustomEvent("pager:goto", { detail: { idx } }));
}

export function Pager() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const reduceMotion = useReducedMotion();

  const activeIdx: 0 | 1 = location.pathname === "/comments" ? 1 : 0;

  const trackRef = useRef<HTMLDivElement>(null);
  const homeScrollerRef = useRef<HTMLDivElement>(null);
  const commentsScrollerRef = useRef<HTMLDivElement>(null);
  const homePageWrapRef = useRef<HTMLDivElement>(null);
  const commentsPageWrapRef = useRef<HTMLDivElement>(null);

  // Per-page vertical scroll memory — independent of window scroll.
  const scrollMemory = useRef<Record<PagePath, number>>({ "/": 0, "/comments": 0 });

  const idxMV = useMotionValue<number>(activeIdx);

  // Publish the motion value as a singleton + as a CSS variable on <html>.
  useLayoutEffect(() => {
    sharedIdxMV = idxMV;
    return () => {
      if (sharedIdxMV === idxMV) sharedIdxMV = null;
    };
  }, [idxMV]);

  const widthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 0);

  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startIdx = useRef<number>(activeIdx);
  const samples = useRef<Sample[]>([]);
  const active = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);
  const pointerId = useRef<number | null>(null);
  const rafPending = useRef<number | null>(null);
  const lastEventX = useRef(0);

  // Apply translation + subtle opacity dim. Compositor-only.
  useLayoutEffect(() => {
    const apply = (i: number) => {
      const w = widthRef.current || window.innerWidth || 1;
      const tx = -i * w; // LTR: page 1 lives to the right; track moves left to reveal it.
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${tx}px, 0, 0)`;
      }
      // Mirror as CSS variable for any component that wants to react in sync.
      document.documentElement.style.setProperty("--pager-idx", i.toFixed(4));

      // Subtle outgoing-page dim. Distance from this page being centered.
      const dHome = Math.min(1, Math.max(0, Math.abs(i)));
      const dComm = Math.min(1, Math.max(0, Math.abs(1 - i)));
      if (homePageWrapRef.current) {
        homePageWrapRef.current.style.opacity = String(1 - dHome * 0.45);
      }
      if (commentsPageWrapRef.current) {
        commentsPageWrapRef.current.style.opacity = String(1 - dComm * 0.45);
      }
    };
    apply(idxMV.get());
    const unsub = idxMV.on("change", apply);
    const onResize = () => {
      widthRef.current = window.innerWidth;
      apply(idxMV.get());
    };
    window.addEventListener("resize", onResize, { passive: true });
    widthRef.current = window.innerWidth;
    apply(idxMV.get());
    return () => {
      unsub();
      window.removeEventListener("resize", onResize);
    };
  }, [idxMV]);

  // Save scroll for the currently-active page on every scroll tick + emit
  // a `pager:scroll` event (Navbar listens to set its blurred state).
  useEffect(() => {
    const home = homeScrollerRef.current;
    const comm = commentsScrollerRef.current;
    if (!home || !comm) return;

    const dispatchActiveScroll = (top: number) => {
      window.dispatchEvent(new CustomEvent("pager:scroll", { detail: { top } }));
    };

    const onHomeScroll = () => {
      scrollMemory.current["/"] = home.scrollTop;
      if (Math.round(idxMV.get()) === 0) dispatchActiveScroll(home.scrollTop);
    };
    const onCommScroll = () => {
      scrollMemory.current["/comments"] = comm.scrollTop;
      if (Math.round(idxMV.get()) === 1) dispatchActiveScroll(comm.scrollTop);
    };
    home.addEventListener("scroll", onHomeScroll, { passive: true });
    comm.addEventListener("scroll", onCommScroll, { passive: true });
    // Emit initial state.
    dispatchActiveScroll(activeIdx === 0 ? home.scrollTop : comm.scrollTop);
    return () => {
      home.removeEventListener("scroll", onHomeScroll);
      comm.removeEventListener("scroll", onCommScroll);
    };
  }, [activeIdx, idxMV]);

  // After settling on a new page, restore that page's scroll position and
  // emit a scroll event so Navbar updates blur immediately.
  const restoreScroll = useCallback((idx: 0 | 1) => {
    const path = idx === 0 ? "/" : "/comments";
    const target = idx === 0 ? homeScrollerRef.current : commentsScrollerRef.current;
    const y = scrollMemory.current[path] ?? 0;
    if (target) target.scrollTop = y;
    window.dispatchEvent(new CustomEvent("pager:scroll", { detail: { top: y } }));
  }, []);

  // Sync URL silently — no remount, no router round-trip.
  const setUrlSilently = useCallback((idx: 0 | 1) => {
    const target = idx === 0 ? "/" : "/comments";
    if (window.location.pathname === target) return;
    window.history.replaceState({}, "", target);
    navigate({ to: target, replace: true, resetScroll: false }).catch(() => { /* no-op */ });
  }, [navigate]);

  // Tween animation engine — same curve everywhere.
  const tweenTo = useCallback((target: number, duration: number, onDone?: () => void) => {
    return animate(idxMV, target, {
      duration,
      ease: EASE_OUT,
      onComplete: onDone,
    });
  }, [idxMV]);

  // Public goto used by Navbar tabs and keyboard.
  const goto = useCallback((next: 0 | 1, opts?: { immediate?: boolean }) => {
    const cur = Math.round(idxMV.get()) as 0 | 1;
    if (cur === next && Math.abs(idxMV.get() - next) < 0.001) return;
    if (opts?.immediate || reduceMotion) {
      idxMV.set(next);
      setUrlSilently(next);
      requestAnimationFrame(() => restoreScroll(next));
      return;
    }
    tweenTo(next, 0.26, () => {
      setUrlSilently(next);
      requestAnimationFrame(() => restoreScroll(next));
    });
  }, [idxMV, reduceMotion, restoreScroll, setUrlSilently, tweenTo]);

  // Listen for goto requests from Navbar tabs.
  useEffect(() => {
    const onGoto = (e: Event) => {
      const ce = e as CustomEvent<{ idx: 0 | 1 }>;
      goto(ce.detail.idx);
    };
    window.addEventListener("pager:goto", onGoto);
    return () => window.removeEventListener("pager:goto", onGoto);
  }, [goto]);

  // Sync motion value when URL changes from outside (Link navigation, back/forward).
  useEffect(() => {
    const cur = idxMV.get();
    if (Math.abs(cur - activeIdx) > 0.001) {
      tweenTo(activeIdx, 0.26, () => restoreScroll(activeIdx));
    }
  }, [activeIdx, idxMV, restoreScroll, tweenTo]);

  // Velocity over last ~70 ms (px / ms in screen coords).
  const computeVelocity = useCallback(() => {
    const now = performance.now();
    const arr = samples.current;
    let i = arr.length - 1;
    while (i > 0 && now - arr[i - 1].t < 70) i--;
    if (arr.length < 2 || i >= arr.length - 1) return 0;
    const a = arr[i];
    const b = arr[arr.length - 1];
    const dt = Math.max(1, b.t - a.t);
    return (b.x - a.x) / dt;
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

  // Pointer-driven swipe.
  useEffect(() => {
    if (!showComments || reduceMotion) return;

    const COMMIT_FRACTION = 0.18;
    const FLICK_VEL = 0.35; // px / ms
    const MIN_DEAD_ZONE = 8;

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
      if (isInteractive(e.target)) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      lastEventX.current = e.clientX;
      startIdx.current = idxMV.get();
      samples.current = [{ x: e.clientX, t: performance.now() }];
      active.current = true;
      locked.current = null;
      pointerId.current = e.pointerId;
      widthRef.current = window.innerWidth;
    };

    const flush = () => {
      rafPending.current = null;
      if (!active.current || locked.current !== "h") return;
      const dx = lastEventX.current - startX.current;
      const w = widthRef.current || 1;
      let next = startIdx.current - dx / w;
      // Light edge resistance (≈ 14% of remaining distance, no spring).
      if (next < 0) next = next * 0.18;
      if (next > 1) next = 1 + (next - 1) * 0.18;
      idxMV.set(next);
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        if (Math.abs(dx) < MIN_DEAD_ZONE && Math.abs(dy) < MIN_DEAD_ZONE) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
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
      while (samples.current.length > 2 && now - samples.current[0].t > 140) samples.current.shift();
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
      const rawVel = computeVelocity();
      // Convert finger velocity to index velocity (positive = moving forward).
      const idxVel = -rawVel / w;

      const startedAt = Math.round(startIdx.current) as 0 | 1;
      const projectedDx = startedAt === 0 ? -dx : dx; // forward distance in commit direction
      const flick = Math.abs(rawVel) > FLICK_VEL && (
        startedAt === 0 ? rawVel < 0 : rawVel > 0
      );

      let target: 0 | 1 = startedAt;
      if (flick) {
        target = startedAt === 0 ? 1 : 0;
      } else if (projectedDx > w * COMMIT_FRACTION) {
        target = startedAt === 0 ? 1 : 0;
      } else {
        target = startedAt;
      }

      reset();

      // Duration shortens with velocity for a snappy WhatsApp feel.
      const speed = Math.abs(idxVel);
      const distance = Math.abs(target - idxMV.get());
      const baseDuration = 0.22;
      const duration = Math.max(0.14, Math.min(0.28, baseDuration / (1 + speed * 30) + distance * 0.06));

      tweenTo(target, duration, () => {
        setUrlSilently(target);
        requestAnimationFrame(() => restoreScroll(target));
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
  }, [computeVelocity, idxMV, isInteractive, reduceMotion, restoreScroll, setUrlSilently, showComments, tweenTo]);

  // Keyboard: ←/→ switch tabs.
  useEffect(() => {
    if (!showComments) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const cur = Math.round(idxMV.get()) as 0 | 1;
      const next: 0 | 1 = e.key === "ArrowRight" ? 1 : 0;
      if (next === cur) return;
      e.preventDefault();
      goto(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto, idxMV, showComments]);

  // Lock body scroll while pager is mounted (we own all scrolling now).
  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Pages content (memo to avoid re-renders during drag).
  const homePageEl = useMemo(() => <HomePage />, []);
  const commentsPageEl = useMemo(() => <CommentsPage />, []);

  // If comments are hidden by CMS, render only home — no pager wrapper.
  if (!showComments) {
    return (
      <>
        <Navbar />
        <div className="fixed inset-0 overflow-y-auto overscroll-contain">
          {homePageEl}
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="fixed inset-0 overflow-hidden bg-background">
        <div
          ref={trackRef}
          className="flex h-full w-[200%] will-change-transform"
          style={{ transform: "translate3d(0,0,0)" }}
        >
          {/* Home */}
          <div
            ref={homePageWrapRef}
            className="w-1/2 h-full shrink-0"
            style={{ willChange: "opacity" }}
          >
            <div
              ref={homeScrollerRef}
              className="h-full overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {homePageEl}
            </div>
          </div>
          {/* Comments */}
          <div
            ref={commentsPageWrapRef}
            className="w-1/2 h-full shrink-0"
            style={{ willChange: "opacity" }}
          >
            <div
              ref={commentsScrollerRef}
              className="h-full overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {commentsPageEl}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
