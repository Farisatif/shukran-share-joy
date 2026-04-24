import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useLang } from "./LanguageProvider";

/**
 * PageTransition — slides between sibling routes (`/` ↔ `/comments`)
 * like a phone messenger app: incoming page enters from one side while
 * the outgoing page exits to the opposite side.
 *
 * Direction:
 *  - LTR + going to /comments  → incoming slides in from RIGHT
 *  - LTR + going to /          → incoming slides in from LEFT
 *  - RTL is mirrored.
 *
 * The first paint never animates (avoids a jolt on initial load).
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

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ x: `${sign * 100}%`, opacity: 0.4 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: `${-sign * 100}%`, opacity: 0.4 }}
        transition={{
          x: { type: "spring", stiffness: 280, damping: 32, mass: 0.9 },
          opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        }}
        className="will-change-transform"
        style={{
          // Prevents horizontal scrollbars during the slide.
          width: "100%",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
