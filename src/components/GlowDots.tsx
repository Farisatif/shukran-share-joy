import { useEffect, useRef } from "react";

/**
 * GlowDots — لوحة نقاط تتوهج حول مؤشر/إصبع المستخدم.
 *
 * يدعم وضعين:
 *  - عادي: حاوية مستقلة بخلفية زرقاء (background prop = true).
 *  - خلفية: تعمل كطبقة شفافة فوق المحتوى مع pointerEvents=none للسماح
 *    بالسكرول والتفاعل مع العناصر تحتها، بينما نتتبع المؤشر عبر window.
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
  /** لون النقاط (افتراضي أبيض). */
  dotColor?: string;
  /** لون التوهج. */
  glowColor?: string;
  /** كثافة النقاط (المسافة بينها). */
  spacing?: number;
}

export function GlowDots({
  className = "",
  height = 520,
  asBackground = false,
  dotColor,
  glowColor,
  spacing,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    cfg.dot = resolveColor(cfg.dot);
    cfg.glow = resolveColor(cfg.glow);

    // Re-resolve colors when the theme class on <html> changes.
    const themeObserver = new MutationObserver(() => {
      cfg.dot = resolveColor(dotColor ?? CONFIG.dot);
      cfg.glow = resolveColor(glowColor ?? CONFIG.glow);
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
      const inset = Math.max(18, cfg.spacing * 0.6);
      const innerW = Math.max(0, width - inset * 2);
      const innerH = Math.max(0, h - inset * 2);
      const cols = Math.max(1, Math.floor(innerW / cfg.spacing) + 1);
      const rows = Math.max(1, Math.floor(innerH / cfg.spacing) + 1);
      const stepX = cols > 1 ? innerW / (cols - 1) : 0;
      const stepY = rows > 1 ? innerH / (rows - 1) : 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: inset + i * stepX,
            y: inset + j * stepY,
            r: cfg.baseRadius,
            alpha: asBackground ? 0.55 : 0.5,
          });
        }
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      h = rect.height;
      canvas.width = width * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const setPointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      // في وضع الخلفية نتتبع فقط إذا كان داخل الحاوية
      if (asBackground && (x < 0 || y < 0 || x > width || y > h)) {
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

    // في وضع الخلفية: نستمع على window لأن الكانفس pointer-events:none
    const target: Window | HTMLCanvasElement = asBackground ? window : canvas;
    target.addEventListener("pointermove", onMove as EventListener, { passive: true } as AddEventListenerOptions);
    if (!asBackground) {
      canvas.addEventListener("pointerdown", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointercancel", onLeave);
    } else {
      window.addEventListener("scroll", onLeave, { passive: true });
    }

    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, h);

      for (const d of dots) {
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const dist = Math.hypot(dx, dy);

        const t = pointer.active ? Math.max(0, 1 - dist / cfg.influence) : 0;
        const eased = t * t * (3 - 2 * t);

        const targetR = cfg.baseRadius + (cfg.maxRadius - cfg.baseRadius) * eased;
        const baseAlpha = asBackground ? 0.55 : 0.55;
        const targetA = baseAlpha + (1 - baseAlpha) * eased;

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
      ro.disconnect();
      themeObserver.disconnect();
      target.removeEventListener("pointermove", onMove as EventListener);
      if (!asBackground) {
        canvas.removeEventListener("pointerdown", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("pointercancel", onLeave);
      } else {
        window.removeEventListener("scroll", onLeave);
      }
    };
  }, [asBackground, dotColor, glowColor, spacing]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${asBackground ? "" : "overflow-hidden rounded-3xl"} ${className}`}
      style={{
        height,
        background: asBackground ? "transparent" : CONFIG.bg,
        touchAction: asBackground ? "auto" : "none",
        pointerEvents: asBackground ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
