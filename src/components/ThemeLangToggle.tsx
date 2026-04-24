import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { useLang } from "./LanguageProvider";

/**
 * Compact, stylish theme + language toggles.
 * - Theme: animated pill that slides between sun/moon, preserving the blue accent
 * - Language: tiny segmented EN / ع control with a sliding indicator
 */
export function ThemeLangToggle() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Language segmented control */}
      <button
        type="button"
        onClick={toggleLang}
        aria-label="Toggle language"
        className="relative inline-flex items-center h-6 rounded-full border border-border bg-background/70 backdrop-blur px-0.5 text-[9px] font-display tracking-wider overflow-hidden"
      >
        <motion.span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 w-6 rounded-full bg-[var(--primary)]"
          initial={false}
          animate={{ x: isAr ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
        <span
          className={`relative z-10 inline-flex items-center justify-center w-6 h-5 transition-colors ${
            !isAr ? "text-[var(--primary-foreground)]" : "text-foreground/70"
          }`}
        >
          EN
        </span>
        <span
          className={`relative z-10 inline-flex items-center justify-center w-6 h-5 transition-colors ${
            isAr ? "text-[var(--primary-foreground)]" : "text-foreground/70"
          }`}
        >
          ع
        </span>
      </button>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }}
        aria-label="Toggle theme"
        className="relative inline-flex items-center justify-center h-6 w-6 rounded-full border border-border bg-background/70 backdrop-blur hover:border-[var(--primary)] transition-colors overflow-hidden group"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 70%)", filter: "blur(6px)" }}
        />
        <AnimatePresence mode="wait" initial={false}>
          {theme === "light" ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-[var(--primary)]"
            >
              <Moon className="h-3 w-3" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center text-[var(--primary)]"
            >
              <Sun className="h-3 w-3" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}