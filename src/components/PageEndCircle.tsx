import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * Section-top illuminating disc.
 *
 * A clean circular shape anchored to the top-center of its parent section.
 * As the user scrolls into the section, it descends and grows to sit behind
 * the section heading — acting as a subtle spotlight that lights up the
 * title without any shadows.
 *
 * Mount inside a `relative overflow-hidden` parent.
 */
export function PageEndCircle() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Descend from above the section, grow to a comfortable size behind the title.
  const y = useTransform(scrollYProgress, [0, 0.5, 1], ["-40%", "0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.6, 1, 1.05]);
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.85, 1], [0, 1, 1, 0.9]);

  // Disc fill is the OPPOSITE of the heading color:
  // - light theme heading is dark → disc is dark (oklch(0.085))
  // - dark theme heading is light → disc is white
  const discClass =
    "rounded-full will-change-transform bg-[oklch(0.085_0.025_268)] dark:bg-white " +
    "h-[60vw] w-[60vw] max-h-[420px] max-w-[420px] sm:h-[40vw] sm:w-[40vw]";

  if (reduced) {
    return (
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center"
      >
        <div className={discClass} />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center"
    >
      <motion.div
        style={{ y, scale, opacity, transformOrigin: "50% 50%" }}
        className={discClass}
      />
    </div>
  );
}
