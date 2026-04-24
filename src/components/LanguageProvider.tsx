import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";
const Ctx = createContext<{ lang: Lang; toggle: () => void; setLang: (l: Lang) => void; t: (en: string, ar: string) => string }>({
  lang: "en",
  toggle: () => {},
  setLang: () => {},
  t: (en) => en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang | null)) || null;
    if (saved === "en" || saved === "ar") setLang(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("lang", lang);
      document.cookie = `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  }, [lang]);

  return (
    <Ctx.Provider
      value={{
        lang,
        setLang,
        toggle: () => setLang((l) => (l === "en" ? "ar" : "en")),
        t: (en, ar) => (lang === "ar" ? ar : en),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
