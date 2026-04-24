import { useEffect, useRef } from "react";

/**
 * GlowDots — لوحة نقاط تتوهج حول مؤشر/إصبع المستخدم.
 *
 * يدعم ثلاثة أوضاع:
 *  - panel (افتراضي قديم): لوحة زرقاء قائمة بذاتها بارتفاع محدد.
 *  - section background (asBackground=true): طبقة شفافة داخل قسم.
 *  - global fixed (mode="fixed"): خلفية ثابتة تغطي كل النافذة دائماً —
 *    تستخدم نسخة واحدة فقط على مستوى التطبيق.
 */

const CONFIG = {
  spacing: 34,
  baseRadius: 2,
  maxRadius: 7,
  influence: 130,
  glowBlur: 22,
  ease: 0.12,
  bg: "#1d4ed8",
  dot: "#ffffff",
  glow: "#bfdbfe",
};

interface Dot {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

interface Props {
  className?: string;
  height?: number | string;
  /** true = خلفية شفافة تسمح بالسكرول، false = لوحة زرقاء قائمة بذاتها. */
  asBackground?: boolean;
  /** "fixed" = خلفية ثابتة تغطي النافذة (تتجاوز height/asBackground). */
  mode?: "absolute" | "fixed";
  /** لون النقاط. */
  dotColor?: string;
  /** لون التوهج. */
  glowColor?: string;
  /** كثافة النقاط (المسافة بينها). */
  spacing?: number;
  /** شفافية أساسية (0..1) — مفيدة لخفض الكثافة في الوضع العام. */
  baseAlpha?: number;
}

export function GlowDots({
  className = "",
  height = 520,
  asBackground = false,
  mode = "absolute",
  dotColor,
  glowColor,
  spacing,
  baseAlpha,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isFixed = mode === "fixed";
  // Fixed mode is implicitly a background overlay.
  const effectiveAsBackground = isFixed ? true : asBackground;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = {
      ...CONFIG,
      spacing: spacing ?? CONFIG.spacing,
      dot: dotColor ?? CONFIG.dot,
      glow: glowColor ?? CONFIG.glow,
    };

    // Resolve "currentColor" against the wrapper's computed color so the
    // canvas (which can't parse CSS keywords) inherits the theme color.
    const resolveColor = (c: string) => {
      if (c.toLowerCase() !== "currentcolor") return c;
      return getComputedStyle(wrap).color || "#ffffff";
    };

    // For fixed/global mode, derive sensible theme-aware defaults so the
    // dots blend with both light and dark backgrounds without needing the
    // caller to pass colors.
    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const themeDefaults = () => {
      if (isFixed) {
        const dark = isDark();
        return {
          dot: dotColor ?? (dark ? "rgba(255,255,255,0.85)" : "rgba(29,78,216,0.7)"),
          glow: glowColor ?? (dark ? "rgba(191,219,254,0.9)" : "rgba(59,130,246,0.7)"),
        };
      }
      return { dot: resolveColor(cfg.dot), glow: resolveColor(cfg.glow) };
    };

    let resolved = themeDefaults();
    cfg.dot = resolved.dot;
    cfg.glow = resolved.glow;

    // Re-resolve colors when the theme class on <html> changes.
    const themeObserver = new MutationObserver(() => {
      resolved = themeDefaults();
      cfg.dot = resolved.dot;
      cfg.glow = resolved.glow;
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let dots: Dot[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let h = 0;

    const buildDots = () => {
      dots = [];
      // True inner padding so dots breathe away from rounded corners.
      // In fixed mode we don't want any inset — dots tile the whole viewport.
      const inset = isFixed ? 0 : Math.max(18, cfg.spacing * 0.6);
      const innerW = Math.max(0, width - inset * 2);
      const innerH = Math.max(0, h - inset * 2);
      const cols = Math.max(1, Math.floor(innerW / cfg.spacing) + 1);
      const rows = Math.max(1, Math.floor(innerH / cfg.spacing) + 1);
      const stepX = cols > 1 ? innerW / (cols - 1) : 0;
      const stepY = rows > 1 ? innerH / (rows - 1) : 0;
      const startAlpha = baseAlpha ?? (isFixed ? 0.22 : effectiveAsBackground ? 0.55 : 0.5);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: inset + i * stepX,
            y: inset + j * stepY,
            r: cfg.baseRadius,
            alpha: startAlpha,
          });
        }
      }
    };

    const resize = () => {
      if (isFixed) {
        width = window.innerWidth;
        h = window.innerHeight;
      } else {
        const rect = wrap.getBoundingClientRect();
        width = rect.width;
        h = rect.height;
      }
      canvas.width = width * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    };

    resize();
    let ro: ResizeObserver | null = null;
    let onResizeWin: (() => void) | null = null;
    if (isFixed) {
      onResizeWin = () => resize();
      window.addEventListener("resize", onResizeWin, { passive: true });
    } else {
      ro = new ResizeObserver(resize);
      ro.observe(wrap);
    }

    const setPointer = (clientX: number, clientY: number) => {
      if (isFixed) {
        // Pointer is in viewport coords; canvas covers viewport.
        pointer.x = clientX;
        pointer.y = clientY;
        pointer.active = true;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (effectiveAsBackground && (x < 0 || y < 0 || x > width || y > h)) {
        pointer.active = false;
        return;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };

    const onMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const target: Window | HTMLCanvasElement = effectiveAsBackground ? window : canvas;
    target.addEventListener("pointermove", onMove as EventListener, { passive: true } as AddEventListenerOptions);
    if (!effectiveAsBackground) {
      canvas.addEventListener("pointerdown", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointercancel", onLeave);
    }

    let raf = 0;
    const baseAlphaRender = baseAlpha ?? (isFixed ? 0.22 : 0.55);
    const render = () => {
      ctx.clearRect(0, 0, width, h);
      for (const d of dots) {
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        const t = pointer.active ? Math.max(0, 1 - dist / cfg.influence) : 0;
        const eased = t * t * (3 - 2 * t);

        const targetR = cfg.baseRadius + (cfg.maxRadius - cfg.baseRadius) * eased;
        const targetA = baseAlphaRender + (1 - baseAlphaRender) * eased;

        d.r += (targetR - d.r) * cfg.ease;
        d.alpha += (targetA - d.alpha) * cfg.ease;

        ctx.beginPath();
        ctx.fillStyle = cfg.dot;
        ctx.globalAlpha = d.alpha;
        if (eased > 0.05) {
          ctx.shadowColor = cfg.glow;
          ctx.shadowBlur = cfg.glowBlur * eased;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (onResizeWin) window.removeEventListener("resize", onResizeWin);
      themeObserver.disconnect();
      target.removeEventListener("pointermove", onMove as EventListener);
      if (!effectiveAsBackground) {
        canvas.removeEventListener("pointerdown", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("pointercancel", onLeave);
      }
    };
  }, [effectiveAsBackground, isFixed, dotColor, glowColor, spacing, baseAlpha]);

  if (isFixed) {
    return (
      <div
        ref={wrapRef}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 ${className}`}
        style={{
          // Soft radial mask so dots fade near edges and never feel like a flat grid.
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${effectiveAsBackground ? "" : "overflow-hidden rounded-3xl"} ${className}`}
      style={{
        height,
        background: effectiveAsBackground ? "transparent" : CONFIG.bg,
        touchAction: effectiveAsBackground ? "auto" : "none",
        pointerEvents: effectiveAsBackground ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
