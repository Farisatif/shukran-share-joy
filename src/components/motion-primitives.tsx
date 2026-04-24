import { motion, useInView, useMotionValue, useSpring, useTransform, type MotionProps } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

/**
 * Motion primitives — a small, reusable physics-based animation toolkit.
 * Designed for a corporate-premium feel: subtle weight, spring response,
 * GPU-friendly transforms only.
 */

const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/* ---------- Reveal: fade + rise on scroll ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.85, delay, ease: easeOutExpo }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- StaggerGroup: animate children sequentially ---------- */
export function StaggerGroup({
  children,
  className = "",
  delay = 0.08,
  initialDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  initialDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: delay, delayChildren: initialDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y, filter: "blur(4px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.7, ease: easeOutExpo },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Tilt3D: subtle 3D card tilt that follows the cursor ---------- */
export function Tilt3D({
  children,
  className = "",
  max = 8,
  scale = 1.02,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 22 });
  const sy = useSpring(y, { stiffness: 200, damping: 22 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const glareX = useTransform(sx, [-0.5, 0.5], ["20%", "80%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["20%", "80%"]);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
      whileHover={{ scale }}
      transition={{ scale: { duration: 0.4, ease: easeOutExpo } }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at ${glareX.get?.() || "50%"} ${glareY.get?.() || "50%"}, color-mix(in oklab, white 20%, transparent), transparent 40%)`,
          }}
        />
      )}
    </motion.div>
  );
}

/* ---------- Counter: animated number on scroll ---------- */
export function Counter({
  to,
  duration = 1.6,
  suffix = "",
  prefix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------- ScrollProgress: thin progress bar pinned to top ---------- */
export function ScrollProgress({ className = "" }: { className?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-primary ${className}`}
      style={{ transform: `scaleX(${p})`, transition: "transform 80ms linear" }}
    />
  );
}

/* ---------- SpotlightCard: card with cursor-tracking glow ---------- */
export function SpotlightCard({
  children,
  className = "",
  intensity = 0.18,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
} & Omit<MotionProps, "children">) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      className={`relative overflow-hidden ${className}`}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--spotlight-intensity": intensity,
        } as CSSProperties
      }
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx) var(--my), color-mix(in oklab, var(--primary) calc(var(--spotlight-intensity) * 100%), transparent), transparent 60%)`,
        }}
      />
      {children}
    </motion.div>
  );
}
