import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * ProjectsBackdrop
 * --------------------------------------------------------------------------
 * A subtle, professional physics-style backdrop:
 *  - Drifting particles with mutual repulsion + light gravity toward center
 *  - Connecting hairlines between near neighbours (constellation effect)
 *  - Mouse parallax pull (acts like a soft attractor)
 *  - Layered radial brand glows + faint grid for identity continuity
 *
 * Honors prefers-reduced-motion (renders a static, calm version).
 */
export function ProjectsBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  const config = useMemo(
    () => ({
      density: 0.000055, // particles per px²
      maxParticles: 90,
      minParticles: 28,
      linkDistance: 130,
      speed: 0.18,
      repulse: 90,
      mouseRadius: 160,
      mouseStrength: 0.35,
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let particles: P[] = [];

    const seed = () => {
      const target = Math.max(
        config.minParticles,
        Math.min(
          config.maxParticles,
          Math.round(width * height * config.density),
        ),
      );
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        r: 0.7 + Math.random() * 1.4,
      }));
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    // Read foreground color from CSS so visuals follow theme (light/dark)
    const styleProbe = getComputedStyle(document.documentElement);
    const fg = styleProbe.getPropertyValue("--foreground").trim() || "0 0% 10%";
    const dotColor = `hsl(${fg} / 0.55)`;
    const lineBase = `hsl(${fg}`;

    const step = () => {
      ctx.clearRect(0, 0, width, height);

      // physics
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // soft mouse attraction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          const r2 = config.mouseRadius * config.mouseRadius;
          if (d2 < r2 && d2 > 1) {
            const f = (1 - d2 / r2) * config.mouseStrength;
            const d = Math.sqrt(d2);
            p.vx += (dx / d) * f * 0.06;
            p.vy += (dy / d) * f * 0.06;
          }
        }

        // pairwise repulsion (neighbours only, O(n²) but small n)
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          const rr = config.repulse * config.repulse;
          if (d2 < rr && d2 > 0.5) {
            const d = Math.sqrt(d2);
            const f = ((rr - d2) / rr) * 0.0008;
            const ux = dx / d;
            const uy = dy / d;
            p.vx -= ux * f;
            p.vy -= uy * f;
            q.vx += ux * f;
            q.vy += uy * f;
          }

          // constellation lines
          if (d2 < config.linkDistance * config.linkDistance) {
            const a = (1 - Math.sqrt(d2) / config.linkDistance) * 0.18;
            ctx.strokeStyle = `${lineBase} / ${a.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // damping + integration
        p.vx *= 0.985;
        p.vy *= 0.985;
        // clamp velocity
        const sp = Math.hypot(p.vx, p.vy);
        const maxSp = config.speed * 3.5;
        if (sp > maxSp) {
          p.vx = (p.vx / sp) * maxSp;
          p.vy = (p.vy / sp) * maxSp;
        }
        p.x += p.vx;
        p.y += p.vy;

        // wrap edges softly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // dot
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    if (!reduce) {
      raf = requestAnimationFrame(step);
    } else {
      // single static frame
      step();
      cancelAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [config, reduce]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Brand radial glows — keep site identity */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 10%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(50% 40% at 10% 90%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />

      {/* Faint grid for depth */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] text-foreground"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(80% 60% at 50% 40%, black 30%, transparent 85%)",
        }}
      />

      {/* Physics canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Vignette to blend with neighbouring sections */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 12%, transparent 88%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Top + bottom hairlines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
