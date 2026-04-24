import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Ctx = {
  theme: Theme;
  toggle: (origin?: { x: number; y: number }) => void;
};

const ThemeCtx = createContext<Ctx>({ theme: "light", toggle: () => {} });

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => ViewTransition;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const mounted = useRef(false);

  // Initial theme — runs once.
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial: Theme =
      saved ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    mounted.current = true;
  }, []);

  // Apply theme on change (skip first run; initial already applied above).
  useEffect(() => {
    if (!mounted.current) return;
    const root = document.documentElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const supportsVT = typeof document.startViewTransition === "function";

    const apply = () => {
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
    };

    // Reduced motion or no support → fall back to the CSS class transition.
    if (reduce || !supportsVT) {
      root.classList.add("theme-anim");
      apply();
      const t = setTimeout(() => root.classList.remove("theme-anim"), 700);
      return () => clearTimeout(t);
    }

    // Cinematic circular reveal centered on the click origin.
    const origin = originRef.current ?? {
      x: window.innerWidth - 48,
      y: 48,
    };
    originRef.current = null;

    // Mark the transition direction for asymmetric easing.
    root.dataset.themeTo = theme;

    const doc = document as DocWithVT;
    const transition = doc.startViewTransition!(() => {
      apply();
    });

    transition.ready
      .then(() => {
        const endRadius = Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y),
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 620,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        /* transition skipped (e.g. rapid toggles) — silently ignore */
      });

    transition.finished
      .catch(() => {
        /* see above */
      })
      .finally(() => {
        delete root.dataset.themeTo;
      });
  }, [theme]);

  const toggle = (origin?: { x: number; y: number }) => {
    if (origin) originRef.current = origin;
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
