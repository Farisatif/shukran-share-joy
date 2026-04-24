import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { useLang } from "./LanguageProvider";

/**
 * PageTransition — WhatsApp-style sibling slide between `/` and `/comments`.
 *
 * Implementation notes:
 *  - Uses `mode="popLayout"` so the outgoing page is layout-frozen and slides
 *    out without pushing the incoming one. We also absolutely position the
 *    exiting page so the two never stack and create double scrollbars.
 *  - The wrapper is `relative` + `overflow-x-clip` so the off-screen slide
 *    never leaks horizontal scroll.
 *  - Scroll is reset to top on every route change (deferred to next frame so
 *    the new page's layout is committed first).
 *  - First paint never animates (avoids a jolt on initial load).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const onComments = location.pathname === "/comments";

  // Sign for slide-in:
  //   on /comments (LTR) → enters from right (+1)
  //   on /         (LTR) → enters from left  (-1)
  const sign = (onComments ? 1 : -1) * (isRtl ? -1 : 1);

  // Reset scroll on route change. Defer one frame so the new page is mounted.
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
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
          initial={{ x: `${sign * 100}%` }}
          animate={{ x: 0 }}
          exit={{ x: `${-sign * 100}%`, position: "absolute", top: 0, left: 0, right: 0 }}
          transition={{
            x: { type: "spring", stiffness: 320, damping: 36, mass: 0.85 },
          }}
          className="w-full will-change-transform"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
