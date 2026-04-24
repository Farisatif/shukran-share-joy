import { useEffect, useRef } from "react";

/**
 * Kitsys-style chevron field that points toward the mouse cursor.
 * Pure canvas, DPR-aware, only animates while in viewport.
 * Falls back to a static pattern under prefers-reduced-motion.
 *
 * mode="absolute" (default) — fills the parent element (parent must be
 *   `relative`). Tracks the pointer relative to the parent.
 * mode="fixed" — covers the whole viewport as a global background. Tracks
 *   the pointer at the window level. Use exactly one instance globally.
 */
export function KitsysArrowField({
  className = "",
  mode = "absolute",
}: {
  className?: string;
  mode?: "absolute" | "fixed";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const visibleRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let width = 0;
    let height = 0;
    let points: { x: number; y: number; angle: number }[] = [];
    const SPACING = 30;
    const DEFAULT_ANGLE = 0;
    const FALLOFF = 520; // distance after which arrows ease back to default

    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const buildGrid = () => {
      if (mode === "fixed") {
        width = Math.max(1, Math.floor(window.innerWidth));
        height = Math.max(1, Math.floor(window.innerHeight));
      } else {
        const rect = wrap.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
      }
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      points = [];
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Slight stagger every other row for organic rhythm.
          const xJit = (r % 2 === 0 ? 0 : SPACING / 2);
          points.push({
            x: c * SPACING + xJit,
            y: r * SPACING,
            angle: DEFAULT_ANGLE,
          });
        }
      }
    };

    const drawChevron = (x: number, y: number, angle: number, alpha: number, dark: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = dark
        ? `rgba(255,255,255,${alpha})`
        : `rgba(29,78,216,${alpha})`;
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const s = 5; // chevron half-size
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(-s, s);
      ctx.stroke();
      ctx.restore();
    };

    const renderStatic = () => {
      const dark = isDark();
      ctx.clearRect(0, 0, width, height);
      for (const p of points) {
        drawChevron(p.x, p.y, DEFAULT_ANGLE, dark ? 0.14 : 0.18, dark);
      }
    };

    const renderFrame = () => {
      rafRef.current = null;
      if (!visibleRef.current) return;
      const dark = isDark();
      ctx.clearRect(0, 0, width, height);
      const m = mouseRef.current;
      const baseAlphaDark = 0.14;
      const baseAlphaLight = 0.18;
      for (const p of points) {
        let target = DEFAULT_ANGLE;
        let intensity = 0;
        if (m.active) {
          const dx = m.x - p.x;
          const dy = m.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - dist / FALLOFF);
          intensity = t;
          if (t > 0) {
            target = Math.atan2(dy, dx);
          }
        }
        // Lerp angle toward target — handle wrap-around.
        let diff = target - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.angle += diff * 0.18;
        const alpha =
          (dark ? baseAlphaDark : baseAlphaLight) + intensity * (dark ? 0.28 : 0.26);
        drawChevron(p.x, p.y, p.angle, alpha, dark);
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    };

    const scheduleFrame = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(renderFrame);
    };

    buildGrid();
    if (reduced) {
      renderStatic();
    } else {
      renderStatic();
    }

    const onMove = (e: PointerEvent) => {
      if (mode === "fixed") {
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      } else {
        const rect = wrap.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
      }
      mouseRef.current.active = true;
      if (!reduced) scheduleFrame();
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      if (!reduced) scheduleFrame();
    };

    const target: HTMLElement | Window = mode === "fixed" ? window : wrap;
    target.addEventListener("pointermove", onMove as EventListener, { passive: true } as AddEventListenerOptions);
    target.addEventListener("pointerleave", onLeave as EventListener);

    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let onResizeWin: (() => void) | null = null;
    if (mode === "fixed") {
      visibleRef.current = true;
      onResizeWin = () => {
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        buildGrid();
        if (reduced) {
          renderStatic();
        } else {
          scheduleFrame();
        }
      };
      window.addEventListener("resize", onResizeWin, { passive: true });
    } else {
      ro = new ResizeObserver(() => {
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        buildGrid();
        if (reduced || !visibleRef.current) {
          renderStatic();
        } else {
          scheduleFrame();
        }
      });
      ro.observe(wrap);

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting && !reduced) {
              scheduleFrame();
            }
          }
        },
        { rootMargin: "100px" },
      );
      io.observe(wrap);
    }

    const themeObserver = new MutationObserver(() => {
      if (reduced || !visibleRef.current) {
        renderStatic();
      } else {
        scheduleFrame();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      target.removeEventListener("pointermove", onMove as EventListener);
      target.removeEventListener("pointerleave", onLeave as EventListener);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (onResizeWin) window.removeEventListener("resize", onResizeWin);
      themeObserver.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [mode]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={`${
        mode === "fixed" ? "pointer-events-none fixed" : "pointer-events-auto absolute"
      } inset-0 overflow-hidden ${className}`}
      style={{
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 45%, transparent 92%)",
        maskImage:
          "radial-gradient(ellipse at center, black 45%, transparent 92%)",
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}