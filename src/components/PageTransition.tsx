import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLang } from "./LanguageProvider";

/**
 * PageTransition — WhatsApp-style sibling slide between `/` and `/comments`.
 *
 * Coordination with SwipeToComments:
 *  - When the user releases a swipe past the commit threshold, SwipeToComments
 *    finishes the slide visually then navigates. To avoid a double animation
 *    we read a `swipe-skip-incoming` flag from sessionStorage on the first
 *    paint of the new route and skip our own enter animation in that case.
 *  - Otherwise (link click, programmatic nav) we play the full slide.
 *
 * The current page exposes a `data-page-wrapper` attribute so SwipeToComments
 * can apply live finger-tracking transforms via CSS variable.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const onComments = location.pathname === "/comments";

  // Sign for slide-in: on /comments (LTR) → from RIGHT; on / (LTR) → from LEFT.
  const sign = (onComments ? 1 : -1) * (isRtl ? -1 : 1);

  // Detect whether the navigation came from a swipe commit (skip enter anim).
  const [skipEnter, setSkipEnter] = useState(false);
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    let skip = false;
    try {
      skip = sessionStorage.getItem("swipe-skip-incoming") === "1";
      if (skip) sessionStorage.removeItem("swipe-skip-incoming");
    } catch {
      /* no-op */
    }
    setSkipEnter(skip);
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div className="relative w-full overflow-x-clip">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={location.pathname}
          data-page-wrapper
          initial={skipEnter ? false : { x: `${sign * 100}%` }}
          animate={{ x: 0 }}
          exit={{ x: `${-sign * 100}%`, position: "absolute", top: 0, left: 0, right: 0 }}
          transition={{
            x: { type: "spring", stiffness: 380, damping: 38, mass: 0.9 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
