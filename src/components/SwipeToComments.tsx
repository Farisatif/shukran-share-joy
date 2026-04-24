import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

/**
 * SwipeToComments — WhatsApp-style sibling navigation between
 * `/` (home) and `/comments` (chat).
 *
 * Behavior:
 *  - Horizontal swipe anywhere navigates between the two routes.
 *    LTR: swipe LEFT → /comments, swipe RIGHT → /. RTL is mirrored.
 *  - Direction lock: vertical scroll always wins until 12px of net horizontal
 *    travel beats vertical travel by 1.5x. Prevents accidental nav while
 *    scrolling the page.
 *  - Edge handle on desktop, thin tab on mobile, both for discoverability.
 *  - Keyboard: ← / → (mirrored in RTL) navigate between siblings.
 *  - Ignores swipes that originate inside form fields, canvases, anything
 *    marked `data-no-swipe`, or inside an element that is itself horizontally
 *    scrollable (carousels etc.).
 */

const ROUTES = ["/", "/comments"] as const;
type RouteIdx = 0 | 1;

export function SwipeToComments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const showComments = data.navigation?.showComments !== false;
  const isRtl = lang === "ar";

  const idx: RouteIdx = location.pathname === "/comments" ? 1 : 0;
  const otherIdx: RouteIdx = idx === 0 ? 1 : 0;
  const otherPath = ROUTES[otherIdx];

  const [progress, setProgress] = useState(0); // -1..1 (signed)
  const [dragging, setDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const active = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);

  // Direction that takes you to the OTHER page.
  // LTR + on /  → swipe LEFT  (negative dx)  → /comments  (sign = -1)
  // LTR + on /comments → swipe RIGHT (positive dx) → /     (sign = +1)
  // RTL is mirrored.
  const desiredSign = (() => {
    if (idx === 0) return isRtl ? +1 : -1;
    return isRtl ? -1 : +1;
  })();

  // Keyboard nav (← / → arrows, mirrored in RTL).
  useEffect(() => {
    if (!showComments) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key !== "ArrowLeft" && key !== "ArrowRight") return;
      const wantsOther =
        idx === 0
          ? (isRtl ? key === "ArrowRight" : key === "ArrowLeft")
          : (isRtl ? key === "ArrowLeft" : key === "ArrowRight");
      if (wantsOther) {
        e.preventDefault();
        navigate({ to: otherPath });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, isRtl, navigate, otherPath, showComments]);

  // Pointer-driven swipe.
  useEffect(() => {
    if (!showComments) return;

    const THRESHOLD = 0.25; // 25% of width commits the navigation
    const FLICK_VEL = 0.7; // px/ms
    const FLICK_MIN = 50; // px

    const isInteractive = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false;
      // Walk up looking for opt-out / form / scrollable-x containers.
      let node: Element | null = el;
      while (node && node !== document.body) {
        if (node.hasAttribute("data-no-swipe")) return true;
        const tag = node.tagName.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          tag === "canvas"
        ) {
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
    };

    const reset = () => {
      active.current = false;
      locked.current = null;
      setDragging(false);
      setProgress(0);
    };

    const onStart = (e: PointerEvent) => {
      // Only primary pointer; ignore right/middle clicks.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();
      active.current = true;
      locked.current = null;
    };

    const onMove = (e: PointerEvent) => {
      if (!active.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (locked.current === null) {
        // Wait for a clear directional intent (12px) and require horizontal
        // travel to dominate vertical by 1.5x. Otherwise yield to scroll.
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          locked.current = "h";
          setDragging(true);
        } else {
          locked.current = "v";
          active.current = false;
          return;
        }
      }

      // Project onto desired direction; ignore wrong-way drags.
      const travel = dx * desiredSign;
      if (travel <= 0) {
        setProgress(0);
        return;
      }
      const w = window.innerWidth;
      const p = Math.min(1, travel / (w * THRESHOLD));
      setProgress(p * desiredSign);
    };

    const finish = (e?: PointerEvent) => {
      if (!active.current && locked.current !== "h") {
        reset();
        return;
      }
      const dx = e ? e.clientX - startX.current : 0;
      const travel = dx * desiredSign;
      const dt = Math.max(1, performance.now() - startT.current);
      const vel = travel / dt;
      const w = window.innerWidth;
      const committed =
        travel >= w * THRESHOLD || (vel >= FLICK_VEL && travel >= FLICK_MIN);

      reset();
      if (committed) navigate({ to: otherPath });
    };

    window.addEventListener("pointerdown", onStart, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", finish, { passive: true });
    window.addEventListener("pointercancel", () => reset(), { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onStart);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
    };
  }, [desiredSign, navigate, otherPath, showComments]);

  if (!showComments) return null;

  // Edge handle is mirrored based on which page we're on.
  const handleOnRight = idx === 0 ? !isRtl : isRtl;
  const edgeClass = handleOnRight ? "right-0" : "left-0";
  const Arrow = handleOnRight ? ChevronLeft : ChevronRight;
  const handleLabel = idx === 0 ? t("Comments", "التعليقات") : t("Portfolio", "البروفايل");
  const handleIcon = idx === 0 ? <MessageSquare className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;

  return (
    <>
      {/* Floating edge handle — discoverable affordance (desktop) */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={() => navigate({ to: otherPath })}
        initial={{ opacity: 0, x: handleOnRight ? 16 : -16 }}
        animate={{ opacity: dragging ? 0 : 1, x: 0 }}
        transition={{ opacity: { duration: 0.4, delay: 0.6 } }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 hidden md:flex items-center gap-2 ${handleOnRight ? "rounded-l-full pl-3 pr-2.5 border-r-0" : "rounded-r-full pr-3 pl-2.5 border-l-0"} bg-card/85 backdrop-blur-xl border border-border py-2.5 soft-shadow text-foreground/85 hover:text-foreground hover:bg-card transition-colors group`}
      >
        {handleOnRight ? (
          <>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              {handleIcon}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">
              {handleLabel}
            </span>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-x-0.5" />
          </>
        ) : (
          <>
            <Arrow className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">
              {handleLabel}
            </span>
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              {handleIcon}
            </span>
          </>
        )}
      </motion.button>

      {/* Mobile-only thin tab on the edge */}
      <motion.button
        type="button"
        aria-label={handleLabel}
        onClick={() => navigate({ to: otherPath })}
        initial={{ opacity: 0 }}
        animate={{ opacity: dragging ? 0 : 0.8 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        data-no-swipe="true"
        className={`fixed top-1/2 -translate-y-1/2 ${edgeClass} z-40 md:hidden h-16 w-1.5 ${handleOnRight ? "rounded-l-full" : "rounded-r-full"} bg-primary/70`}
      />

      {/* Drag progress reveal */}
      <AnimatePresence>
        {dragging && Math.abs(progress) > 0.02 && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] pointer-events-none"
            aria-hidden
          >
            <div
              className={`absolute top-0 bottom-0 ${handleOnRight ? "right-0" : "left-0"} bg-gradient-to-l rtl:bg-gradient-to-r from-primary via-primary/95 to-primary/70 text-primary-foreground flex items-center justify-center`}
              style={{
                width: `${Math.abs(progress) * 100}%`,
                boxShadow:
                  "0 0 80px -10px color-mix(in oklab, var(--primary) 70%, transparent)",
                transition: "width 60ms linear",
              }}
            >
              <motion.div
                animate={{ scale: Math.abs(progress) >= 1 ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="flex flex-col items-center gap-3 select-none"
                style={{ opacity: Math.min(1, Math.abs(progress) * 1.4) }}
              >
                <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/15 backdrop-blur ring-1 ring-primary-foreground/25">
                  {idx === 0 ? <MessageSquare className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </div>
                <span className="font-display text-lg tracking-tight">
                  {Math.abs(progress) >= 1
                    ? t("Release", "أفلت")
                    : t("Keep swiping", "تابع السحب")}
                </span>
                <span className="text-[11px] uppercase tracking-[0.25em] opacity-80">
                  {handleLabel}
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
