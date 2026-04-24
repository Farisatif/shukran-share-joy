import type { ReactNode } from "react";

/**
 * Kitsys-inspired chevron pattern background.
 * Wraps a section with a tiled SVG of small chevrons that follow a slight rotation.
 */
export function ChevronPattern({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%231D4ED8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='14,22 22,30 14,38' transform='rotate(15 18 30)'/><polyline points='38,22 46,30 38,38' transform='rotate(-25 42 30)'/></g></svg>\")",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Kitsys-inspired dotted grid pattern background.
 */
export function DotPattern({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.25]"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(0.55 0.22 255) 1.2px, transparent 1.4px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}