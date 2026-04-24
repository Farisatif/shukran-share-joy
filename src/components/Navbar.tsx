import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeLangToggle } from "./ThemeLangToggle";
import { useLang } from "./LanguageProvider";
import { useSiteData } from "./SiteDataProvider";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const { t, lang } = useLang();
  const { data } = useSiteData();
  const nav = data.navigation;
  const showComments = nav?.showComments !== false;
  const contactLabel = lang === "ar"
    ? nav?.contactLabelAr || "تواصل"
    : nav?.contactLabelEn || "Contact";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onComments = loc.pathname === "/comments";

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3 transition-opacity duration-300 [body.cms-open_&]:opacity-0 [body.cms-open_&]:pointer-events-none"
    >
      <nav
        className={`flex items-center gap-1 rounded-full px-1.5 py-1.5 transition-all ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl soft-shadow border border-border/60"
            : "bg-background/60 backdrop-blur-md border border-border/40"
        }`}
      >
        <Link to="/" className="px-3 py-1.5 font-display text-sm sm:text-base shrink-0">
          Fares.
        </Link>
        {showComments && (
          <>
            <span className="w-px h-5 bg-border mx-0.5" />
            <Link
              to="/comments"
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
                onComments
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t("Comments", "التعليقات")}
            </Link>
          </>
        )}
        <span className="w-px h-5 bg-border mx-0.5" />
        <ThemeLangToggle />
        <Link
          to="/"
          hash="contact"
          className="ml-1 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
        >
          {contactLabel}
        </Link>
      </nav>
    </motion.header>
  );
}
